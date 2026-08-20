import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface UserPayload {
  id: string;
  email: string;
  role: 'STUDENT' | 'ADMIN';
}

/**
 * Normalizes email address to lowercase and trims whitespace
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Validates email syntax
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Hashes password using bcrypt with cost factor 12
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Compares plaintext password with stored bcrypt hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generates JWT token for authenticated user
 */
export function generateToken(user: UserPayload): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn as any,
      issuer: 'student-placement-portal',
      audience: 'placement-portal-users',
    }
  );
}

/**
 * Verifies JWT token and extracts user payload
 */
export function verifyToken(token: string): UserPayload {
  const decoded = jwt.verify(token, config.jwtSecret, {
    issuer: 'student-placement-portal',
    audience: 'placement-portal-users',
  }) as UserPayload;

  return {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
  };
}
