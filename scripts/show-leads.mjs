import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const databasePath = path.join(process.cwd(), "data", "orbyte.db");
const database = new DatabaseSync(databasePath);
const rows = database
  .prepare(
    "SELECT id, name, email, company, team_size, service, message, status, created_at FROM consultation_requests ORDER BY created_at DESC, id DESC",
  )
  .all();

console.log("Database:", databasePath);
console.table(rows);
