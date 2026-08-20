import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyToken, UserPayload } from '../utils/auth.utils';
import { findUserById } from '../models/user.model';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

/**
 * Middleware: Requires valid JWT token in HTTP-only Cookie or Authorization Header
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // 1. Check HTTP-only cookie 'access_token'
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } 
    // 2. Fallback to Authorization Header (Bearer <token>)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Missing token.',
        },
      });
    }

    // Verify token
    const decodedPayload = verifyToken(token);

    // Verify user exists and is active in database
    const user = await findUserById(decodedPayload.id);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Account is inactive or no longer exists.',
        },
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid, malformed, or expired authentication token.',
      },
    });
  }
}

/**
 * Middleware: Enforces Role-Based Access Control (RBAC)
 */
export function requireRole(...allowedRoles: Array<'STUDENT' | 'ADMIN'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}.`,
        },
      });
    }

    next();
  };
}

/**
 * Rate Limiter for Authentication Endpoints (Login/Register)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
  },
});
