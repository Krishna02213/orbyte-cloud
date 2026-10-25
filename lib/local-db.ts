import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type Consultation = {
  id: number;
  name: string;
  email: string;
  company: string;
  teamSize: string;
  service: string;
  message: string;
  status: string;
  createdAt: string;
};

const dataDirectory = process.env.ORBYTE_DATA_DIR
  ? path.resolve(process.env.ORBYTE_DATA_DIR)
  : path.join(process.cwd(), "data");
const databasePath = path.join(dataDirectory, "orbyte.db");

fs.mkdirSync(dataDirectory, { recursive: true });

const globalDatabase = globalThis as typeof globalThis & {
  __orbyteDatabase?: DatabaseSync;
};

const database =
  globalDatabase.__orbyteDatabase ??
  new DatabaseSync(databasePath, { enableForeignKeyConstraints: true });

if (process.env.NODE_ENV !== "production") {
  globalDatabase.__orbyteDatabase = database;
}

database.exec(
  "CREATE TABLE IF NOT EXISTS consultation_requests (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "name TEXT NOT NULL," +
    "email TEXT NOT NULL," +
    "company TEXT NOT NULL DEFAULT ''," +
    "team_size TEXT NOT NULL DEFAULT ''," +
    "service TEXT NOT NULL," +
    "message TEXT NOT NULL DEFAULT ''," +
    "status TEXT NOT NULL DEFAULT 'new'," +
    "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP" +
  ")",
);

export function saveConsultation(input: Omit<Consultation, "id" | "status" | "createdAt">) {
  const statement = database.prepare(
    "INSERT INTO consultation_requests (name, email, company, team_size, service, message) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const result = statement.run(
    input.name,
    input.email,
    input.company,
    input.teamSize,
    input.service,
    input.message,
  );
  return Number(result.lastInsertRowid);
}

export function listConsultations(): Consultation[] {
  const rows = database
    .prepare(
      "SELECT id, name, email, company, team_size AS teamSize, service, message, status, created_at AS createdAt FROM consultation_requests ORDER BY created_at DESC, id DESC LIMIT 500",
    )
    .all() as Array<Record<string, string | number>>;

  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    email: String(row.email),
    company: String(row.company),
    teamSize: String(row.teamSize),
    service: String(row.service),
    message: String(row.message),
    status: String(row.status),
    createdAt: String(row.createdAt),
  }));
}

export function getDatabasePath() {
  return databasePath;
}
