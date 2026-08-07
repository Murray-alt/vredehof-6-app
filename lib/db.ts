import { Pool, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __vredehofPool: Pool | undefined;
}

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!global.__vredehofPool) {
    global.__vredehofPool = new Pool({
      connectionString
    });
  }

  return global.__vredehofPool;
}

export async function sql<T extends QueryResultRow>(query: string, values: unknown[] = []): Promise<T[]> {
  const result = await getPool().query<T>(query, values);
  return result.rows;
}
