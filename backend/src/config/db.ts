import { Pool } from 'pg';
import { config } from './env';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 3000,
});

export interface DBHealthResult {
  connected: boolean;
  database: string;
  host: string;
  error?: string;
  serverTime?: string;
}

export async function testDatabaseConnection(): Promise<DBHealthResult> {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT NOW() as now, current_database() as db');
      return {
        connected: true,
        database: res.rows[0].db || config.dbName,
        host: config.dbHost,
        serverTime: res.rows[0].now,
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      connected: false,
      database: config.dbName,
      host: config.dbHost,
      error: err?.message || 'Failed to connect to PostgreSQL database',
    };
  }
}
