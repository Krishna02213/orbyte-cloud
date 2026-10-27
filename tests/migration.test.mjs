import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import pg from "pg";
import { getPool } from "../lib/postgres.mjs";

test("SQLite import preserves data, respects restricted permissions, and rolls back failures", async () => {
  const pool = getPool();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "orbyte-migration-test-"));
  let app;
  try {
    const current = await pool.query("SELECT current_database() AS name");
    assert.equal(current.rows[0].name, "orbyte_ci", "Tests may only run against orbyte_ci.");
    await pool.query("TRUNCATE public.consultation_requests RESTART IDENTITY");
    await pool.query("CREATE ROLE orbyte_ci_app LOGIN PASSWORD 'ci-only-app-password'");
    await pool.query("GRANT CONNECT ON DATABASE orbyte_ci TO orbyte_ci_app");
    await pool.query("GRANT USAGE ON SCHEMA public TO orbyte_ci_app");
    await pool.query("GRANT SELECT, INSERT ON public.consultation_requests TO orbyte_ci_app");
    await pool.query("GRANT USAGE, SELECT ON SEQUENCE public.consultation_requests_id_seq TO orbyte_ci_app");
    app = new pg.Pool({ user: "orbyte_ci_app", password: "ci-only-app-password" });

    function fixture(file, invalid = false) {
      const db = new DatabaseSync(file);
      db.exec("CREATE TABLE consultation_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, company TEXT, team_size TEXT, service TEXT, message TEXT, status TEXT, created_at TEXT)");
      const insert = db.prepare("INSERT INTO consultation_requests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
      insert.run(7, "O'Neil", "migration@example.invalid", "Example", "4", "Cloud", "Hello 🌍", "new", "2026-10-25 18:00:00");
      insert.run(invalid ? 2147483648 : 19, "Second", "second@example.invalid", "", "", "Security", "Line 1\nLine 2", "reviewed", "2026-10-26 12:30:00");
      if (!invalid) {
        insert.run(30, "Deleted test", "deleted@example.invalid", "", "", "Test", "", "new", "2026-10-26 13:00:00");
        db.prepare("DELETE FROM consultation_requests WHERE id = 30").run();
      }
      db.close();
    }

    function run(mode, file) {
      return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ["scripts/import-sqlite.mjs", mode, file], {
          env: { ...process.env, ORBYTE_DATABASE_CONFIG: "", PGUSER: "orbyte_ci_app", PGPASSWORD: "ci-only-app-password", TZ: "America/Los_Angeles" },
        });
        let output = "";
        child.stdout.on("data", (chunk) => { output += chunk; });
        child.stderr.on("data", (chunk) => { output += chunk; });
        child.on("error", reject);
        child.on("close", (status) => resolve({ status, output }));
      });
    }

    const source = path.join(directory, "source.db");
    fixture(source);
    const hash = () => createHash("sha256").update(fs.readFileSync(source)).digest("hex");
    const before = hash();
    const imported = await run("--import-writes-paused", source);
    assert.equal(imported.status, 0, imported.output);
    assert.match(imported.output, /Last issued SQLite ID: 30/);
    assert.equal(hash(), before, "Source SQLite file must remain unchanged.");
    const records = await pool.query("SELECT id, name, message, status, created_at FROM public.consultation_requests ORDER BY id");
    assert.deepEqual(records.rows.map((row) => row.id), [7, 19]);
    assert.equal(records.rows[0].name, "O'Neil");
    assert.equal(records.rows[0].message, "Hello 🌍");
    assert.equal(records.rows[0].created_at.toISOString(), "2026-10-25T18:00:00.000Z");
    assert.equal(records.rows[1].status, "reviewed");
    assert.equal((await run("--verify", source)).status, 0);
    assert.notEqual((await run("--import-writes-paused", source)).status, 0, "Repeated import must refuse existing data.");
    assert.equal((await pool.query("SELECT COUNT(*)::integer AS count FROM public.consultation_requests")).rows[0].count, 2);
    await assert.rejects(app.query("DELETE FROM public.consultation_requests"), /permission denied/);
    await assert.rejects(app.query("SELECT setval('public.consultation_requests_id_seq', 1)"), /permission denied/);
    const next = await app.query("INSERT INTO public.consultation_requests (name, email, service) VALUES ('After import', 'test@example.invalid', 'Test') RETURNING id");
    assert.equal(next.rows[0].id, 31, "Sequence reset must avoid reusing even deleted SQLite IDs.");

    await pool.query("TRUNCATE public.consultation_requests RESTART IDENTITY");
    const invalid = path.join(directory, "invalid.db");
    fixture(invalid, true);
    assert.notEqual((await run("--import-writes-paused", invalid)).status, 0);
    assert.equal((await pool.query("SELECT COUNT(*)::integer AS count FROM public.consultation_requests")).rows[0].count, 0, "Partial imports must be rolled back.");
  } finally {
    if (app) await app.end();
    await pool.end();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
