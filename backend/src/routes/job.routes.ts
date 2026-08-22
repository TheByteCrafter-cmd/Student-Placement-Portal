import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { getPublicJobs, getPublicJobById } from '../models/job.model';
import { isValidHttpUrl } from '../utils/file.utils';

const router = Router();

/**
 * GET /api/jobs
 * Public / Student Endpoint for Approved & Published Job Feed
 * STRICT RULE: Returns ONLY APPROVED, PUBLISHED, and ACTIVE jobs.
 */
router.get('/', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const search = (req.query.q as string) || (req.query.search as string);
    const company = req.query.company as string;
    const location = req.query.location as string;
    const workMode = req.query.work_mode as string;
    const employmentType = req.query.employment_type as string;
    const branch = req.query.branch as string;
    const sort = req.query.sort as 'latest' | 'oldest' | 'company';

    const result = await getPublicJobs({
      page,
      limit,
      search,
      company,
      location,
      workMode,
      employmentType,
      branch,
      sort,
    });

    // Sanitize URLs on output
    const safeJobs = result.jobs.map((job) => ({
      ...job,
      source_url: isValidHttpUrl(job.source_url) ? job.source_url : '#',
      apply_url: isValidHttpUrl(job.apply_url) ? job.apply_url : '#',
    }));

    return res.status(200).json({
      success: true,
      data: {
        jobs: safeJobs,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      },
    });
  } catch (err: any) {
    console.error('Error fetching student job feed:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch job feed.' },
    });
  }
});

/**
 * GET /api/jobs/:id
 * Public / Student Endpoint for Single Approved Job Details
 */
router.get('/:id', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const job = await getPublicJobById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job opening not found or not published.' },
      });
    }

    const safeJob = {
      ...job,
      source_url: isValidHttpUrl(job.source_url) ? job.source_url : '#',
      apply_url: isValidHttpUrl(job.apply_url) ? job.apply_url : '#',
    };

    return res.status(200).json({
      success: true,
      data: { job: safeJob },
    });
  } catch (err: any) {
    console.error('Error fetching job details for student:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch job details.' },
    });
  }
});

export default router;
