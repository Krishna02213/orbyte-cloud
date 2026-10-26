import fs from "node:fs";
import { getPool } from "../lib/postgres.mjs";

const pool = getPool();
try {
  const { rows } = await pool.query("SELECT current_database() AS database");
  const name = rows[0].database;
  if (!["orbyte_ci", "orbyte_preflight"].includes(name)) {
    throw new Error("Schema setup is restricted to orbyte_ci and orbyte_preflight. Set up production explicitly as its administrator.");
  }
  await pool.query(fs.readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  console.log(`Test schema ready: ${name}`);
} finally {
  await pool.end();
}
