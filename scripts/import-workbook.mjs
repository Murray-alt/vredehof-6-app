import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pkg from "pg";
import XLSX from "xlsx";

const { Client } = pkg;

const workbookPath = process.argv[2];
const databaseUrl = process.env.DATABASE_URL;

if (!workbookPath) {
  console.error("Usage: npm run db:import-workbook -- <absolute-path-to-workbook>");
  process.exit(1);
}

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

if (!fs.existsSync(workbookPath)) {
  console.error(`Workbook not found: ${workbookPath}`);
  process.exit(1);
}

const workbook = XLSX.readFile(workbookPath, { cellDates: true });
const sheet1 = workbook.Sheets["Sheet1"];
const sheet2 = workbook.Sheets["Sheet2"];

if (!sheet1) {
  console.error("Sheet1 is missing from the workbook.");
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

function toIsoDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (!parsed) {
      return null;
    }

    const month = String(parsed.m).padStart(2, "0");
    const day = String(parsed.d).padStart(2, "0");

    return `${parsed.y}-${month}-${day}`;
  }

  return null;
}

function asAmount(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return null;
  }

  return numeric.toFixed(2);
}

async function findPropertyId() {
  const result = await client.query("SELECT id FROM properties WHERE slug = $1 LIMIT 1", ["vredehof-6"]);
  return result.rows[0]?.id ?? null;
}

async function findCategoryMap(propertyId) {
  const result = await client.query(
    "SELECT id, name FROM categories WHERE property_id = $1 AND is_active = TRUE",
    [propertyId]
  );

  return new Map(result.rows.map((row) => [row.name.toLowerCase(), row.id]));
}

async function insertEntry(propertyId, categoryId, entryDate, entryType, description, amount, balanceEffect, sourceReference) {
  const result = await client.query(
    `INSERT INTO ledger_entries (
      property_id,
      category_id,
      entry_date,
      entry_type,
      description,
      amount,
      balance_effect,
      source,
      source_reference,
      is_visible_to_stakeholders
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'imported', $8, TRUE)
    ON CONFLICT (property_id, source, source_reference) DO NOTHING
    RETURNING id`,
    [propertyId, categoryId, entryDate, entryType, description, amount, balanceEffect, sourceReference]
  );

  return result.rowCount > 0;
}

async function importPrimarySheet(propertyId, categoryMap) {
  const rows = XLSX.utils.sheet_to_json(sheet1, { header: 1, raw: true });
  let inserted = 0;
  let skipped = 0;

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    const entryDate = toIsoDate(row[1]);

    if (!entryDate) {
      continue;
    }

    const rent = asAmount(row[2]);
    const levy = asAmount(row[3]);
    const otherExpenses = asAmount(row[4]);
    const description = String(row[5] ?? "").trim();

    if (rent) {
      const didInsert = await insertEntry(
        propertyId,
        categoryMap.get("rent") ?? null,
        entryDate,
        "income",
        description || "Rent received",
        rent,
        rent,
        `Sheet1!C${index + 1}`
      );
      inserted += didInsert ? 1 : 0;
      skipped += didInsert ? 0 : 1;
    }

    if (levy) {
      const didInsert = await insertEntry(
        propertyId,
        categoryMap.get("levy") ?? null,
        entryDate,
        "expense",
        "Levy paid",
        levy,
        (-Number(levy)).toFixed(2),
        `Sheet1!D${index + 1}`
      );
      inserted += didInsert ? 1 : 0;
      skipped += didInsert ? 0 : 1;
    }

    if (otherExpenses) {
      const didInsert = await insertEntry(
        propertyId,
        categoryMap.get("other") ?? null,
        entryDate,
        "expense",
        description || "Other expense",
        otherExpenses,
        (-Number(otherExpenses)).toFixed(2),
        `Sheet1!E${index + 1}`
      );
      inserted += didInsert ? 1 : 0;
      skipped += didInsert ? 0 : 1;
    }
  }

  return { inserted, skipped };
}

async function importHolidaySheet(propertyId, categoryMap) {
  if (!sheet2) {
    return { inserted: 0, skipped: 0 };
  }

  const rows = XLSX.utils.sheet_to_json(sheet2, { header: 1, raw: true });
  const today = new Date().toISOString().slice(0, 10);
  let inserted = 0;
  let skipped = 0;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const description = String(row[0] ?? "").trim();
    const amount = asAmount(row[1]);

    if (!description || !amount || description.toUpperCase() === "HOLIDAY EXPENSES") {
      continue;
    }

    const didInsert = await insertEntry(
      propertyId,
      categoryMap.get("holiday/shared") ?? categoryMap.get("other") ?? null,
      today,
      "expense",
      description,
      amount,
      (-Number(amount)).toFixed(2),
      `Sheet2!A${index + 1}:B${index + 1}`
    );
    inserted += didInsert ? 1 : 0;
    skipped += didInsert ? 0 : 1;
  }

  return { inserted, skipped };
}

await client.connect();

try {
  const propertyId = await findPropertyId();

  if (!propertyId) {
    throw new Error("Property with slug 'vredehof-6' does not exist.");
  }

  const categoryMap = await findCategoryMap(propertyId);

  const primarySummary = await importPrimarySheet(propertyId, categoryMap);
  const holidaySummary = await importHolidaySheet(propertyId, categoryMap);
  const inserted = primarySummary.inserted + holidaySummary.inserted;
  const skipped = primarySummary.skipped + holidaySummary.skipped;

  console.log(`Processed workbook ${path.basename(workbookPath)} for property ${propertyId}.`);
  console.log(`Inserted rows: ${inserted}`);
  console.log(`Skipped duplicate rows: ${skipped}`);
} finally {
  await client.end();
}
