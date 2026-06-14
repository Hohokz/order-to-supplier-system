import { Pool, type QueryResultRow } from 'pg';

const globalForPg = globalThis as unknown as {
  pgPool: Pool | undefined;
};

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', {
        text,
        duration: Date.now() - start,
        rows: res.rowCount,
      });
    }
    return { rows: res.rows, rowCount: res.rowCount ?? 0 };
  } catch (err) {
    console.error('Database query error', { text, params, err });
    throw err;
  }
}