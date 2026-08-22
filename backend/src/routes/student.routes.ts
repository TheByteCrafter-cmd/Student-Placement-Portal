import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import {
  getStudentByUserId,
  upsertStudentProfile,
  calculateProfileCompletion,
  StudentProfileInput,
} from '../models/student.model';
import {
  createResumeRecord,
  getResumesByUserId,
  getResumeById,
  deleteResumeRecord,
  setPrimaryResume,
  sanitizeResume,
} from '../models/resume.model';
import {
  validatePdfMagicBytes,
  isValidHttpUrl,
  sanitizeOriginalFilename,
} from '../utils/file.utils';

const router = Router();

// Configure isolated upload directory outside public web root
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/resumes');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer for memory storage first to inspect magic bytes before writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB maximum file size limit
  },
});

/**
 * GET /api/students/profile
 * Retrieves profile & profile completion score of current authenticated student
 */
router.get('/profile', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await getStudentByUserId(userId);
    const resumes = await getResumesByUserId(userId);
    const profileCompletion = calculateProfileCompletion(profile, resumes.length > 0);

    return res.status(200).json({
      success: true,
      data: {
        profile,
        profile_completion: profileCompletion,
      },
    });
  } catch (err: any) {
    console.error('Error fetching student profile:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch student profile.' },
    });
  }
});

/**
 * PUT /api/students/profile
 * Explicit field mapping & validation for student profile
 */
