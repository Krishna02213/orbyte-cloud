import assert from "node:assert/strict";
import { getPool } from "../lib/postgres.mjs";

const expectedDatabase = process.argv[2];
assert.ok(expectedDatabase, "Supply the expected database name as the first argument.");
const pool = getPool();
try {
  const { rows } = await pool.query(
    "SELECT current_database() AS database, current_user AS username, " +
    "(SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS tls",
  );
  assert.equal(rows[0].database, expectedDatabase);
  if (process.env.ORBYTE_DATABASE_CONFIG) assert.equal(rows[0].tls, true, "RDS requires TLS");
  const count = await pool.query("SELECT COUNT(*)::integer AS count FROM public.consultation_requests");
  console.log(`Database check passed: ${rows[0].database}, user ${rows[0].username}, TLS ${rows[0].tls}, ${count.rows[0].count} submissions.`);
} finally {
  await pool.end();
}
