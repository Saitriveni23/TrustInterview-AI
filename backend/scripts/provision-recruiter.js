require("dotenv").config();
const { getFirebaseAuth } = require("../config/firebase");
const db = require("../config/database");

async function main() {
  const [emailArg, companyArg] = process.argv.slice(2);
  if (!emailArg || !companyArg) throw new Error("Usage: npm run provision:recruiter -- email@example.com \"Company Name\"");
  const email = emailArg.trim().toLowerCase();
  const user = await getFirebaseAuth().getUserByEmail(email);
  const company = await db.query(
    `INSERT INTO companies(name) VALUES($1) ON CONFLICT(name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
    [companyArg.trim()]
  );
  const companyId = company.rows[0].id;
  await getFirebaseAuth().setCustomUserClaims(user.uid, { role: "recruiter", company_id: companyId });
  await db.query(
    `INSERT INTO users(firebase_uid,email,display_name,role,company_id)
     VALUES($1,$2,$3,'recruiter',$4)
     ON CONFLICT(firebase_uid) DO UPDATE SET role='recruiter', company_id=EXCLUDED.company_id`,
    [user.uid, email, user.displayName || email.split("@")[0], companyId]
  );
  await db.pool.end();
  console.log(`Provisioned ${email} for ${companyArg}. The user must refresh their Firebase token.`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
