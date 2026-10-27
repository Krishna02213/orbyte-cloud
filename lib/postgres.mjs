import fs from "node:fs";
import pg from "pg";

// Connection creation is lazy: production builds never contact the live database.
export function getPool() {
  if (!globalThis.__orbytePostgresPool) {
    let connection = {};
    if (process.env.ORBYTE_DATABASE_CONFIG) {
      const config = JSON.parse(fs.readFileSync(process.env.ORBYTE_DATABASE_CONFIG, "utf8"));
      for (const key of ["host", "database", "user", "password", "caPath"]) {
        if (typeof config[key] !== "string" || !config[key]) {
          throw new Error(`Missing database configuration field: ${key}`);
        }
      }
      connection = {
        host: config.host,
        port: config.port ?? 5432,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: { ca: fs.readFileSync(config.caPath, "utf8"), rejectUnauthorized: true },
      };
    }
    // Without a config file, pg reads PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD.
    // CI uses those variables with its disposable local PostgreSQL service.
    const pool = new pg.Pool({
      ...connection,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      statement_timeout: 10000,
    });
    pool.on("error", () => console.error("An idle PostgreSQL connection failed."));
    globalThis.__orbytePostgresPool = pool;
  }
  return globalThis.__orbytePostgresPool;
}
