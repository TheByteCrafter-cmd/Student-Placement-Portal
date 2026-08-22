import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { pool, testDatabaseConnection } from '../config/db';
import { getStudentByUserId } from '../models/student.model';
import { getResumesByUserId, sanitizeResume } from '../models/resume.model';
import { updateUserStatus, findUserById } from '../models/user.model';
import {
  getJobs,
  getJobById,
  approveJob,
  rejectJob,
  updateNormalizedJob,
  VerificationStatus,
} from '../models/job.model';
import { getJobSources, toggleJobSourceStatus } from '../models/source.model';
import { createAuditLog, getAuditLogs } from '../models/audit.model';

const router = Router();

// Apply requireAuth & requireRole('ADMIN') to ALL admin routes
router.use(requireAuth, requireRole('ADMIN'));

/**
 * GET /api/admin/dashboard
 * Database-backed high-level operational statistics
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const dbHealth = await testDatabaseConnection();

    let studentStats = { total: 0, active: 0, inactive: 0 };
    let jobStats = { pending: 0, approved: 0, rejected: 0, expired: 0 };
    let sourceStats = { total: 0, enabled: 0, disabled: 0 };

    if (dbHealth.connected) {
      // Student Counts
      const studRes = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = true) as active,
          COUNT(*) FILTER (WHERE is_active = false) as inactive
        FROM users WHERE role = 'STUDENT'
      `);
      if (studRes.rows.length > 0) {
        studentStats = {
          total: parseInt(studRes.rows[0].total, 10),
          active: parseInt(studRes.rows[0].active, 10),
          inactive: parseInt(studRes.rows[0].inactive, 10),
        };
      }

      // Job Counts
      const jobRes = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE verification_status = 'PENDING_REVIEW') as pending,
          COUNT(*) FILTER (WHERE verification_status = 'APPROVED') as approved,
          COUNT(*) FILTER (WHERE verification_status = 'REJECTED') as rejected,
          COUNT(*) FILTER (WHERE lifecycle_status = 'EXPIRED') as expired
        FROM jobs
      `);
      if (jobRes.rows.length > 0) {
        jobStats = {
          pending: parseInt(jobRes.rows[0].pending, 10),
          approved: parseInt(jobRes.rows[0].approved, 10),
          rejected: parseInt(jobRes.rows[0].rejected, 10),
          expired: parseInt(jobRes.rows[0].expired, 10),
        };
      }

      // Source Counts
      const srcRes = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_enabled = true) as enabled,
          COUNT(*) FILTER (WHERE is_enabled = false) as disabled
        FROM job_sources
      `);
      if (srcRes.rows.length > 0) {
        sourceStats = {
          total: parseInt(srcRes.rows[0].total, 10),
          enabled: parseInt(srcRes.rows[0].enabled, 10),
          disabled: parseInt(srcRes.rows[0].disabled, 10),
        };
      }
    } else {
      // Offline in-memory counts fallback
      const allJobs = await getJobs({ limit: 1000 });
      jobStats = {
        pending: allJobs.jobs.filter((j) => j.verification_status === 'PENDING_REVIEW').length,
        approved: allJobs.jobs.filter((j) => j.verification_status === 'APPROVED').length,
        rejected: allJobs.jobs.filter((j) => j.verification_status === 'REJECTED').length,
        expired: allJobs.jobs.filter((j) => j.lifecycle_status === 'EXPIRED').length,
      };

      const sources = await getJobSources();
      sourceStats = {
        total: sources.length,
        enabled: sources.filter((s) => s.is_enabled).length,
        disabled: sources.filter((s) => !s.is_enabled).length,
      };
    }

    const { logs: recentActivity } = await getAuditLogs({ limit: 10 });

    return res.status(200).json({
      success: true,
      data: {
        students: studentStats,
        jobs: jobStats,
        sources: sourceStats,
        recent_activity: recentActivity,
      },
    });
  } catch (err: any) {
    console.error('Error fetching admin dashboard statistics:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch dashboard metrics.' },
    });
  }
});

/**
 * GET /api/admin/students
 * Paginated student list with search & status filters
 */
