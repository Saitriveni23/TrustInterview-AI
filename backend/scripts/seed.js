require("dotenv").config();
const { pool } = require("../config/database");

const roles = [
  ["software-engineer", "Software Engineer", "Build, test and operate reliable software systems.", ["javascript", "python", "java", "data structures", "algorithms", "api", "git"], ["typescript", "testing", "docker", "sql"]],
  ["data-analyst", "Data Analyst", "Analyze data and communicate actionable insights.", ["sql", "python", "statistics", "data analysis"], ["pandas", "tableau", "power bi", "excel"]],
  ["ai-engineer", "AI / ML Engineer", "Develop and evaluate production machine-learning systems.", ["python", "machine learning", "statistics"], ["pytorch", "tensorflow", "nlp", "computer vision", "llm"]],
  ["cybersecurity-engineer", "Cybersecurity Engineer", "Protect systems through detection, prevention and response.", ["security", "networking", "linux"], ["siem", "penetration testing", "threat modeling", "zero trust"]],
  ["cloud-engineer", "Cloud / DevOps Engineer", "Automate and operate cloud infrastructure.", ["linux", "cloud", "ci/cd"], ["aws", "azure", "gcp", "docker", "kubernetes", "terraform"]],
];

async function main() {
  for (const role of roles) {
    await pool.query(
      `INSERT INTO role_profiles (id, title, description, required_skills, preferred_skills)
       VALUES ($1,$2,$3,$4::jsonb,$5::jsonb)
       ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description,
         required_skills=EXCLUDED.required_skills, preferred_skills=EXCLUDED.preferred_skills, updated_at=NOW()`,
      [role[0], role[1], role[2], JSON.stringify(role[3]), JSON.stringify(role[4])]
    );
  }
  await pool.end();
  console.log(`Seeded ${roles.length} role profiles.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
