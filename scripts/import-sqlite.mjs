import assert from "node:assert/strict";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { getPool } from "../lib/postgres.mjs";

const [mode, sourcePath = "/var/lib/orbyte-cloud/orbyte.db"] = process.argv.slice(2);
if (!["--verify", "--import-writes-paused"].includes(mode)) {
  console.error("Usage: node scripts/import-sqlite.mjs --verify|--import-writes-paused [sqlite-file]");
  process.exit(2);
}
assert.ok(fs.existsSync(sourcePath), "SQLite source file does not exist.");
const source = new DatabaseSync(sourcePath, { readOnly: true });
let sourceRows;
let lastIssuedId;
try {
  sourceRows = source.prepare(
    "SELECT id, name, email, company, team_size, service, message, status, created_at " +
    "FROM consultation_requests ORDER BY id",
  ).all().map((row) => {
    const stamp = String(row.created_at).replace(" ", "T");
    const utc = /(?:Z|[+-]\d{2}:\d{2})$/i.test(stamp) ? stamp : stamp + "Z";
    return { ...row, created_at: new Date(utc).toISOString() };
  });
  const hasSequence = source.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'").get();
  const sequence = hasSequence
    ? source.prepare("SELECT seq FROM sqlite_sequence WHERE name='consultation_requests'").get()
    : undefined;
  lastIssuedId = Math.max(Number(sequence?.seq ?? 0), ...sourceRows.map((row) => Number(row.id)), 0);
  assert.ok(Number.isSafeInteger(lastIssuedId) && lastIssuedId >= 0, "Invalid source ID sequence.");
} finally {
  source.close();
}

const pool = getPool();
const client = await pool.connect();
try {
  const { rows } = await client.query("SELECT current_database() AS database");
  assert.ok(["orbyte", "orbyte_ci"].includes(rows[0].database), "Unexpected destination database.");
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  if (mode === "--import-writes-paused") {
    const count = await client.query("SELECT COUNT(*)::integer AS count FROM public.consultation_requests");
    assert.equal(count.rows[0].count, 0, "Destination is not empty. Refusing to overwrite or duplicate existing records.");
    for (const row of sourceRows) {
      await client.query(
        "INSERT INTO public.consultation_requests " +
        "(id, name, email, company, team_size, service, message, status, created_at) " +
        "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [row.id, row.name, row.email, row.company, row.team_size, row.service, row.message, row.status, row.created_at],
      );
    }
  }
  const target = await client.query(
    "SELECT id, name, email, company, team_size, service, message, status, created_at " +
    "FROM public.consultation_requests ORDER BY id",
  );
  assert.equal(target.rows.length, sourceRows.length, "Source and destination row counts differ.");
  for (let i = 0; i < sourceRows.length; i++) {
    const targetRow = { ...target.rows[i], created_at: target.rows[i].created_at.toISOString() };
    // Do not print the records or database error details containing personal data.
    if (JSON.stringify(targetRow) !== JSON.stringify(sourceRows[i])) {
      throw new Error(`Verification failed at row ${i + 1}; import will be rolled back.`);
    }
  }
  await client.query("COMMIT");
  console.log(`Verified ${sourceRows.length} records, including original IDs, timestamps, and all field values.`);
  console.log(`Last issued SQLite ID: ${lastIssuedId}`);
  if (mode === "--import-writes-paused") {
    console.log("Import committed. Reset the identity sequence as postgres before enabling form submissions.");
    console.log("Run as postgres:\n" +
      "SELECT setval(pg_get_serial_sequence('public.consultation_requests', 'id'), " +
      `GREATEST(COALESCE(MAX(id), 0), ${lastIssuedId}, 1), ` +
      `GREATEST(COALESCE(MAX(id), 0), ${lastIssuedId}) > 0) FROM public.consultation_requests;`);
  }
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
