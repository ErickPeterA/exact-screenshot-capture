import { Pool, type QueryResultRow } from "pg";

let pool: Pool | undefined;

function getPool() {
  if (!pool) {
    const connectionString = process.env["DATABASE_URL"];
    if (!connectionString) throw new Error("Missing required DATABASE_URL environment variable.");
    pool = new Pool({ connectionString, max: 10 });
  }
  return pool;
}

export async function query<Row extends QueryResultRow = QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
) {
  return getPool().query<Row>(text, values);
}
