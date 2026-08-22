import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import {
  getStudentByUserId,
  upsertStudentProfile,
  StudentProfileInput,
} from '../models/student.model';
import {
  createResumeRecord,
  getResumesByUserId,
  getResumeById,
  deleteResumeRecord,
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
 * Retrieves profile of current authenticated student
 */
router.get('/profile', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await getStudentByUserId(userId);

    return res.status(200).json({
      success: true,
      data: {
        profile,
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
 * Creates or updates student profile for current authenticated student
 */
router.put('/profile', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
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
      github_url,
      linkedin_url,
      portfolio_url,
    } = req.body;

    // Field Validation
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

    const gradYearNum = parseInt(graduation_year, 10);
    if (isNaN(gradYearNum) || gradYearNum < 1990 || gradYearNum > 2100) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Please enter a valid graduation year.' },
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

    // URL Protocol Security Validation (HTTP/HTTPS only)
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
      github_url: github_url || null,
      linkedin_url: linkedin_url || null,
      portfolio_url: portfolio_url || null,
    };

    // Upsert profile deriving student identity exclusively from authenticated req.user.id
    const updatedProfile = await upsertStudentProfile(userId, profileData);

    return res.status(200).json({
      success: true,
      message: 'Student profile updated successfully.',
      data: {
        profile: updatedProfile,
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
      // Generate safe random UUID filename for disk storage
      const storedFilename = `${uuidv4()}.pdf`;
      const fullFilePath = path.join(UPLOAD_DIR, storedFilename);

      // Save file buffer to isolated upload storage directory
      fs.writeFileSync(fullFilePath, fileBuffer);

      // Save resume record in database
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
 * DELETE /api/students/resumes/:id
 * Deletes a resume record by ID (Verifies strict ownership)
 */
router.delete('/resumes/:id', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const resumeId = req.params.id;

    // Check ownership before deleting
    const existingResume = await getResumeById(resumeId);
    if (!existingResume || existingResume.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resume not found or access denied.' },
      });
    }

    // Delete database record
    const deleted = await deleteResumeRecord(resumeId, userId);
    if (deleted) {
      // Remove physical file from disk if it exists
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

/**
 * GET /api/students/resumes/:id/download
 * Downloads/Streams PDF resume (Strict ownership verification)
 */
router.get('/resumes/:id/download', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response) => {
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
    console.error('Error downloading resume:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to download resume.' },
    });
  }
});

export default router;
