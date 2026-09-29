const test = require("node:test");
const assert = require("node:assert/strict");
const { isExactDomain } = require("../middleware/auth");

test("accepts only the exact RVCE domain", () => {
  assert.equal(isExactDomain("student@rvce.edu.in"), true);
  assert.equal(isExactDomain(" Student@RVCE.EDU.IN "), true);
  assert.equal(isExactDomain("student@mail.rvce.edu.in"), false);
  assert.equal(isExactDomain("student@rvce.edu.in.example.com"), false);
  assert.equal(isExactDomain("student@notrvce.edu.in"), false);
  assert.equal(isExactDomain("@rvce.edu.in"), false);
});
