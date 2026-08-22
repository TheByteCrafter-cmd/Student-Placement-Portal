import { pool, testDatabaseConnection } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export interface JobSourceRecord {
  id: string;
  name: string;
  source_type: 'API' | 'ATS' | 'CAREER_PAGE' | 'RSS' | 'CONTROLLED_EXTRACTION';
  base_url: string;
  source_url: string;
  is_enabled: boolean;
  scan_interval: number;
  priority: number;
  last_scan_at: Date | null;
  last_success_at: Date | null;
  last_error_at: Date | null;
  last_error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

const inMemorySources: Map<string, JobSourceRecord> = new Map();

/**
 * Initializes the PostgreSQL schema for job_sources
 */
export async function initSourceTable(): Promise<void> {
  const dbHealth = await testDatabaseConnection();
  if (!dbHealth.connected) {
    console.log('ℹ️ PostgreSQL offline: Job sources store running in-memory fallback mode.');
    seedDefaultInMemorySources();
    return;
  }

  const query = `
    CREATE TABLE IF NOT EXISTS job_sources (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('API', 'ATS', 'CAREER_PAGE', 'RSS', 'CONTROLLED_EXTRACTION')),
      base_url VARCHAR(500) NOT NULL,
      source_url VARCHAR(500) NOT NULL,
      is_enabled BOOLEAN NOT NULL DEFAULT true,
      scan_interval INTEGER NOT NULL DEFAULT 3600,
      priority INTEGER NOT NULL DEFAULT 1,
      last_scan_at TIMESTAMPTZ NULL,
      last_success_at TIMESTAMPTZ NULL,
      last_error_at TIMESTAMPTZ NULL,
      last_error_message TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sources_enabled ON job_sources(is_enabled);
  `;

  try {
    await pool.query(query);
    console.log('✅ PostgreSQL Schema: `job_sources` table verified.');
    await seedDefaultPostgresSources();
  } catch (err: any) {
    console.error('❌ Failed to initialize PostgreSQL job_sources table:', err.message);
  }
}

function getInitialSources(): Omit<JobSourceRecord, 'id' | 'created_at' | 'updated_at'>[] {
  return [
    {
      name: 'Tech Openings API Connector',
      source_type: 'API',
      base_url: 'https://api.techcareers.example.com',
      source_url: 'https://api.techcareers.example.com/v1/jobs',
      is_enabled: true,
      scan_interval: 1800,
      priority: 1,
      last_scan_at: new Date(),
      last_success_at: new Date(),
      last_error_at: null,
      last_error_message: null,
    },
    {
      name: 'University Placement ATS Portal',
      source_type: 'ATS',
      base_url: 'https://campusats.example.edu',
      source_url: 'https://campusats.example.edu/drives',
      is_enabled: true,
      scan_interval: 3600,
      priority: 2,
      last_scan_at: new Date(),
      last_success_at: new Date(),
      last_error_at: null,
      last_error_message: null,
    },
    {
      name: 'Engineering Graduate RSS Feed',
      source_type: 'RSS',
      base_url: 'https://enggjobs.example.org',
      source_url: 'https://enggjobs.example.org/feed.xml',
      is_enabled: false,
      scan_interval: 7200,
      priority: 3,
      last_scan_at: null,
      last_success_at: null,
      last_error_at: null,
      last_error_message: null,
    },
  ];
}

function seedDefaultInMemorySources() {
  if (inMemorySources.size > 0) return;
  const initial = getInitialSources();
  const now = new Date();
  for (const s of initial) {
    const id = uuidv4();
    inMemorySources.set(id, {
      ...s,
      id,
      created_at: now,
      updated_at: now,
    });
  }
}

async function seedDefaultPostgresSources() {
  try {
    const checkRes = await pool.query('SELECT COUNT(*) FROM job_sources');
    if (parseInt(checkRes.rows[0].count, 10) > 0) return;

    const initial = getInitialSources();
    for (const s of initial) {
      await pool.query(
        `INSERT INTO job_sources (name, source_type, base_url, source_url, is_enabled, scan_interval, priority, last_scan_at, last_success_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (name) DO NOTHING`,
        [s.name, s.source_type, s.base_url, s.source_url, s.is_enabled, s.scan_interval, s.priority, s.last_scan_at, s.last_success_at]
      );
    }
  } catch (err: any) {
    console.warn('Warning: Could not seed default job sources:', err.message);
  }
}

/**
 * Gets all job sources
 */
export async function getJobSources(): Promise<JobSourceRecord[]> {
  const dbHealth = await testDatabaseConnection();

  if (dbHealth.connected) {
    try {
      const res = await pool.query('SELECT * FROM job_sources ORDER BY priority ASC, name ASC');
      return res.rows;
    } catch (err: any) {
      console.error('Error fetching job sources from DB:', err.message);
    }
  }

  return Array.from(inMemorySources.values()).sort((a, b) => a.priority - b.priority);
}

/**
 * Toggles a job source enabled status
 */
export async function toggleJobSourceStatus(sourceId: string, isEnabled: boolean): Promise<JobSourceRecord | null> {
  const dbHealth = await testDatabaseConnection();

  if (dbHealth.connected) {
    const res = await pool.query(
      `UPDATE job_sources SET is_enabled = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [isEnabled, sourceId]
    );
    return res.rows[0] || null;
  }

  const s = inMemorySources.get(sourceId);
  if (s) {
    s.is_enabled = isEnabled;
    s.updated_at = new Date();
    return s;
  }
  return null;
}
