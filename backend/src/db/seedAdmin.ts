import { config } from '../config/env';
import { findUserByEmail, createUser } from '../models/user.model';
import { hashPassword, normalizeEmail, isValidEmail } from '../utils/auth.utils';

export async function seedAdminUser(): Promise<void> {
  const rawAdminEmail = config.adminEmail?.trim();
  const rawAdminPassword = config.adminPassword;

  // 1. Check if environment variables are provided
  if (!rawAdminEmail || !rawAdminPassword) {
    console.log('ℹ️ Admin bootstrap skipped (ADMIN_EMAIL or ADMIN_PASSWORD environment variables not set).');
    return;
  }

  const adminEmail = normalizeEmail(rawAdminEmail);

  if (!isValidEmail(adminEmail)) {
    console.warn(`⚠️ Admin bootstrap warning: Provided ADMIN_EMAIL (${adminEmail}) is not a valid email address.`);
    return;
  }

  if (rawAdminPassword.length < 8) {
    console.warn('⚠️ Admin bootstrap warning: Provided ADMIN_PASSWORD must be at least 8 characters long.');
    return;
  }

  // 2. Check if admin already exists (Never overwrite existing admin password)
  const existingUser = await findUserByEmail(adminEmail);
  if (existingUser) {
    console.log(`ℹ️ Admin check passed: Account (${adminEmail}) already initialized.`);
    return;
  }

  // 3. Create initial admin user safely
  const passwordHash = await hashPassword(rawAdminPassword);
  await createUser({
    email: adminEmail,
    passwordHash,
    role: 'ADMIN',
  });

  console.log(`✅ Initial admin account bootstrapped successfully for ${adminEmail}.`);
}
