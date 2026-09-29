const express = require("express");
const db = require("../config/database");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireRole("candidate"));

router.get("/", async (req, res, next) => {
  try {
    const [roles, companyRoles] = await Promise.all([
      db.query(`SELECT id, title, description, required_skills, preferred_skills, min_experience_years, academic_expectations, weights FROM role_profiles WHERE active=TRUE ORDER BY title`),
      db.query(`SELECT cr.id, cr.title, cr.description, cr.required_skills, cr.preferred_skills,
        cr.min_experience_years, cr.academic_expectations, cr.weights, c.name AS company_name
        FROM company_roles cr JOIN companies c ON c.id=cr.company_id WHERE cr.active=TRUE ORDER BY c.name, cr.title`),
    ]);
    res.json({ roles: roles.rows, companyRoles: companyRoles.rows });
  } catch (error) { next(error); }
});

module.exports = router;
