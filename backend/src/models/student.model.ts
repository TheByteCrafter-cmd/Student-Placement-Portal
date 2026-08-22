import { pool, testDatabaseConnection } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export interface StudentProfileRecord {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  roll_number: string;
  degree: string;
  branch: string;
  graduation_year: number;
  cgpa: number;
  active_backlogs: number;
  skills: string[];
  phone_number: string | null;
  tenth_percentage: number | null;
  twelfth_percentage: number | null;
  diploma_percentage: number | null;
  github_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export type StudentProfileInput = Omit<StudentProfileRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

const inMemoryStudents: Map<string, StudentProfileRecord> = new Map(); // key = user_id

/**
 * Initializes the PostgreSQL schema for the students table with additive migrations
 */
export async function initStudentTable(): Promise<void> {
  const dbHealth = await testDatabaseConnection();
  if (!dbHealth.connected) {
    console.log('ℹ️ PostgreSQL offline: Student profile store running in-memory fallback mode.');
    return;
  }

  const query = `
    CREATE TABLE IF NOT EXISTS students (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      roll_number VARCHAR(50) UNIQUE NOT NULL,
      degree VARCHAR(100) NOT NULL,
      branch VARCHAR(100) NOT NULL,
      graduation_year INTEGER NOT NULL,
      cgpa NUMERIC(4,2) NOT NULL CHECK (cgpa >= 0.00 AND cgpa <= 10.00),
      active_backlogs INTEGER NOT NULL DEFAULT 0 CHECK (active_backlogs >= 0),
      skills TEXT[] NOT NULL DEFAULT '{}',
      phone_number VARCHAR(20) NULL,
      tenth_percentage NUMERIC(5,2) NULL CHECK (tenth_percentage IS NULL OR (tenth_percentage >= 0.00 AND tenth_percentage <= 100.00)),
      twelfth_percentage NUMERIC(5,2) NULL CHECK (twelfth_percentage IS NULL OR (twelfth_percentage >= 0.00 AND twelfth_percentage <= 100.00)),
      diploma_percentage NUMERIC(5,2) NULL CHECK (diploma_percentage IS NULL OR (diploma_percentage >= 0.00 AND diploma_percentage <= 100.00)),
      github_url VARCHAR(500) NULL,
      linkedin_url VARCHAR(500) NULL,
      portfolio_url VARCHAR(500) NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Additive Column Migrations for Existing Tables
    ALTER TABLE students ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) NULL;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS tenth_percentage NUMERIC(5,2) NULL;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS twelfth_percentage NUMERIC(5,2) NULL;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS diploma_percentage NUMERIC(5,2) NULL;

    CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
    CREATE INDEX IF NOT EXISTS idx_students_cgpa ON students(cgpa);
    CREATE INDEX IF NOT EXISTS idx_students_graduation ON students(graduation_year);
  `;

  try {
    await pool.query(query);
    console.log('✅ PostgreSQL Schema: `students` table & placement fields verified.');
  } catch (err: any) {
    console.error('❌ Failed to initialize PostgreSQL students table:', err.message);
  }
}

/**
 * Retrieves student profile by associated user_id
 */
export async function getStudentByUserId(userId: string): Promise<StudentProfileRecord | null> {
  const dbHealth = await testDatabaseConnection();

  if (dbHealth.connected) {
    try {
      const res = await pool.query(
        `SELECT id, user_id, first_name, last_name, roll_number, degree, branch, graduation_year,
                cgpa::float, active_backlogs, skills, phone_number,
                tenth_percentage::float, twelfth_percentage::float, diploma_percentage::float,
                github_url, linkedin_url, portfolio_url, created_at, updated_at
         FROM students WHERE user_id = $1`,
        [userId]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          ...row,
          skills: row.skills || [],
        };
      }
    } catch (err: any) {
      console.error('Error querying student profile from DB:', err.message);
    }
  }

  return inMemoryStudents.get(userId) || null;
}

/**
 * Creates or updates a student profile (Upsert)
 */
