const express = require("express");
const multer = require("multer");
const db = require("../config/database");
const { redis } = require("../config/redis");
const { requireAuth, requireRole } = require("../middleware/auth");
const { extractResumeText } = require("../services/resume-extractor");
const { calculateAtsScore } = require("../services/ats");
const { encryptText } = require("../services/encryption");
const { questionQueue } = require("../services/queue");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 10 },
  fileFilter: (_req, file, callback) => callback(null, file.mimetype === "application/pdf"),
});

async function loadTarget(targetType, targetId) {
  if (targetType === "role") {
    const result = await db.query(`SELECT *, 'role' AS target_type FROM role_profiles WHERE id=$1 AND active=TRUE`, [targetId]);
    return result.rows[0];
  }
  if (targetType === "company_role") {
    const result = await db.query(`SELECT cr.*, c.name AS company_name, 'company_role' AS target_type
      FROM company_roles cr JOIN companies c ON c.id=cr.company_id WHERE cr.id=$1 AND cr.active=TRUE`, [targetId]);
    return result.rows[0];
  }
  return null;
}

router.post("/", requireAuth, requireRole("candidate"), upload.single("resume"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: { code: "RESUME_REQUIRED", message: "A PDF resume is required.", requestId: req.id } });
    const targetType = req.body.targetType;
    const targetId = req.body.targetId;
    const target = await loadTarget(targetType, targetId);
    if (!target) return res.status(404).json({ error: { code: "TARGET_NOT_FOUND", message: "The selected ATS target is unavailable.", requestId: req.id } });

    const resumeText = await extractResumeText(req.file.buffer);
    const report = calculateAtsScore(resumeText, target);
    const session = await db.transaction(async (client) => {
      const sessionResult = await client.query(
        `INSERT INTO mock_sessions(candidate_uid,target_type,role_profile_id,company_role_id,expires_at)
         VALUES($1,$2,$3,$4,NOW()+INTERVAL '24 hours') RETURNING id,status,question_status,expires_at,created_at`,
        [req.auth.uid, targetType, targetType === "role" ? targetId : null, targetType === "company_role" ? targetId : null]
      );
      const row = sessionResult.rows[0];
      await client.query(
        `INSERT INTO ats_reports(mock_session_id,scoring_version,overall_score,breakdown,matched_criteria,missing_criteria,evidence)
         VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb)`,
        [row.id, report.scoringVersion, report.overallScore, JSON.stringify(report.breakdown), JSON.stringify(report.matchedCriteria), JSON.stringify(report.missingCriteria), JSON.stringify(report.evidence)]
      );
      return row;
    });

    await redis.set(`resume:${session.id}`, encryptText(resumeText), "EX", 24 * 60 * 60);
    await questionQueue.add("generate", { sessionId: session.id }, { jobId: session.id });
    res.status(202).json({
      session: { id: session.id, status: session.status, questionStatus: session.question_status, expiresAt: session.expires_at },
      atsReport: { ...report, advice: [], adviceUnavailable: true },
    });
  } catch (error) { next(error); }
});

module.exports = router;
