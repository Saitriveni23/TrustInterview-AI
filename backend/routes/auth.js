const express = require("express");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/me", requireAuth, (req, res) => {
  res.json({
    user: {
      uid: req.auth.uid,
      email: req.auth.email,
      name: req.auth.name,
      role: req.auth.role,
      companyId: req.auth.companyId,
    },
  });
});

module.exports = router;
