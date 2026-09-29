const express = require("express");
const db = require("../config/database");
const { requireAuth, requireRole } = require("../middleware/auth");
const { normalizeWeights } = require("../services/ats");

const router = express.Router();
router.use(requireAuth, requireRole("recruiter"));
router.use((req, res, next) => {
  if (!req.auth.companyId) return res.status(403).json({ error: { code: "COMPANY_REQUIRED", message: "This recruiter has no assigned company.", requestId: req.id } });
  next();
});

function normalizeRoleBody(body) {
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const requiredSkills = Array.isArray(body.requiredSkills) ? body.requiredSkills.map(String).map((v) => v.trim()).filter(Boolean).slice(0, 50) : [];
  const preferredSkills = Array.isArray(body.preferredSkills) ? body.preferredSkills.map(String).map((v) => v.trim()).filter(Boolean).slice(0, 50) : [];
  const minExperienceYears = Number(body.minExperienceYears || 0);
  if (!title || !description) throw Object.assign(new Error("title and description are required"), { status: 400, code: "INVALID_ROLE" });
  if (!Number.isFinite(minExperienceYears) || minExperienceYears < 0 || minExperienceYears > 50) throw Object.assign(new Error("minExperienceYears is invalid"), { status: 400, code: "INVALID_ROLE" });
  return { title, description, requiredSkills, preferredSkills, minExperienceYears, academicExpectations: body.academicExpectations || {}, weights: normalizeWeights(body.weights) };
}

router.get("/company-roles", async (req, res, next) => {
  try {
    const result = await db.query(`SELECT * FROM company_roles WHERE company_id=$1 ORDER BY active DESC, updated_at DESC`, [req.auth.companyId]);
    res.json({ companyRoles: result.rows });
  } catch (error) { next(error); }
});

router.post("/company-roles", async (req, res, next) => {
  try {
    const role = normalizeRoleBody(req.body);
    const result = await db.query(
      `INSERT INTO company_roles(company_id,title,description,required_skills,preferred_skills,min_experience_years,academic_expectations,weights,created_by)
       VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7::jsonb,$8::jsonb,$9) RETURNING *`,
      [req.auth.companyId, role.title, role.description, JSON.stringify(role.requiredSkills), JSON.stringify(role.preferredSkills), role.minExperienceYears, JSON.stringify(role.academicExpectations), JSON.stringify(role.weights), req.auth.uid]
    );
    res.status(201).json({ companyRole: result.rows[0] });
  } catch (error) { next(error); }
});

router.put("/company-roles/:id", async (req, res, next) => {
  try {
    const role = normalizeRoleBody(req.body);
    const result = await db.query(
      `UPDATE company_roles SET title=$1,description=$2,required_skills=$3::jsonb,preferred_skills=$4::jsonb,
       min_experience_years=$5,academic_expectations=$6::jsonb,weights=$7::jsonb,updated_at=NOW()
       WHERE id=$8 AND company_id=$9 RETURNING *`,
      [role.title, role.description, JSON.stringify(role.requiredSkills), JSON.stringify(role.preferredSkills), role.minExperienceYears, JSON.stringify(role.academicExpectations), JSON.stringify(role.weights), req.params.id, req.auth.companyId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: { code: "ROLE_NOT_FOUND", message: "Company role not found.", requestId: req.id } });
    res.json({ companyRole: result.rows[0] });
  } catch (error) { next(error); }
});

router.delete("/company-roles/:id", async (req, res, next) => {
  try {
    const result = await db.query(`UPDATE company_roles SET active=FALSE,updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING id`, [req.params.id, req.auth.companyId]);
    if (!result.rows[0]) return res.status(404).json({ error: { code: "ROLE_NOT_FOUND", message: "Company role not found.", requestId: req.id } });
    res.status(204).end();
  } catch (error) { next(error); }
});

router.get("/candidates", async (req, res, next) => {
  try {
    const values = [req.auth.companyId];
    const filters = [];
    if (req.query.roleId) { values.push(req.query.roleId); filters.push(`cr.id=$${values.length}`); }
    if (req.query.from) { values.push(req.query.from); filters.push(`ms.created_at >= $${values.length}::timestamptz`); }
    if (req.query.to) { values.push(req.query.to); filters.push(`ms.created_at < ($${values.length}::date + INTERVAL '1 day')`); }
    const result = await db.query(
      `SELECT ms.id AS session_id,u.display_name,u.email,cr.id AS company_role_id,cr.title AS role_title,
       ar.overall_score,ar.breakdown,ar.matched_criteria,ar.missing_criteria,ir.interview_score,ms.status,ms.created_at,ms.completed_at
       FROM mock_sessions ms
       JOIN company_roles cr ON cr.id=ms.company_role_id
       JOIN users u ON u.firebase_uid=ms.candidate_uid
       JOIN ats_reports ar ON ar.mock_session_id=ms.id
       LEFT JOIN interview_results ir ON ir.mock_session_id=ms.id
       WHERE cr.company_id=$1 ${filters.length ? `AND ${filters.join(" AND ")}` : ""}
       ORDER BY ar.overall_score DESC,ir.interview_score DESC NULLS LAST,ms.created_at DESC LIMIT 500`, values
    );
    res.json({ candidates: result.rows });
  } catch (error) { next(error); }
});

router.get("/jobs/failed", async (_req, res, next) => {
  try {
    const { questionQueue } = require("../services/queue");
    const jobs = await questionQueue.getFailed(0, 99);
    res.json({ jobs: jobs.map((job) => ({ id: job.id, failedReason: job.failedReason, attemptsMade: job.attemptsMade, timestamp: job.timestamp })) });
  } catch (error) { next(error); }
});

module.exports = router;
