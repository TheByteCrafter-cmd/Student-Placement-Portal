import { pool, testDatabaseConnection } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  role: 'STUDENT' | 'ADMIN';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

export type SafeUser = Omit<UserRecord, 'password_hash'>;

// Fallback in-memory store for offline development when PostgreSQL is not running
const inMemoryUsers: Map<string, UserRecord> = new Map();

/**
 * Initializes the PostgreSQL schema for the users table
 */
export async function initUserTable(): Promise<void> {
  const dbHealth = await testDatabaseConnection();
  if (!dbHealth.connected) {
    console.log('ℹ️ PostgreSQL offline: User store running in-memory fallback mode.');
    return;
  }

  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'ADMIN')),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
  `;

  try {
    await pool.query(query);
    console.log('✅ PostgreSQL Schema: `users` table verified.');
  } catch (err: any) {
    console.error('❌ Failed to initialize PostgreSQL users table:', err.message);
  }
}

/**
 * Finds user by normalized email address
 */
export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const dbHealth = await testDatabaseConnection();

  if (dbHealth.connected) {
    try {
      const res = await pool.query(
        'SELECT id, email, password_hash, role, is_active, created_at, updated_at, last_login_at FROM users WHERE LOWER(email) = LOWER($1)',
        [normalizedEmail]
      );
      if (res.rows.length > 0) {
        return res.rows[0];
      }
    } catch (err: any) {
      console.error('Error querying user from DB:', err.message);
    }
  }

  // Check in-memory store
  for (const user of inMemoryUsers.values()) {
    if (user.email.toLowerCase() === normalizedEmail) {
      return user;
    }
  }

  return null;
}

/**
 * Finds user by ID
 */
export async function findUserById(id: string): Promise<UserRecord | null> {
  const dbHealth = await testDatabaseConnection();

  if (dbHealth.connected) {
    try {
      const res = await pool.query(
        'SELECT id, email, password_hash, role, is_active, created_at, updated_at, last_login_at FROM users WHERE id = $1',
        [id]
      );
      if (res.rows.length > 0) {
        return res.rows[0];
      }
    } catch (err: any) {
      console.error('Error querying user by ID from DB:', err.message);
    }
  }

  return inMemoryUsers.get(id) || null;
}

/**
 * Creates a new user
 */
export async function createUser(data: {
  email: string;
  passwordHash: string;
  role: 'STUDENT' | 'ADMIN';
}): Promise<UserRecord> {
  const normalizedEmail = data.email.trim().toLowerCase();
  const dbHealth = await testDatabaseConnection();

  if (dbHealth.connected) {
    const res = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, password_hash, role, is_active, created_at, updated_at, last_login_at`,
      [normalizedEmail, data.passwordHash, data.role]
    );
    return res.rows[0];
  }

  // In-memory creation
  const newUser: UserRecord = {
    id: uuidv4(),
    email: normalizedEmail,
    password_hash: data.passwordHash,
    role: data.role,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    last_login_at: null,
  };

  inMemoryUsers.set(newUser.id, newUser);
  return newUser;
}

/**
 * Updates user account active status (Activate / Deactivate)
 */
export async function updateUserStatus(id: string, isActive: boolean): Promise<UserRecord | null> {
  const now = new Date();
  const dbHealth = await testDatabaseConnection();

  if (dbHealth.connected) {
    try {
      const res = await pool.query(
        'UPDATE users SET is_active = $1, updated_at = $2 WHERE id = $3 RETURNING id, email, password_hash, role, is_active, created_at, updated_at, last_login_at',
        [isActive, now, id]
      );
      if (res.rows.length > 0) return res.rows[0];
    } catch (err: any) {
      console.error('Error updating user active status:', err.message);
    }
  }

  const inMemoryUser = inMemoryUsers.get(id);
  if (inMemoryUser) {
    inMemoryUser.is_active = isActive;
    inMemoryUser.updated_at = now;
    return inMemoryUser;
  }

  return null;
}

/**
 * Updates last_login_at timestamp
 */
export async function updateLastLogin(id: string): Promise<void> {
  const now = new Date();
  const dbHealth = await testDatabaseConnection();

  if (dbHealth.connected) {
    try {
      await pool.query('UPDATE users SET last_login_at = $1, updated_at = $1 WHERE id = $2', [now, id]);
    } catch (err: any) {
      console.error('Error updating last login:', err.message);
    }
  }

  const inMemoryUser = inMemoryUsers.get(id);
  if (inMemoryUser) {
    inMemoryUser.last_login_at = now;
    inMemoryUser.updated_at = now;
  }
}

/**
 * Strips password_hash to return safe user profile
 */
export function sanitizeUser(user: UserRecord): SafeUser {
  const { password_hash, ...safeUser } = user;
  return safeUser;
}
