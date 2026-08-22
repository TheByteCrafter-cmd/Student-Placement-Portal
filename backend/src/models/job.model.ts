import { pool, testDatabaseConnection } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export type VerificationStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type LifecycleStatus = 'ACTIVE' | 'EXPIRED' | 'ARCHIVED';
export type PublicationStatus = 'HIDDEN' | 'PUBLISHED';

export interface JobRecord {
  id: string;
  external_job_id: string | null;
  company_name: string;
  title: string;
  description: string;
  location: string;
  work_mode: 'ON_SITE' | 'REMOTE' | 'HYBRID';
  employment_type: 'FULL_TIME' | 'INTERNSHIP' | 'PART_TIME';
  salary_package: string | null;
  experience_requirement: string | null;
  qualification_requirement: string | null;
  required_skills: string[];
  preferred_skills: string[];
  branch_eligibility: string[];
  cgpa_requirement: number | null;
  backlog_requirement: number | null;
  verification_status: VerificationStatus;
  lifecycle_status: LifecycleStatus;
  publication_status: PublicationStatus;
  source_name: string;
  source_type: string;
  source_url: string;
  apply_url: string;
  posted_at: Date | null;
  closing_at: Date | null;
  discovered_at: Date;
  verified_by: string | null;
  verified_at: Date | null;
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export type PublicSafeJob = Omit<JobRecord, 'verified_by' | 'rejection_reason'>;

const inMemoryJobs: Map<string, JobRecord> = new Map();

/**
 * Initializes the PostgreSQL schema for the jobs table
 */
export async function initJobTable(): Promise<void> {
  const dbHealth = await testDatabaseConnection();
  if (!dbHealth.connected) {
    console.log('ℹ️ PostgreSQL offline: Job store running in-memory fallback mode.');
    seedDefaultInMemoryJobs();
    return;
  }

  const query = `
    CREATE TABLE IF NOT EXISTS jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_job_id VARCHAR(255) NULL,
      company_name VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      location VARCHAR(255) NOT NULL,
      work_mode VARCHAR(50) NOT NULL DEFAULT 'ON_SITE',
      employment_type VARCHAR(50) NOT NULL DEFAULT 'FULL_TIME',
      salary_package VARCHAR(100) NULL,
      experience_requirement VARCHAR(100) NULL,
      qualification_requirement VARCHAR(255) NULL,
      required_skills TEXT[] NOT NULL DEFAULT '{}',
      preferred_skills TEXT[] NOT NULL DEFAULT '{}',
      branch_eligibility TEXT[] NOT NULL DEFAULT '{}',
      cgpa_requirement NUMERIC(4,2) NULL,
      backlog_requirement INTEGER NULL,
      verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (verification_status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED')),
      lifecycle_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (lifecycle_status IN ('ACTIVE', 'EXPIRED', 'ARCHIVED')),
      publication_status VARCHAR(30) NOT NULL DEFAULT 'HIDDEN' CHECK (publication_status IN ('HIDDEN', 'PUBLISHED')),
      source_name VARCHAR(100) NOT NULL,
      source_type VARCHAR(50) NOT NULL DEFAULT 'CONTROLLED_EXTRACTION',
      source_url VARCHAR(500) NOT NULL,
      apply_url VARCHAR(500) NOT NULL,
      posted_at TIMESTAMPTZ NULL,
      closing_at TIMESTAMPTZ NULL,
      discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      verified_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      verified_at TIMESTAMPTZ NULL,
      rejection_reason TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_verification ON jobs(verification_status);
    CREATE INDEX IF NOT EXISTS idx_jobs_lifecycle ON jobs(lifecycle_status);
    CREATE INDEX IF NOT EXISTS idx_jobs_publication ON jobs(publication_status);
    CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_name);
    CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
    CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source_name);
    CREATE INDEX IF NOT EXISTS idx_jobs_discovered ON jobs(discovered_at DESC);
    CREATE INDEX IF NOT EXISTS idx_jobs_posted ON jobs(posted_at DESC);
  `;

  try {
    await pool.query(query);
    console.log('✅ PostgreSQL Schema: `jobs` table verified.');
    await seedDefaultPostgresJobs();
  } catch (err: any) {
    console.error('❌ Failed to initialize PostgreSQL jobs table:', err.message);
  }
}

function getInitialJobs(): Omit<JobRecord, 'id' | 'created_at' | 'updated_at'>[] {
  const now = new Date();
  return [
    {
      external_job_id: 'EXT-JOB-2026-001',
      company_name: 'Nexus Cloud Technologies',
      title: 'Associate Software Development Engineer (SDE-1)',
      description: 'We are seeking passionate fresh graduates for our cloud software engineering team. Responsibilities include building RESTful services, writing unit tests, and optimizing database queries.',
      location: 'Bengaluru / Hyderabad (Hybrid)',
      work_mode: 'HYBRID',
      employment_type: 'FULL_TIME',
      salary_package: '12 - 15 LPA',
      experience_requirement: 'Freshers / 0-1 Years',
      qualification_requirement: 'B.Tech / B.E. / M.Tech in CSE/IT/ECE',
      required_skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'React'],
      preferred_skills: ['Docker', 'AWS', 'Redis'],
      branch_eligibility: ['Computer Science', 'Information Technology', 'Electronics'],
      cgpa_requirement: 7.5,
      backlog_requirement: 0,
      verification_status: 'APPROVED',
      lifecycle_status: 'ACTIVE',
      publication_status: 'PUBLISHED',
      source_name: 'Tech Openings API Connector',
      source_type: 'API',
      source_url: 'https://api.techcareers.example.com/v1/jobs/EXT-JOB-2026-001',
      apply_url: 'https://careers.nexuscloud.example.com/jobs/apply/001',
      posted_at: new Date(now.getTime() - 2 * 3600 * 1000),
      closing_at: new Date(now.getTime() + 14 * 24 * 3600 * 1000),
      discovered_at: now,
      verified_by: null,
      verified_at: now,
      rejection_reason: null,
    },
    {
      external_job_id: 'EXT-JOB-2026-002',
      company_name: 'Apex Data Intelligence',
      title: 'Junior Data Analyst & BI Developer',
      description: 'Join our business intelligence team to transform raw telemetry into actionable executive dashboards. Python, SQL, and PowerBI expertise preferred.',
      location: 'Pune / Remote',
      work_mode: 'REMOTE',
      employment_type: 'FULL_TIME',
      salary_package: '8 - 10 LPA',
      experience_requirement: '0-1 Years',
      qualification_requirement: 'Bachelor Degree in Engineering or Mathematics',
      required_skills: ['Python', 'SQL', 'Data Analytics'],
      preferred_skills: ['PowerBI', 'Pandas', 'Tableau'],
      branch_eligibility: ['Computer Science', 'Information Technology', 'Mathematics'],
      cgpa_requirement: 7.0,
      backlog_requirement: 1,
      verification_status: 'PENDING_REVIEW',
      lifecycle_status: 'ACTIVE',
      publication_status: 'HIDDEN',
      source_name: 'University Placement ATS Portal',
      source_type: 'ATS',
      source_url: 'https://campusats.example.edu/drives/EXT-JOB-2026-002',
      apply_url: 'https://apexdata.example.com/careers/analyst-2026',
      posted_at: new Date(now.getTime() - 5 * 3600 * 1000),
      closing_at: new Date(now.getTime() + 10 * 24 * 3600 * 1000),
      discovered_at: now,
      verified_by: null,
      verified_at: null,
      rejection_reason: null,
    },
    {
      external_job_id: 'EXT-JOB-2026-003',
      company_name: 'Quantum CyberSec Labs',
      title: 'Junior Security Operations Analyst',
      description: 'Perform threat analysis, SOC monitoring, and vulnerability assessments for enterprise customers.',
      location: 'Noida / Gurgaon',
      work_mode: 'ON_SITE',
      employment_type: 'FULL_TIME',
      salary_package: '10 - 12 LPA',
      experience_requirement: 'Freshers',
      qualification_requirement: 'B.Tech / BCA / MCA',
      required_skills: ['Cybersecurity', 'Linux', 'Networking', 'Python'],
      preferred_skills: ['CEH', 'Wireshark'],
      branch_eligibility: ['Computer Science', 'IT', 'Cyber Security'],
      cgpa_requirement: 6.5,
      backlog_requirement: 0,
      verification_status: 'APPROVED',
      lifecycle_status: 'ACTIVE',
      publication_status: 'PUBLISHED',
      source_name: 'Tech Openings API Connector',
      source_type: 'API',
      source_url: 'https://api.techcareers.example.com/v1/jobs/EXT-JOB-2026-003',
      apply_url: 'https://quantumcyber.example.com/apply/soc-freshers',
      posted_at: new Date(now.getTime() - 24 * 3600 * 1000),
      closing_at: new Date(now.getTime() + 7 * 24 * 3600 * 1000),
      discovered_at: now,
      verified_by: null,
      verified_at: new Date(now.getTime() - 12 * 3600 * 1000),
      rejection_reason: null,
    },
  ];
}