router.put('/profile', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Explicit field mapping to prevent mass assignment security vulnerabilities
    const {
      first_name,
      last_name,
      roll_number,
      degree,
      branch,
      graduation_year,
      cgpa,
      active_backlogs,
      skills,
      phone_number,
      tenth_percentage,
      twelfth_percentage,
      diploma_percentage,
      github_url,
      linkedin_url,
      portfolio_url,
    } = req.body;

    // 1. Required Personal & Academic Text Validation
    if (!first_name || typeof first_name !== 'string' || first_name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'First name is required.' },
      });
    }

    if (!last_name || typeof last_name !== 'string' || last_name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Last name is required.' },
      });
    }

    if (!roll_number || typeof roll_number !== 'string' || roll_number.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Roll number is required.' },
      });
    }

    if (!degree || typeof degree !== 'string' || degree.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Degree is required.' },
      });
    }

    if (!branch || typeof branch !== 'string' || branch.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Branch/Department is required.' },
      });
    }

    // 2. Numeric Range Validations
    const gradYearNum = parseInt(graduation_year, 10);
    if (isNaN(gradYearNum) || gradYearNum < 1990 || gradYearNum > 2100) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Please enter a valid graduation year (1990 - 2100).' },
      });
    }

    const cgpaNum = parseFloat(cgpa);
    if (isNaN(cgpaNum) || cgpaNum < 0.0 || cgpaNum > 10.0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'CGPA must be a number between 0.00 and 10.00.' },
      });
    }

    const backlogsNum = parseInt(active_backlogs, 10);
    if (isNaN(backlogsNum) || backlogsNum < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Active backlogs must be a non-negative integer.' },
      });
    }

    // 3. Placement Academic Percentages Validation (0 to 100 or null)
    let tenthNum: number | null = null;
    if (tenth_percentage !== undefined && tenth_percentage !== null && tenth_percentage !== '') {
      tenthNum = parseFloat(tenth_percentage);
      if (isNaN(tenthNum) || tenthNum < 0.0 || tenthNum > 100.0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: '10th percentage must be between 0.00 and 100.00.' },
        });
      }
    }

    let twelfthNum: number | null = null;
    if (twelfth_percentage !== undefined && twelfth_percentage !== null && twelfth_percentage !== '') {
      twelfthNum = parseFloat(twelfth_percentage);
      if (isNaN(twelfthNum) || twelfthNum < 0.0 || twelfthNum > 100.0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: '12th percentage must be between 0.00 and 100.00.' },
        });
      }
    }

    let diplomaNum: number | null = null;
    if (diploma_percentage !== undefined && diploma_percentage !== null && diploma_percentage !== '') {
      diplomaNum = parseFloat(diploma_percentage);
      if (isNaN(diplomaNum) || diplomaNum < 0.0 || diplomaNum > 100.0) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Diploma percentage must be between 0.00 and 100.00.' },
        });
      }
    }

    // 4. Phone Number Validation
    let cleanPhone: string | null = null;
    if (phone_number && typeof phone_number === 'string' && phone_number.trim().length > 0) {
      cleanPhone = phone_number.trim();
      if (cleanPhone.length < 7 || cleanPhone.length > 20) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Phone number must be between 7 and 20 characters.' },
        });
      }
    }

    // 5. URL Security Validation (HTTP/HTTPS only)
    if (github_url && !isValidHttpUrl(github_url)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_URL', message: 'GitHub URL must be a valid HTTP or HTTPS link.' },
      });
    }

    if (linkedin_url && !isValidHttpUrl(linkedin_url)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_URL', message: 'LinkedIn URL must be a valid HTTP or HTTPS link.' },
      });
    }

    if (portfolio_url && !isValidHttpUrl(portfolio_url)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_URL', message: 'Portfolio URL must be a valid HTTP or HTTPS link.' },
      });
    }

    const profileData: StudentProfileInput = {
      first_name,
      last_name,
      roll_number,
      degree,
      branch,
      graduation_year: gradYearNum,
      cgpa: cgpaNum,
      active_backlogs: backlogsNum,
      skills: Array.isArray(skills) ? skills : typeof skills === 'string' ? skills.split(',') : [],
      phone_number: cleanPhone,
      tenth_percentage: tenthNum,
      twelfth_percentage: twelfthNum,
      diploma_percentage: diplomaNum,
      github_url: github_url || null,
      linkedin_url: linkedin_url || null,
      portfolio_url: portfolio_url || null,
    };

    // Upsert profile deriving student identity exclusively from authenticated req.user.id
    const updatedProfile = await upsertStudentProfile(userId, profileData);
    const resumes = await getResumesByUserId(userId);
    const profileCompletion = calculateProfileCompletion(updatedProfile, resumes.length > 0);

    return res.status(200).json({
      success: true,
      message: 'Student profile updated successfully.',
      data: {
        profile: updatedProfile,
        profile_completion: profileCompletion,
      },
    });
  } catch (err: any) {
    console.error('Error updating student profile:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update student profile.' },
    });
  }
});

/**
 * POST /api/students/resumes
 * Upload PDF resume with strict MIME & PDF magic-byte header validation
 */
