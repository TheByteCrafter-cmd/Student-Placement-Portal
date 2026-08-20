import { config } from '../config/env';
import { findUserByEmail, createUser } from '../models/user.model';
import { hashPassword, normalizeEmail } from '../utils/auth.utils';

export async function seedAdminUser(): Promise<void> {
  const adminEmail = normalizeEmail(config.adminEmail);
  const existingAdmin = await findUserByEmail(adminEmail);

  if (existingAdmin) {
    return;
  }

  const passwordHash = await hashPassword(config.adminPassword);
  await createUser({
    email: adminEmail,
    passwordHash,
    role: 'ADMIN',
  });

  console.log(`🔐 Admin Account Initialized: ${adminEmail}`);
}
