import { Pool, type PoolConfig, type QueryResultRow } from "pg";

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
    global.__vredehofPool = new Pool(buildPoolConfig(connectionString));
  }

  return global.__vredehofPool;
}

export async function sql<T extends QueryResultRow>(query: string, values: unknown[] = []): Promise<T[]> {
  const result = await getPool().query<T>(query, values);
  return result.rows;
}

function buildPoolConfig(connectionString: string): PoolConfig {
  const config: PoolConfig = {
    connectionString
  };

  try {
    const url = new URL(connectionString);
    const sslMode = (url.searchParams.get("sslmode") ?? "").toLowerCase();
    const shouldUseSsl = sslMode !== "" && sslMode !== "disable";

    if (shouldUseSsl) {
      config.ssl = {
        rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED === "true"
      };
    }
  } catch {
    // Fall back to the raw connection string when URL parsing is not possible.
  }

  return config;
}
