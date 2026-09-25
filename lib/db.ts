import { Pool } from 'pg';

if (process.env.NODE_ENV === 'production' && !process.env.PGPASSWORD) {
  throw new Error('PGPASSWORD environment variable is required in production');
}

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'comissoes_db',
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: true } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export default pool;
export const query = (text: string, params?: unknown[]) => pool.query(text, params);
