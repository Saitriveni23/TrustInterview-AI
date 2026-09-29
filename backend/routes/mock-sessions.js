const express = require("express");
const db = require("../config/database");
const { redis } = require("../config/redis");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireRole("candidate"));

async function ownedSession(id, uid) {
  const result = await db.query(`SELECT * FROM mock_sessions WHERE id=$1 AND candidate_uid=$2`, [id, uid]);
  return result.rows[0];
}

router.get("/:id/status", async (req, res, next) => {
  try {
    const session = await ownedSession(req.params.id, req.auth.uid);
    if (!session) return res.status(404).json({ error: { code: "SESSION_NOT_FOUND", message: "Mock session not found.", requestId: req.id } });
    res.json({ status: session.status, questionStatus: session.question_status, error: session.processing_error, expiresAt: session.expires_at });
  } catch (error) { next(error); }
});

router.get("/:id/ats-report", async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT ar.scoring_version, ar.overall_score, ar.breakdown, ar.matched_criteria, ar.missing_criteria,
        ar.evidence, ar.advice, ar.advice_unavailable, ar.created_at
       FROM ats_reports ar JOIN mock_sessions ms ON ms.id=ar.mock_session_id
       WHERE ar.mock_session_id=$1 AND ms.candidate_uid=$2`, [req.params.id, req.auth.uid]
    );
    if (!result.rows[0]) return res.status(404).json({ error: { code: "REPORT_NOT_FOUND", message: "ATS report not found.", requestId: req.id } });
    res.json({ atsReport: result.rows[0] });
  } catch (error) { next(error); }
});

router.get("/:id/questions", async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT qs.questions, qs.generator, qs.model_metadata, qs.created_at
       FROM question_sets qs JOIN mock_sessions ms ON ms.id=qs.mock_session_id
       WHERE qs.mock_session_id=$1 AND ms.candidate_uid=$2`, [req.params.id, req.auth.uid]
    );
    if (!result.rows[0]) return res.status(202).json({ ready: false });
    await db.query(`UPDATE mock_sessions SET status='in_progress' WHERE id=$1 AND status='ready'`, [req.params.id]);
    res.json({ ready: true, ...result.rows[0] });
  } catch (error) { next(error); }
});

router.post("/:id/complete", async (req, res, next) => {
  try {
    const session = await ownedSession(req.params.id, req.auth.uid);
    if (!session) return res.status(404).json({ error: { code: "SESSION_NOT_FOUND", message: "Mock session not found.", requestId: req.id } });
    const score = req.body.interviewScore == null ? null : Number(req.body.interviewScore);
    if (score != null && (!Number.isFinite(score) || score < 0 || score > 100)) {
      return res.status(400).json({ error: { code: "INVALID_SCORE", message: "interviewScore must be between 0 and 100.", requestId: req.id } });
    }
    await db.transaction(async (client) => {
      await client.query(
        `INSERT INTO interview_results(mock_session_id,interview_score,result) VALUES($1,$2,$3::jsonb)
         ON CONFLICT(mock_session_id) DO UPDATE SET interview_score=EXCLUDED.interview_score,result=EXCLUDED.result,completed_at=NOW()`,
        [session.id, score, JSON.stringify(req.body.result || {})]
      );
      await client.query(`UPDATE mock_sessions SET status='completed',completed_at=NOW() WHERE id=$1`, [session.id]);
    });
    await redis.del(`resume:${session.id}`);
    res.json({ success: true });
  } catch (error) { next(error); }
});

module.exports = router;
