import process from "node:process";
import pkg from "pg";

const { Client } = pkg;

const requiredEnv = ["DATABASE_URL", "SESSION_SECRET", "APP_URL"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

const requiredTables = ["users", "properties", "categories", "ledger_entries"];

await client.connect();

try {
  const tableResult = await client.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])
     ORDER BY table_name ASC`,
    [requiredTables]
  );

  const presentTables = new Set(tableResult.rows.map((row) => row.table_name));
  const missingTables = requiredTables.filter((name) => !presentTables.has(name));

  if (missingTables.length > 0) {
    console.error(`Missing required database tables: ${missingTables.join(", ")}`);
    process.exit(1);
  }

  const propertyResult = await client.query(
    `SELECT id, name
     FROM properties
     WHERE slug = $1
     LIMIT 1`,
    ["vredehof-6"]
  );

  if (propertyResult.rows.length === 0) {
    console.error("Property seed is missing: expected slug 'vredehof-6'.");
    process.exit(1);
  }

  const userResult = await client.query(
    `SELECT email, role_code
     FROM users
     ORDER BY email ASC`
  );

  console.log("Environment variables: OK");
  console.log("Database connection: OK");
  console.log(`Property seed: OK (${propertyResult.rows[0].name})`);
  console.log(`Users found: ${userResult.rows.length}`);

  for (const row of userResult.rows) {
    console.log(`- ${row.email} (${row.role_code})`);
  }
} finally {
  await client.end();
}
