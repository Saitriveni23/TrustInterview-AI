require("dotenv").config();
const { Worker } = require("bullmq");
const db = require("./config/database");
const { redis, connectRedis } = require("./config/redis");
const { decryptText } = require("./services/encryption");
const { generateQuestions, generateAdvice } = require("./services/question-generator");
const { QUESTION_QUEUE } = require("./services/queue");

async function loadSessionTarget(sessionId) {
  const result = await db.query(
    `SELECT ms.*,
      COALESCE(rp.title,cr.title) AS title,
      COALESCE(rp.description,cr.description) AS description,
      COALESCE(rp.required_skills,cr.required_skills) AS required_skills,
      COALESCE(rp.preferred_skills,cr.preferred_skills) AS preferred_skills,
      ar.overall_score,ar.breakdown,ar.matched_criteria,ar.missing_criteria,ar.evidence
     FROM mock_sessions ms
     LEFT JOIN role_profiles rp ON rp.id=ms.role_profile_id
     LEFT JOIN company_roles cr ON cr.id=ms.company_role_id
     JOIN ats_reports ar ON ar.mock_session_id=ms.id WHERE ms.id=$1`, [sessionId]
  );
  return result.rows[0];
}

async function processJob(job) {
  const { sessionId } = job.data;
  await db.query(`UPDATE mock_sessions SET question_status='processing' WHERE id=$1`, [sessionId]);
  const session = await loadSessionTarget(sessionId);
  if (!session) throw new Error("Mock session not found");
  const encrypted = await redis.get(`resume:${sessionId}`);
  if (!encrypted) throw new Error("Temporary resume text expired or is unavailable");
  const resumeText = decryptText(encrypted);
  const target = { title: session.title, description: session.description, requiredSkills: session.required_skills, preferredSkills: session.preferred_skills };
  const report = { overallScore: Number(session.overall_score), breakdown: session.breakdown, matchedCriteria: session.matched_criteria, missingCriteria: session.missing_criteria, evidence: session.evidence };
  const [generated, advice] = await Promise.all([generateQuestions(resumeText, target, report), generateAdvice(resumeText, target, report)]);
  await db.transaction(async (client) => {
    await client.query(
      `INSERT INTO question_sets(mock_session_id,questions,generator,model_metadata) VALUES($1,$2::jsonb,$3,$4::jsonb)
       ON CONFLICT(mock_session_id) DO UPDATE SET questions=EXCLUDED.questions,generator=EXCLUDED.generator,model_metadata=EXCLUDED.model_metadata,created_at=NOW()`,
      [sessionId, JSON.stringify(generated.questions), generated.generator, JSON.stringify(generated.metadata)]
    );
    await client.query(`UPDATE ats_reports SET advice=$1::jsonb,advice_unavailable=$2 WHERE mock_session_id=$3`, [JSON.stringify(advice.advice), advice.unavailable, sessionId]);
    await client.query(`UPDATE mock_sessions SET status='ready',question_status='ready',processing_error=NULL WHERE id=$1`, [sessionId]);
  });
  return { sessionId, questionCount: generated.questions.length };
}

async function main() {
  await connectRedis();
  const worker = new Worker(QUESTION_QUEUE, processJob, { connection: redis, concurrency: Number(process.env.WORKER_CONCURRENCY || 4) });
  worker.on("completed", (job) => console.log(JSON.stringify({ level: "info", event: "question_job_completed", jobId: job.id })));
  worker.on("failed", async (job, error) => {
    console.error(JSON.stringify({ level: "error", event: "question_job_failed", jobId: job?.id, message: error.message }));
    if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
      await db.query(`UPDATE mock_sessions SET status='failed',question_status='failed',processing_error=$1 WHERE id=$2`, ["Question generation failed after retries.", job.data.sessionId]);
    }
  });
  const shutdown = async () => { await worker.close(); await redis.quit(); await db.pool.end(); process.exit(0); };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((error) => { console.error(error); process.exit(1); });
