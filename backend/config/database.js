const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX || 20),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.PG_SSL === "true" ? { rejectUnauthorized: true } : false,
});

pool.on("error", (error) => {
  console.error(JSON.stringify({ level: "error", event: "postgres_pool_error", message: error.message }));
});

async function query(text, params) {
  return pool.query(text, params);
}

async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const value = await callback(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, transaction };
