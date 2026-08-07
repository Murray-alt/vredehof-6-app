import fs from "node:fs";
import process from "node:process";
import pkg from "pg";

const { Client } = pkg;

const sqlFile = process.argv[2];
const databaseUrl = process.env.DATABASE_URL;

if (!sqlFile) {
  console.error("Usage: npm run db:run-sql -- <path-to-sql-file>");
  process.exit(1);
}

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

if (!fs.existsSync(sqlFile)) {
  console.error(`SQL file not found: ${sqlFile}`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlFile, "utf8");
const client = new Client({ connectionString: databaseUrl });

await client.connect();

try {
  await client.query(sql);
  console.log(`Applied SQL file: ${sqlFile}`);
} finally {
  await client.end();
}