router.post('/resumes', requireAuth, requireRole('STUDENT'), (req: Request, res: Response) => {
  upload.single('resume')(req, res, async (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds maximum limit of 5 MB.' },
        });
      }
      return res.status(400).json({
        success: false,
        error: { code: 'UPLOAD_ERROR', message: err.message || 'File upload error.' },
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'Please select a PDF file to upload.' },
      });
    }

    const fileBuffer = req.file.buffer;
    const clientMime = req.file.mimetype;
    const originalName = sanitizeOriginalFilename(req.file.originalname);

    // 1. Strict MIME-type Check
    if (clientMime !== 'application/pdf' && !originalName.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_FILE_TYPE', message: 'Only PDF documents (.pdf) are allowed.' },
      });
    }

    // 2. Strict Magic Byte Verification (%PDF- / 0x25 0x50 0x44 0x46 0x2D)
    if (!validatePdfMagicBytes(fileBuffer)) {
      console.warn(`⚠️ Rejected spoofed non-PDF file upload attempt from user ${req.user!.id}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PDF_HEADER',
          message: 'Security Validation Failed: File header is not a valid PDF document.',
        },
      });
    }

    try {
      const storedFilename = `${uuidv4()}.pdf`;
      const fullFilePath = path.join(UPLOAD_DIR, storedFilename);

      // Save file buffer to isolated upload storage directory outside web root
      fs.writeFileSync(fullFilePath, fileBuffer);

      const resumeRecord = await createResumeRecord({
        userId: req.user!.id,
        originalFilename: originalName,
        storedFilename,
        filePath: fullFilePath,
        fileSize: req.file.size,
      });

      console.log(`📄 Resume Uploaded: ${originalName} (${req.file.size} bytes) by User ${req.user!.id}`);

      return res.status(201).json({
        success: true,
        message: 'Resume uploaded successfully.',
        data: {
          resume: sanitizeResume(resumeRecord),
        },
      });
    } catch (saveErr: any) {
      console.error('Error saving resume file:', saveErr.message);
      return res.status(500).json({
        success: false,
        error: { code: 'STORAGE_ERROR', message: 'Failed to store resume on server.' },
      });
    }
  });
});

/**
 * GET /api/students/resumes
 * Lists uploaded resumes for the current authenticated student
 */
router.get('/resumes', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const resumes = await getResumesByUserId(userId);
    const safeResumes = resumes.map(sanitizeResume);

    return res.status(200).json({
      success: true,
      data: {
        resumes: safeResumes,
      },
    });
  } catch (err: any) {
    console.error('Error listing resumes:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve resumes.' },
    });
  }
});

/**
 * PATCH /api/students/resumes/:id/primary
 * Sets target resume as Primary resume for current authenticated student
 */
router.patch('/resumes/:id/primary', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const resumeId = req.params.id;

    const updated = await setPrimaryResume(resumeId, userId);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resume not found or access denied.' },
      });
    }

    const resumes = await getResumesByUserId(userId);
    return res.status(200).json({
      success: true,
      message: 'Primary resume set successfully.',
      data: {
        resumes: resumes.map(sanitizeResume),
      },
    });
  } catch (err: any) {
    console.error('Error setting primary resume:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to set primary resume.' },
    });
  }
});

/**
 * GET /api/students/resumes/:id
 * Streams/Downloads PDF resume (Ownership verified) or returns metadata
 */
router.get('/resumes/:id', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const resumeId = req.params.id;

    const resume = await getResumeById(resumeId);
    if (!resume || resume.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resume not found or access denied.' },
      });
    }

    // Check if client requested JSON metadata
    if (req.headers.accept && req.headers.accept.includes('application/json') && req.query.metadata === 'true') {
      return res.status(200).json({
        success: true,
        data: {
          resume: sanitizeResume(resume),
        },
      });
    }

    if (!fs.existsSync(resume.file_path)) {
      return res.status(404).json({
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'Resume file missing on server storage.' },
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${resume.original_filename}"`);
    return res.sendFile(resume.file_path);
  } catch (err: any) {
    console.error('Error serving resume:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to serve resume.' },
    });
  }
});

/**
 * DELETE /api/students/resumes/:id
 * Deletes a resume record by ID (Verifies strict ownership)
 */
router.delete('/resumes/:id', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const resumeId = req.params.id;

    const existingResume = await getResumeById(resumeId);
    if (!existingResume || existingResume.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resume not found or access denied.' },
      });
    }

    const deleted = await deleteResumeRecord(resumeId, userId);
    if (deleted) {
      if (fs.existsSync(existingResume.file_path)) {
        try {
          fs.unlinkSync(existingResume.file_path);
        } catch (unlinkErr) {
          console.warn('Warning: Physical resume file removal failed:', unlinkErr);
        }
      }

      console.log(`🗑️ Resume Deleted: ${existingResume.original_filename} by User ${userId}`);
      return res.status(200).json({
        success: true,
        message: 'Resume deleted successfully.',
      });
    }

    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Resume not found.' },
    });
  } catch (err: any) {
    console.error('Error deleting resume:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete resume.' },
    });
  }
});

export default router;