function seedDefaultInMemoryJobs() {
  if (inMemoryJobs.size > 0) return;
  const initial = getInitialJobs();
  const now = new Date();
  for (const j of initial) {
    const id = uuidv4();
    inMemoryJobs.set(id, {
      ...j,
      id,
      cgpa_requirement: j.cgpa_requirement !== null ? Number(j.cgpa_requirement) : null,
      created_at: now,
      updated_at: now,
    });
  }
}

async function seedDefaultPostgresJobs() {
  try {
    const checkRes = await pool.query('SELECT COUNT(*) FROM jobs');
    if (parseInt(checkRes.rows[0].count, 10) > 0) return;

    const initial = getInitialJobs();
    for (const j of initial) {
      await pool.query(
        `INSERT INTO jobs (
          external_job_id, company_name, title, description, location, work_mode, employment_type,
          salary_package, experience_requirement, qualification_requirement, required_skills, preferred_skills,
          branch_eligibility, cgpa_requirement, backlog_requirement, verification_status, lifecycle_status,
          publication_status, source_name, source_type, source_url, apply_url, posted_at, closing_at, discovered_at,
          verified_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)`,
        [
          j.external_job_id, j.company_name, j.title, j.description, j.location, j.work_mode, j.employment_type,
          j.salary_package, j.experience_requirement, j.qualification_requirement, j.required_skills, j.preferred_skills,
          j.branch_eligibility, j.cgpa_requirement, j.backlog_requirement, j.verification_status, j.lifecycle_status,
          j.publication_status, j.source_name, j.source_type, j.source_url, j.apply_url, j.posted_at, j.closing_at, j.discovered_at,
          j.verified_at,
        ]
      );
    }
  } catch (err: any) {
    console.warn('Warning: Could not seed default demo jobs:', err.message);
  }
}