export async function upsertStudentProfile(
  userId: string,
  data: StudentProfileInput
): Promise<StudentProfileRecord> {
  const dbHealth = await testDatabaseConnection();
  const now = new Date();
  const cleanSkills = Array.isArray(data.skills) ? data.skills.map((s) => s.trim()).filter(Boolean) : [];

  if (dbHealth.connected) {
    const query = `
      INSERT INTO students (
        user_id, first_name, last_name, roll_number, degree, branch,
        graduation_year, cgpa, active_backlogs, skills, phone_number,
        tenth_percentage, twelfth_percentage, diploma_percentage,
        github_url, linkedin_url, portfolio_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (user_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        roll_number = EXCLUDED.roll_number,
        degree = EXCLUDED.degree,
        branch = EXCLUDED.branch,
        graduation_year = EXCLUDED.graduation_year,
        cgpa = EXCLUDED.cgpa,
        active_backlogs = EXCLUDED.active_backlogs,
        skills = EXCLUDED.skills,
        phone_number = EXCLUDED.phone_number,
        tenth_percentage = EXCLUDED.tenth_percentage,
        twelfth_percentage = EXCLUDED.twelfth_percentage,
        diploma_percentage = EXCLUDED.diploma_percentage,
        github_url = EXCLUDED.github_url,
        linkedin_url = EXCLUDED.linkedin_url,
        portfolio_url = EXCLUDED.portfolio_url,
        updated_at = NOW()
      RETURNING id, user_id, first_name, last_name, roll_number, degree, branch, graduation_year,
                cgpa::float, active_backlogs, skills, phone_number,
                tenth_percentage::float, twelfth_percentage::float, diploma_percentage::float,
                github_url, linkedin_url, portfolio_url, created_at, updated_at;
    `;

    const res = await pool.query(query, [
      userId,
      data.first_name.trim(),
      data.last_name.trim(),
      data.roll_number.trim(),
      data.degree.trim(),
      data.branch.trim(),
      data.graduation_year,
      data.cgpa,
      data.active_backlogs,
      cleanSkills,
      data.phone_number ? data.phone_number.trim() : null,
      data.tenth_percentage !== null && data.tenth_percentage !== undefined ? data.tenth_percentage : null,
      data.twelfth_percentage !== null && data.twelfth_percentage !== undefined ? data.twelfth_percentage : null,
      data.diploma_percentage !== null && data.diploma_percentage !== undefined ? data.diploma_percentage : null,
      data.github_url ? data.github_url.trim() : null,
      data.linkedin_url ? data.linkedin_url.trim() : null,
      data.portfolio_url ? data.portfolio_url.trim() : null,
    ]);

    return res.rows[0];
  }

  // In-memory fallback
  const existing = inMemoryStudents.get(userId);
  const updatedRecord: StudentProfileRecord = {
    id: existing ? existing.id : uuidv4(),
    user_id: userId,
    first_name: data.first_name.trim(),
    last_name: data.last_name.trim(),
    roll_number: data.roll_number.trim(),
    degree: data.degree.trim(),
    branch: data.branch.trim(),
    graduation_year: data.graduation_year,
    cgpa: Number(data.cgpa),
    active_backlogs: Number(data.active_backlogs),
    skills: cleanSkills,
    phone_number: data.phone_number ? data.phone_number.trim() : null,
    tenth_percentage: data.tenth_percentage !== null && data.tenth_percentage !== undefined ? Number(data.tenth_percentage) : null,
    twelfth_percentage: data.twelfth_percentage !== null && data.twelfth_percentage !== undefined ? Number(data.twelfth_percentage) : null,
    diploma_percentage: data.diploma_percentage !== null && data.diploma_percentage !== undefined ? Number(data.diploma_percentage) : null,
    github_url: data.github_url ? data.github_url.trim() : null,
    linkedin_url: data.linkedin_url ? data.linkedin_url.trim() : null,
    portfolio_url: data.portfolio_url ? data.portfolio_url.trim() : null,
    created_at: existing ? existing.created_at : now,
    updated_at: now,
  };

  inMemoryStudents.set(userId, updatedRecord);
  return updatedRecord;
}

/**
 * Deterministic Server-Authoritative Profile Completion Score Calculation
 * Weights:
 * - Personal Information (20%): first_name (6%), last_name (6%), phone_number (8%)
 * - Academic Information (35%): roll_number (7%), degree (7%), branch (7%), graduation_year (7%), cgpa (7%)
 * - Skills (20%): at least 1 skill (20%)
 * - Professional Links (10%): at least 1 valid link (10%)
 * - Resume (15%): at least 1 uploaded resume (15%)
 */
export function calculateProfileCompletion(
  profile: StudentProfileRecord | null,
  hasResume: boolean
): number {
  if (!profile) return 0;

  let score = 0;

  // Personal Info (20%)
  if (profile.first_name && profile.first_name.trim().length > 0) score += 6;
  if (profile.last_name && profile.last_name.trim().length > 0) score += 6;
  if (profile.phone_number && profile.phone_number.trim().length >= 7) score += 8;

  // Academic Info (35%)
  if (profile.roll_number && profile.roll_number.trim().length > 0) score += 7;
  if (profile.degree && profile.degree.trim().length > 0) score += 7;
  if (profile.branch && profile.branch.trim().length > 0) score += 7;
  if (profile.graduation_year && profile.graduation_year >= 1990) score += 7;
  if (profile.cgpa !== undefined && profile.cgpa >= 0.0) score += 7;

  // Skills (20%)
  if (Array.isArray(profile.skills) && profile.skills.length > 0) score += 20;

  // Professional Links (10%)
  const hasLink =
    (profile.github_url && profile.github_url.trim().length > 0) ||
    (profile.linkedin_url && profile.linkedin_url.trim().length > 0) ||
    (profile.portfolio_url && profile.portfolio_url.trim().length > 0);
  if (hasLink) score += 10;

  // Resume (15%)
  if (hasResume) score += 15;

  return Math.min(100, score);
}
