require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("../config/database");

async function main() {
  const directory = path.join(__dirname, "../db/migrations");
  const files = fs.readdirSync(directory).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(directory, file), "utf8");
    await pool.query(sql);
    console.log(`Applied ${file}`);
  }
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