/**
 * PUBLIC / STUDENT JOB FEED QUERY
 * STRICT RULE: Returns ONLY APPROVED, PUBLISHED, and ACTIVE jobs.
 * PENDING_REVIEW, REJECTED, HIDDEN, and EXPIRED jobs are NEVER returned.
 */
export async function getPublicJobs(options: {
  page?: number;
  limit?: number;
  search?: string;
  company?: string;
  location?: string;
  workMode?: string;
  employmentType?: string;
  branch?: string;
  sort?: 'latest' | 'oldest' | 'company';
}): Promise<{ jobs: PublicSafeJob[]; total: number }> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;
  const sort = options.sort || 'latest';

  const dbHealth = await testDatabaseConnection();

  if (dbHealth.connected) {
    try {
      // Hardcoded server-side safety condition
      const conditions: string[] = [
        "verification_status = 'APPROVED'",
        "publication_status = 'PUBLISHED'",
        "lifecycle_status = 'ACTIVE'",
      ];
      const values: any[] = [];
      let paramIdx = 1;

      if (options.company) {
        conditions.push(`company_name ILIKE $${paramIdx++}`);
        values.push(`%${options.company.trim()}%`);
      }
      if (options.location) {
        conditions.push(`location ILIKE $${paramIdx++}`);
        values.push(`%${options.location.trim()}%`);
      }
      if (options.workMode) {
        conditions.push(`work_mode = $${paramIdx++}`);
        values.push(options.workMode.trim());
      }
      if (options.employmentType) {
        conditions.push(`employment_type = $${paramIdx++}`);
        values.push(options.employmentType.trim());
      }
      if (options.branch) {
        conditions.push(`$${paramIdx++} = ANY(branch_eligibility)`);
        values.push(options.branch.trim());
      }
      if (options.search) {
        conditions.push(`(title ILIKE $${paramIdx} OR company_name ILIKE $${paramIdx} OR description ILIKE $${paramIdx} OR location ILIKE $${paramIdx})`);
        values.push(`%${options.search.trim()}%`);
        paramIdx++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;
      const countRes = await pool.query(`SELECT COUNT(*) FROM jobs ${whereClause}`, values);
      const total = parseInt(countRes.rows[0].count, 10);

      // Safe ORDER BY mapping (allow-listed)
      let orderBy = 'COALESCE(posted_at, discovered_at) DESC';
      if (sort === 'oldest') orderBy = 'COALESCE(posted_at, discovered_at) ASC';
      if (sort === 'company') orderBy = 'company_name ASC, title ASC';

      values.push(limit, offset);
      const res = await pool.query(
        `SELECT id, external_job_id, company_name, title, description, location, work_mode, employment_type,
                salary_package, experience_requirement, qualification_requirement, required_skills, preferred_skills,
                branch_eligibility, cgpa_requirement::float, backlog_requirement, verification_status, lifecycle_status,
                publication_status, source_name, source_type, source_url, apply_url, posted_at, closing_at, discovered_at,
                created_at, updated_at
         FROM jobs ${whereClause}
         ORDER BY ${orderBy}
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        values
      );

      return { jobs: res.rows, total };
    } catch (err: any) {
      console.error('Error fetching public jobs from DB:', err.message);
    }
  }

  // Fallback in-memory query
  let filtered = Array.from(inMemoryJobs.values()).filter(
    (j) => j.verification_status === 'APPROVED' && j.publication_status === 'PUBLISHED' && j.lifecycle_status === 'ACTIVE'
  );

  if (options.company) {
    filtered = filtered.filter((j) => j.company_name.toLowerCase().includes(options.company!.toLowerCase()));
  }
  if (options.location) {
    filtered = filtered.filter((j) => j.location.toLowerCase().includes(options.location!.toLowerCase()));
  }
  if (options.workMode) {
    filtered = filtered.filter((j) => j.work_mode === options.workMode);
  }
  if (options.employmentType) {
    filtered = filtered.filter((j) => j.employment_type === options.employmentType);
  }
  if (options.search) {
    const q = options.search.toLowerCase();
    filtered = filtered.filter(
      (j) => j.title.toLowerCase().includes(q) || j.company_name.toLowerCase().includes(q) || j.description.toLowerCase().includes(q) || j.location.toLowerCase().includes(q)
    );
  }

  // Sorting
  if (sort === 'oldest') {
    filtered.sort((a, b) => (a.posted_at || a.discovered_at).getTime() - (b.posted_at || b.discovered_at).getTime());
  } else if (sort === 'company') {
    filtered.sort((a, b) => a.company_name.localeCompare(b.company_name));
  } else {
    filtered.sort((a, b) => (b.posted_at || b.discovered_at).getTime() - (a.posted_at || a.discovered_at).getTime());
  }

  const total = filtered.length;
  const jobs = filtered.slice(offset, offset + limit).map(sanitizePublicJob);
  return { jobs, total };
}

/**
 * PUBLIC / STUDENT SINGLE JOB QUERY BY ID
 * STRICT RULE: Returns job ONLY if APPROVED and PUBLISHED.
 */
export async function getPublicJobById(jobId: string): Promise<PublicSafeJob | null> {
  const dbHealth = await testDatabaseConnection();

  if (dbHealth.connected) {
    try {
      const res = await pool.query(
        `SELECT id, external_job_id, company_name, title, description, location, work_mode, employment_type,
                salary_package, experience_requirement, qualification_requirement, required_skills, preferred_skills,
                branch_eligibility, cgpa_requirement::float, backlog_requirement, verification_status, lifecycle_status,
                publication_status, source_name, source_type, source_url, apply_url, posted_at, closing_at, discovered_at,
                created_at, updated_at
         FROM jobs
         WHERE id = $1 AND verification_status = 'APPROVED' AND publication_status = 'PUBLISHED' AND lifecycle_status = 'ACTIVE'`,
        [jobId]
      );
      if (res.rows.length > 0) return res.rows[0];
    } catch (err: any) {
      console.error('Error querying public job by ID from DB:', err.message);
    }
  }

  const j = inMemoryJobs.get(jobId);
  if (j && j.verification_status === 'APPROVED' && j.publication_status === 'PUBLISHED' && j.lifecycle_status === 'ACTIVE') {
    return sanitizePublicJob(j);
  }
  return null;
}

/**
 * ADMIN QUERY FOR ALL JOBS
 */
export async function getJobs(options: {
  page?: number;
  limit?: number;
  verificationStatus?: VerificationStatus;
  lifecycleStatus?: LifecycleStatus;
  search?: string;
  company?: string;
  location?: string;
  sourceName?: string;
}): Promise<{ jobs: JobRecord[]; total: number }> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;

  const dbHealth = await testDatabaseConnection();

  if (dbHealth.connected) {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      if (options.verificationStatus) {
        conditions.push(`verification_status = $${paramIdx++}`);
        values.push(options.verificationStatus);
      }
      if (options.lifecycleStatus) {
        conditions.push(`lifecycle_status = $${paramIdx++}`);
        values.push(options.lifecycleStatus);
      }
      if (options.company) {
        conditions.push(`company_name ILIKE $${paramIdx++}`);
        values.push(`%${options.company.trim()}%`);
      }
      if (options.location) {
        conditions.push(`location ILIKE $${paramIdx++}`);
        values.push(`%${options.location.trim()}%`);
      }
      if (options.sourceName) {
        conditions.push(`source_name ILIKE $${paramIdx++}`);
        values.push(`%${options.sourceName.trim()}%`);
      }
      if (options.search) {
        conditions.push(`(title ILIKE $${paramIdx} OR company_name ILIKE $${paramIdx} OR location ILIKE $${paramIdx})`);
        values.push(`%${options.search.trim()}%`);
        paramIdx++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countRes = await pool.query(`SELECT COUNT(*) FROM jobs ${whereClause}`, values);
      const total = parseInt(countRes.rows[0].count, 10);

      values.push(limit, offset);
      const res = await pool.query(
        `SELECT id, external_job_id, company_name, title, description, location, work_mode, employment_type,
                salary_package, experience_requirement, qualification_requirement, required_skills, preferred_skills,
                branch_eligibility, cgpa_requirement::float, backlog_requirement, verification_status, lifecycle_status,
                publication_status, source_name, source_type, source_url, apply_url, posted_at, closing_at,
                discovered_at, verified_by, verified_at, rejection_reason, created_at, updated_at
         FROM jobs ${whereClause}
         ORDER BY discovered_at DESC
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        values
      );

      return { jobs: res.rows, total };
    } catch (err: any) {
      console.error('Error fetching jobs from DB:', err.message);
    }
  }

  let filtered = Array.from(inMemoryJobs.values());
  if (options.verificationStatus) {
    filtered = filtered.filter((j) => j.verification_status === options.verificationStatus);
  }
  if (options.lifecycleStatus) {
    filtered = filtered.filter((j) => j.lifecycle_status === options.lifecycleStatus);
  }
  if (options.company) {
    filtered = filtered.filter((j) => j.company_name.toLowerCase().includes(options.company!.toLowerCase()));
  }
  if (options.location) {
    filtered = filtered.filter((j) => j.location.toLowerCase().includes(options.location!.toLowerCase()));
  }
  if (options.sourceName) {
    filtered = filtered.filter((j) => j.source_name.toLowerCase().includes(options.sourceName!.toLowerCase()));
  }
  if (options.search) {
    const q = options.search.toLowerCase();
    filtered = filtered.filter(
      (j) => j.title.toLowerCase().includes(q) || j.company_name.toLowerCase().includes(q) || j.location.toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const jobs = filtered.sort((a, b) => b.discovered_at.getTime() - a.discovered_at.getTime()).slice(offset, offset + limit);
  return { jobs, total };
}

/**
 * Gets job by ID (Admin inspect)
 */
export async function getJobById(jobId: string): Promise<JobRecord | null> {
  const dbHealth = await testDatabaseConnection();

  if (dbHealth.connected) {
    try {
      const res = await pool.query(
        `SELECT id, external_job_id, company_name, title, description, location, work_mode, employment_type,
                salary_package, experience_requirement, qualification_requirement, required_skills, preferred_skills,
                branch_eligibility, cgpa_requirement::float, backlog_requirement, verification_status, lifecycle_status,
                publication_status, source_name, source_type, source_url, apply_url, posted_at, closing_at,
                discovered_at, verified_by, verified_at, rejection_reason, created_at, updated_at
         FROM jobs WHERE id = $1`,
        [jobId]
      );
      if (res.rows.length > 0) return res.rows[0];
    } catch (err: any) {
      console.error('Error querying job by ID from DB:', err.message);
    }
  }

  return inMemoryJobs.get(jobId) || null;
}

/**
 * Approves a pending job
 */
export async function approveJob(jobId: string, adminUserId: string): Promise<JobRecord | null> {
  const dbHealth = await testDatabaseConnection();
  const now = new Date();

  if (dbHealth.connected) {
    const res = await pool.query(
      `UPDATE jobs SET
        verification_status = 'APPROVED',
        publication_status = 'PUBLISHED',
        verified_by = $1,
        verified_at = $2,
        rejection_reason = NULL,
        updated_at = NOW()
       WHERE id = $3 AND verification_status = 'PENDING_REVIEW'
       RETURNING *`,
      [adminUserId, now, jobId]
    );
    return res.rows[0] || null;
  }

  const j = inMemoryJobs.get(jobId);
  if (j && j.verification_status === 'PENDING_REVIEW') {
    j.verification_status = 'APPROVED';
    j.publication_status = 'PUBLISHED';
    j.verified_by = adminUserId;
    j.verified_at = now;
    j.rejection_reason = null;
    j.updated_at = now;
    return j;
  }
  return null;
}

/**
 * Rejects a pending job with mandatory rejection reason
 */
export async function rejectJob(jobId: string, adminUserId: string, reason: string): Promise<JobRecord | null> {
  const dbHealth = await testDatabaseConnection();
  const now = new Date();

  if (dbHealth.connected) {
    const res = await pool.query(
      `UPDATE jobs SET
        verification_status = 'REJECTED',
        publication_status = 'HIDDEN',
        verified_by = $1,
        verified_at = $2,
        rejection_reason = $3,
        updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [adminUserId, now, reason.trim(), jobId]
    );
    return res.rows[0] || null;
  }

  const j = inMemoryJobs.get(jobId);
  if (j) {
    j.verification_status = 'REJECTED';
    j.publication_status = 'HIDDEN';
    j.verified_by = adminUserId;
    j.verified_at = now;
    j.rejection_reason = reason.trim();
    j.updated_at = now;
    return j;
  }
  return null;
}

/**
 * Controlled edit of normalized job fields (Protects immutable source identity fields)
 */
export async function updateNormalizedJob(
  jobId: string,
  editableFields: Partial<{
    title: string;
    company_name: string;
    description: string;
    location: string;
    work_mode: 'ON_SITE' | 'REMOTE' | 'HYBRID';
    employment_type: 'FULL_TIME' | 'INTERNSHIP' | 'PART_TIME';
    salary_package: string;
    experience_requirement: string;
    qualification_requirement: string;
    required_skills: string[];
    preferred_skills: string[];
    branch_eligibility: string[];
    cgpa_requirement: number | null;
    backlog_requirement: number | null;
  }>
): Promise<JobRecord | null> {
  const dbHealth = await testDatabaseConnection();
  const existing = await getJobById(jobId);
  if (!existing) return null;

  const updated: JobRecord = {
    ...existing,
    title: editableFields.title !== undefined ? editableFields.title.trim() : existing.title,
    company_name: editableFields.company_name !== undefined ? editableFields.company_name.trim() : existing.company_name,
    description: editableFields.description !== undefined ? editableFields.description.trim() : existing.description,
    location: editableFields.location !== undefined ? editableFields.location.trim() : existing.location,
    work_mode: editableFields.work_mode || existing.work_mode,
    employment_type: editableFields.employment_type || existing.employment_type,
    salary_package: editableFields.salary_package !== undefined ? editableFields.salary_package : existing.salary_package,
    experience_requirement: editableFields.experience_requirement !== undefined ? editableFields.experience_requirement : existing.experience_requirement,
    qualification_requirement: editableFields.qualification_requirement !== undefined ? editableFields.qualification_requirement : existing.qualification_requirement,
    required_skills: Array.isArray(editableFields.required_skills) ? editableFields.required_skills : existing.required_skills,
    preferred_skills: Array.isArray(editableFields.preferred_skills) ? editableFields.preferred_skills : existing.preferred_skills,
    branch_eligibility: Array.isArray(editableFields.branch_eligibility) ? editableFields.branch_eligibility : existing.branch_eligibility,
    cgpa_requirement: editableFields.cgpa_requirement !== undefined ? editableFields.cgpa_requirement : existing.cgpa_requirement,
    backlog_requirement: editableFields.backlog_requirement !== undefined ? editableFields.backlog_requirement : existing.backlog_requirement,
    updated_at: new Date(),
  };

  if (dbHealth.connected) {
    const res = await pool.query(
      `UPDATE jobs SET
        title = $1, company_name = $2, description = $3, location = $4, work_mode = $5,
        employment_type = $6, salary_package = $7, experience_requirement = $8, qualification_requirement = $9,
        required_skills = $10, preferred_skills = $11, branch_eligibility = $12, cgpa_requirement = $13,
        backlog_requirement = $14, updated_at = NOW()
       WHERE id = $15
       RETURNING *`,
      [
        updated.title, updated.company_name, updated.description, updated.location, updated.work_mode,
        updated.employment_type, updated.salary_package, updated.experience_requirement, updated.qualification_requirement,
        updated.required_skills, updated.preferred_skills, updated.branch_eligibility, updated.cgpa_requirement,
        updated.backlog_requirement, jobId,
      ]
    );
    return res.rows[0] || null;
  }

  inMemoryJobs.set(jobId, updated);
  return updated;
}

/**
 * Strips internal admin moderation fields (verified_by, rejection_reason) for public student output
 */
export function sanitizePublicJob(job: JobRecord): PublicSafeJob {
  const { verified_by, rejection_reason, ...safeJob } = job;
  return safeJob;
}
