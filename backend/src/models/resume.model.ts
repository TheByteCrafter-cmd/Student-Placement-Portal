import { pool, testDatabaseConnection } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export interface ResumeRecord {
  id: string;
  user_id: string;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  is_primary: boolean;
  uploaded_at: Date;
}

export type SafeResume = Omit<ResumeRecord, 'file_path' | 'stored_filename'>;

const inMemoryResumes: Map<string, ResumeRecord> = new Map(); // key = resume.id

/**
 * Initializes the PostgreSQL schema for the resumes table
 */
export async function initResumeTable(): Promise<void> {
  const dbHealth = await testDatabaseConnection();
  if (!dbHealth.connected) {
    console.log('ℹ️ PostgreSQL offline: Resume store running in-memory fallback mode.');
    return;
  }

  const query = `
    CREATE TABLE IF NOT EXISTS resumes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      original_filename VARCHAR(255) NOT NULL,
      stored_filename VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      mime_type VARCHAR(100) NOT NULL CHECK (mime_type = 'application/pdf'),
      file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 5242880),
      is_primary BOOLEAN NOT NULL DEFAULT false,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Additive column migration
    ALTER TABLE resumes ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

    CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
  `;

  try {
    await pool.query(query);
    console.log('✅ PostgreSQL Schema: `resumes` table verified.');
  } catch (err: any) {
    console.error('❌ Failed to initialize PostgreSQL resumes table:', err.message);
  }
}

/**
 * Saves a new resume record (Sets as primary if first resume)
 */
export async function createResumeRecord(data: {
  userId: string;
  originalFilename: string;
  storedFilename: string;
  filePath: string;
  fileSize: number;
  mimeType?: string;
}): Promise<ResumeRecord> {
  const dbHealth = await testDatabaseConnection();
  const existingResumes = await getResumesByUserId(data.userId);
  const isPrimary = existingResumes.length === 0;

  if (dbHealth.connected) {
    const res = await pool.query(
      `INSERT INTO resumes (user_id, original_filename, stored_filename, file_path, mime_type, file_size, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, original_filename, stored_filename, file_path, mime_type, file_size, is_primary, uploaded_at`,
      [data.userId, data.originalFilename, data.storedFilename, data.filePath, data.mimeType || 'application/pdf', data.fileSize, isPrimary]
    );

    return res.rows[0];
  }

  // In-memory fallback
  const record: ResumeRecord = {
    id: uuidv4(),
    user_id: data.userId,
    original_filename: data.originalFilename,
    stored_filename: data.storedFilename,
    file_path: data.filePath,
    mime_type: data.mimeType || 'application/pdf',
    file_size: data.fileSize,
    is_primary: isPrimary,
    uploaded_at: new Date(),
  };

  inMemoryResumes.set(record.id, record);
  return record;
}

/**
 * Sets a specific resume as Primary for a student, unsetting any previous primary resume
 */
export async function setPrimaryResume(resumeId: string, userId: string): Promise<ResumeRecord | null> {
  const dbHealth = await testDatabaseConnection();

  if (dbHealth.connected) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Verify ownership
      const checkRes = await client.query('SELECT id FROM resumes WHERE id = $1 AND user_id = $2', [resumeId, userId]);
      if (checkRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      // Unset all existing primary flags for user
      await client.query('UPDATE resumes SET is_primary = false WHERE user_id = $1', [userId]);

      // Set target resume as primary
      const updateRes = await client.query(
        'UPDATE resumes SET is_primary = true WHERE id = $1 AND user_id = $2 RETURNING id, user_id, original_filename, stored_filename, file_path, mime_type, file_size, is_primary, uploaded_at',
        [resumeId, userId]
      );

      await client.query('COMMIT');
      return updateRes.rows[0];
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // In-memory fallback
  const target = inMemoryResumes.get(resumeId);
  if (!target || target.user_id !== userId) {
    return null;
  }

  for (const r of inMemoryResumes.values()) {
    if (r.user_id === userId) {
      r.is_primary = r.id === resumeId;
    }
  }

  return target;
}

/**
 * Gets all resumes for a specific user
 */
export async function getResumesByUserId(userId: string): Promise<ResumeRecord[]> {
  const dbHealth = await testDatabaseConnection();

  if (dbHealth.connected) {
    try {
      const res = await pool.query(
        'SELECT id, user_id, original_filename, stored_filename, file_path, mime_type, file_size, is_primary, uploaded_at FROM resumes WHERE user_id = $1 ORDER BY uploaded_at DESC',
        [userId]
      );
      return res.rows;
    } catch (err: any) {
      console.error('Error fetching resumes from DB:', err.message);
    }
  }

  const userResumes: ResumeRecord[] = [];
  for (const r of inMemoryResumes.values()) {
    if (r.user_id === userId) {
      userResumes.push(r);
    }
  }
  return userResumes.sort((a, b) => b.uploaded_at.getTime() - a.uploaded_at.getTime());
}

/**
 * Gets a specific resume by ID
 */
export async function getResumeById(resumeId: string): Promise<ResumeRecord | null> {
  const dbHealth = await testDatabaseConnection();

  if (dbHealth.connected) {
    try {
      const res = await pool.query(
        'SELECT id, user_id, original_filename, stored_filename, file_path, mime_type, file_size, is_primary, uploaded_at FROM resumes WHERE id = $1',
        [resumeId]
      );
      if (res.rows.length > 0) return res.rows[0];
    } catch (err: any) {
      console.error('Error fetching resume by ID from DB:', err.message);
    }
  }

  return inMemoryResumes.get(resumeId) || null;
}

/**
 * Deletes a resume record by ID, checking ownership
 */
export async function deleteResumeRecord(resumeId: string, userId: string): Promise<boolean> {
  const dbHealth = await testDatabaseConnection();

  if (dbHealth.connected) {
    const res = await pool.query('DELETE FROM resumes WHERE id = $1 AND user_id = $2 RETURNING id', [resumeId, userId]);
    return (res.rowCount || 0) > 0;
  }

  const resume = inMemoryResumes.get(resumeId);
  if (resume && resume.user_id === userId) {
    inMemoryResumes.delete(resumeId);
    return true;
  }

  return false;
}

/**
 * Returns clean resume metadata omitting raw filesystem storage paths
 */
export function sanitizeResume(resume: ResumeRecord): SafeResume {
  const { file_path, stored_filename, ...safeResume } = resume;
  return safeResume;
}
