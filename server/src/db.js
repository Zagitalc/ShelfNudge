import pg from 'pg';

const { Pool } = pg;
let pool;

export const hasDatabaseUrl = () => Boolean(process.env.DATABASE_URL);

export const requireDatabaseUrl = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required. Configure PostgreSQL before starting the API server.');
  }
};

const shouldUseSsl = (databaseUrl) => {
  const { hostname } = new URL(databaseUrl);
  return !['localhost', '127.0.0.1', '::1'].includes(hostname);
};

export const getPool = () => {
  requireDatabaseUrl();

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: shouldUseSsl(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
    });
  }

  return pool;
};

export const query = (text, params) => {
  return getPool().query(text, params);
};
