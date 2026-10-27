import { getPool } from "../lib/postgres.mjs";

const pool = getPool();
try {
  const { rows } = await pool.query(
    "SELECT id, name, email, company, team_size, service, message, status, created_at " +
    "FROM public.consultation_requests ORDER BY created_at DESC, id DESC",
  );
  console.table(rows);
} finally {
  await pool.end();
}
