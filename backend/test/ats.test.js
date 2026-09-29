const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateAtsScore, normalizeWeights, SCORING_VERSION } = require("../services/ats");

const target = {
  required_skills: ["javascript", "sql"],
  preferred_skills: ["docker", "kubernetes"],
  min_experience_years: 2,
  academic_expectations: { minCgpa: 8, keywords: ["computer science"] },
  weights: { technical: 50, experience: 30, academic: 20 },
};

test("ATS scoring is deterministic and evidence-backed", () => {
  const resume = "B.E. Computer Science, CGPA: 9.0. 2 years experience. Built a JavaScript API backed by SQL. Developed and deployed the project with Docker.";
  const first = calculateAtsScore(resume, target);
  const second = calculateAtsScore(resume, target);
  assert.deepEqual(first, second);
  assert.equal(first.scoringVersion, SCORING_VERSION);
  assert.ok(first.overallScore >= 80);
  assert.deepEqual(first.missingCriteria, ["kubernetes"]);
  assert.ok(first.evidence.some((item) => item.criterion === "javascript"));
});

test("ATS weights must total 100", () => {
  assert.throws(() => normalizeWeights({ technical: 60, experience: 30, academic: 20 }), /total 100/);
});
