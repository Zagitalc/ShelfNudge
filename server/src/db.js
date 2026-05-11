import pg from 'pg';

const { Pool } = pg;

export const hasDatabaseUrl = () => Boolean(process.env.DATABASE_URL);

const shouldUseSsl = () => {
  if (!process.env.DATABASE_URL) return false;
  const { hostname } = new URL(process.env.DATABASE_URL);
  return !['localhost', '127.0.0.1', '::1'].includes(hostname);
};

export const pool = hasDatabaseUrl()
  ? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
  })
  : null;

export const query = (text, params) => {
  if (!pool) {
    throw new Error('DATABASE_URL is not configured');
  }

  return pool.query(text, params);
};