router.get('/students', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search ? (req.query.search as string).trim() : '';
    const statusFilter = req.query.status as string; // 'active', 'inactive'
    const branchFilter = req.query.branch as string;
    const yearFilter = req.query.graduation_year ? parseInt(req.query.graduation_year as string, 10) : null;

    const dbHealth = await testDatabaseConnection();

    if (dbHealth.connected) {
      const conditions: string[] = ["u.role = 'STUDENT'"];
      const values: any[] = [];
      let paramIdx = 1;

      if (statusFilter === 'active') {
        conditions.push(`u.is_active = true`);
      } else if (statusFilter === 'inactive') {
        conditions.push(`u.is_active = false`);
      }

      if (branchFilter) {
        conditions.push(`s.branch ILIKE $${paramIdx++}`);
        values.push(`%${branchFilter.trim()}%`);
      }

      if (yearFilter) {
        conditions.push(`s.graduation_year = $${paramIdx++}`);
        values.push(yearFilter);
      }

      if (search) {
        conditions.push(`(u.email ILIKE $${paramIdx} OR s.first_name ILIKE $${paramIdx} OR s.last_name ILIKE $${paramIdx} OR s.roll_number ILIKE $${paramIdx})`);
        values.push(`%${search}%`);
        paramIdx++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;
      const countRes = await pool.query(
        `SELECT COUNT(*) FROM users u LEFT JOIN students s ON u.id = s.user_id ${whereClause}`,
        values
      );
      const total = parseInt(countRes.rows[0].count, 10);

      values.push(limit, offset);
      const resQuery = await pool.query(
        `SELECT u.id as user_id, u.email, u.is_active, u.created_at as registered_at, u.last_login_at,
                s.id as student_id, s.first_name, s.last_name, s.roll_number, s.degree, s.branch,
                s.graduation_year, s.cgpa::float, s.active_backlogs, s.phone_number
         FROM users u
         LEFT JOIN students s ON u.id = s.user_id
         ${whereClause}
         ORDER BY u.created_at DESC
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        values
      );

      return res.status(200).json({
        success: true,
        data: {
          students: resQuery.rows,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        students: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      },
    });
  } catch (err: any) {
    console.error('Error listing students for admin:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list students.' },
    });
  }
});

/**
 * GET /api/admin/students/:id
 * Detailed student inspection endpoint
 */
router.get('/students/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await findUserById(userId);

    if (!user || user.role !== 'STUDENT') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Student account not found.' },
      });
    }

    const profile = await getStudentByUserId(userId);
    const resumes = await getResumesByUserId(userId);
    const safeResumes = resumes.map(sanitizeResume);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
          last_login_at: user.last_login_at,
          created_at: user.created_at,
        },
        profile,
        resumes: safeResumes,
      },
    });
  } catch (err: any) {
    console.error('Error fetching student detail for admin:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch student details.' },
    });
  }
});

/**
 * PATCH /api/admin/students/:id/status
 * Activate or Deactivate student account
 */
router.patch('/students/:id/status', async (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'is_active boolean property required.' },
      });
    }

    const targetUser = await findUserById(targetUserId);
    if (!targetUser || targetUser.role !== 'STUDENT') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Student account not found.' },
      });
    }

    const updatedUser = await updateUserStatus(targetUserId, is_active);
    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'Failed to update student account status.' },
      });
    }

    // Append Audit Log
    const action = is_active ? 'STUDENT_ACTIVATED' : 'STUDENT_DEACTIVATED';
    await createAuditLog({
      actorUserId: req.user!.id,
      action,
      entityType: 'STUDENT',
      entityId: targetUserId,
      metadata: { target_email: targetUser.email, is_active },
    });

    console.log(`🛡️ Admin ${req.user!.email} updated Student ${targetUser.email} status to is_active=${is_active}`);

    return res.status(200).json({
      success: true,
      message: `Student account ${is_active ? 'activated' : 'deactivated'} successfully.`,
      data: {
        student: {
          id: updatedUser.id,
          email: updatedUser.email,
          is_active: updatedUser.is_active,
        },
      },
    });
  } catch (err: any) {
    console.error('Error updating student status:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update student status.' },
    });
  }
});

/**
 * GET /api/admin/jobs/pending
 * Verification Queue of jobs awaiting admin verification
 */
router.get('/jobs/pending', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const search = req.query.search as string;
    const company = req.query.company as string;
    const location = req.query.location as string;

    const result = await getJobs({
      page,
      limit,
      verificationStatus: 'PENDING_REVIEW',
      search,
      company,
      location,
    });

    return res.status(200).json({
      success: true,
      data: {
        jobs: result.jobs,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit),
        },
      },
    });
  } catch (err: any) {
    console.error('Error fetching pending jobs queue:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch pending jobs queue.' },
    });
  }
});

/**
 * GET /api/admin/jobs
 * Query jobs filterable by verification status
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const verificationStatus = req.query.status as VerificationStatus;
    const search = req.query.search as string;

    const result = await getJobs({
      page,
      limit,
      verificationStatus,
      search,
    });

    return res.status(200).json({
      success: true,
      data: {
        jobs: result.jobs,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit),
        },
      },
    });
  } catch (err: any) {
    console.error('Error fetching jobs for admin:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list jobs.' },
    });
  }
});

/**
 * GET /api/admin/jobs/:id
 * Single job details for admin inspection
 */
router.get('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const job = await getJobById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job posting not found.' },
      });
    }

    return res.status(200).json({
      success: true,
      data: { job },
    });
  } catch (err: any) {
    console.error('Error fetching job details for admin:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch job details.' },
    });
  }
});

/**
 * PATCH /api/admin/jobs/:id/approve
 * Approves a pending job and sets publication status to PUBLISHED
 */
router.patch('/jobs/:id/approve', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const adminUserId = req.user!.id;

    const approvedJob = await approveJob(jobId, adminUserId);
    if (!approvedJob) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Job not found or not in PENDING_REVIEW state.' },
      });
    }

    // Append Audit Log
    await createAuditLog({
      actorUserId: adminUserId,
      action: 'JOB_APPROVED',
      entityType: 'JOB',
      entityId: jobId,
      metadata: { title: approvedJob.title, company: approvedJob.company_name },
    });

    console.log(`✅ Admin ${req.user!.email} approved Job ${approvedJob.title} (${approvedJob.company_name})`);

    return res.status(200).json({
      success: true,
      message: 'Job opening approved and published successfully.',
      data: { job: approvedJob },
    });
  } catch (err: any) {
    console.error('Error approving job:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to approve job.' },
    });
  }
});

/**
 * PATCH /api/admin/jobs/:id/reject
 * Rejects a job opening with mandatory rejection reason
 */
router.patch('/jobs/:id/reject', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const adminUserId = req.user!.id;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'A rejection reason is required.' },
      });
    }

    const rejectedJob = await rejectJob(jobId, adminUserId, reason);
    if (!rejectedJob) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job not found.' },
      });
    }

    // Append Audit Log
    await createAuditLog({
      actorUserId: adminUserId,
      action: 'JOB_REJECTED',
      entityType: 'JOB',
      entityId: jobId,
      metadata: { title: rejectedJob.title, company: rejectedJob.company_name, reason: reason.trim() },
    });

    console.log(`🚫 Admin ${req.user!.email} rejected Job ${rejectedJob.title} (${rejectedJob.company_name})`);

    return res.status(200).json({
      success: true,
      message: 'Job opening rejected successfully.',
      data: { job: rejectedJob },
    });
  } catch (err: any) {
    console.error('Error rejecting job:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to reject job.' },
    });
  }
});

/**
 * PATCH /api/admin/jobs/:id
 * Controlled editing of normalized job fields (Protects immutable source identity fields)
 */
router.patch('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const adminUserId = req.user!.id;

    // Explicit allow-list of editable fields
    const {
      title,
      company_name,
      description,
      location,
      work_mode,
      employment_type,
      salary_package,
      experience_requirement,
      qualification_requirement,
      required_skills,
      preferred_skills,
      branch_eligibility,
      cgpa_requirement,
      backlog_requirement,
    } = req.body;

    const updatedJob = await updateNormalizedJob(jobId, {
      title,
      company_name,
      description,
      location,
      work_mode,
      employment_type,
      salary_package,
      experience_requirement,
      qualification_requirement,
      required_skills,
      preferred_skills,
      branch_eligibility,
      cgpa_requirement,
      backlog_requirement,
    });

    if (!updatedJob) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job not found.' },
      });
    }

    // Append Audit Log
    await createAuditLog({
      actorUserId: adminUserId,
      action: 'JOB_EDITED',
      entityType: 'JOB',
      entityId: jobId,
      metadata: { title: updatedJob.title, company: updatedJob.company_name },
    });

    return res.status(200).json({
      success: true,
      message: 'Normalized job fields updated successfully.',
      data: { job: updatedJob },
    });
  } catch (err: any) {
    console.error('Error editing normalized job fields:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to edit job.' },
    });
  }
});

/**
 * GET /api/admin/sources
 * Lists configured job sources
 */
router.get('/sources', async (req: Request, res: Response) => {
  try {
    const sources = await getJobSources();
    return res.status(200).json({
      success: true,
      data: { sources },
    });
  } catch (err: any) {
    console.error('Error listing job sources:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list job sources.' },
    });
  }
});

/**
 * PATCH /api/admin/sources/:id/status
 * Enable or Disable job source
 */
router.patch('/sources/:id/status', async (req: Request, res: Response) => {
  try {
    const sourceId = req.params.id;
    const { is_enabled } = req.body;

    if (typeof is_enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'is_enabled boolean required.' },
      });
    }

    const updatedSource = await toggleJobSourceStatus(sourceId, is_enabled);
    if (!updatedSource) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job source not found.' },
      });
    }

    // Append Audit Log
    await createAuditLog({
      actorUserId: req.user!.id,
      action: 'SOURCE_STATUS_CHANGED',
      entityType: 'SOURCE',
      entityId: sourceId,
      metadata: { name: updatedSource.name, is_enabled },
    });

    return res.status(200).json({
      success: true,
      message: `Job source ${is_enabled ? 'enabled' : 'disabled'} successfully.`,
      data: { source: updatedSource },
    });
  } catch (err: any) {
    console.error('Error toggling job source status:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to toggle job source status.' },
    });
  }
});

/**
 * GET /api/admin/audit-logs
 * Paginated append-only audit trail logs
 */
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const action = req.query.action as string;
    const entityType = req.query.entity_type as string;

    const result = await getAuditLogs({ page, limit, action, entityType });

    return res.status(200).json({
      success: true,
      data: {
        logs: result.logs,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit),
        },
      },
    });
  } catch (err: any) {
    console.error('Error fetching audit logs:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch audit logs.' },
    });
  }
});

export default router;
