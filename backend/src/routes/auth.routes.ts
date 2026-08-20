import { Router, Request, Response } from 'express';
import {
  normalizeEmail,
  isValidEmail,
  hashPassword,
  comparePassword,
  generateToken,
} from '../utils/auth.utils';
import {
  findUserByEmail,
  findUserById,
  createUser,
  updateLastLogin,
  sanitizeUser,
} from '../models/user.model';
import { requireAuth, requireRole, authRateLimiter } from '../middleware/auth.middleware';
import { config } from '../config/env';

const router = Router();

// Cookie options helper
const getCookieOptions = () => ({
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000, // 1 day
});

/**
 * POST /api/auth/register
 * Student Registration Endpoint (Strictly forces role = STUDENT)
 */
router.post('/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Email and password are required fields.',
        },
      });
    }

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Please provide a valid email address.',
        },
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters long.',
        },
      });
    }

    // Check for existing user
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ACCOUNT_EXISTS',
          message: 'An account with this email already exists.',
        },
      });
    }

    // Hash password & create STUDENT user
    const passwordHash = await hashPassword(password);
    const newUser = await createUser({
      email: normalizedEmail,
      passwordHash,
      role: 'STUDENT', // Force STUDENT role
    });

    const safeUser = sanitizeUser(newUser);
    const token = generateToken({
      id: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
    });

    // Set HTTP-only cookie
    res.cookie('access_token', token, getCookieOptions());

    // Log security event (without sensitive data)
    console.log(`👤 Student Registered: ${safeUser.email} [${safeUser.id}]`);

    return res.status(201).json({
      success: true,
      message: 'Student account registered successfully.',
      data: {
        user: safeUser,
        token,
      },
    });
  } catch (err: any) {
    console.error('Registration Error:', err.message);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Registration failed due to a server error.',
      },
    });
  }
});

/**
 * POST /api/auth/login
 * User Login Endpoint (STUDENT & ADMIN)
 */
router.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Email and password are required fields.',
        },
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await findUserByEmail(normalizedEmail);

    // Generic error message to prevent email enumeration
    const invalidCredentialsResponse = () =>
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });

    if (!user) {
      console.log(`⚠️ Login Failed: Account not found for ${normalizedEmail}`);
      return invalidCredentialsResponse();
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'This account has been disabled.',
        },
      });
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      console.log(`⚠️ Login Failed: Incorrect password for ${normalizedEmail}`);
      return invalidCredentialsResponse();
    }

    // Update last login timestamp
    await updateLastLogin(user.id);

    const safeUser = sanitizeUser(user);
    const token = generateToken({
      id: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
    });

    // Set HTTP-only cookie
    res.cookie('access_token', token, getCookieOptions());

    console.log(`🔑 Login Success: ${safeUser.email} (${safeUser.role})`);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: safeUser,
        token,
      },
    });
  } catch (err: any) {
    console.error('Login Error:', err.message);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Login failed due to a server error.',
      },
    });
  }
});

/**
 * POST /api/auth/logout
 * Session Termination Endpoint
 */
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('access_token', getCookieOptions());
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

/**
 * GET /api/auth/me
 * Returns current authenticated user profile
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' },
    });
  }

  const user = await findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User record not found.' },
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      user: sanitizeUser(user),
    },
  });
});

/**
 * GET /api/admin/test
 * Demonstration Protected Route (ADMIN Only)
 */
router.get('/admin/test', requireAuth, requireRole('ADMIN'), (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'Welcome to the Admin Protected Route.',
    data: {
      user: req.user,
      scope: 'ADMIN_PORTAL_ACCESS',
      verifiedAt: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/student/test
 * Demonstration Protected Route (STUDENT Only)
 */
router.get('/student/test', requireAuth, requireRole('STUDENT'), (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'Welcome to the Student Protected Route.',
    data: {
      user: req.user,
      scope: 'STUDENT_PORTAL_ACCESS',
      verifiedAt: new Date().toISOString(),
    },
  });
});

export default router;
