import dotenv from 'dotenv';
import path from 'path';

// Load .env file from root or backend directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  // Database Configuration
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/placement_portal',
  dbHost: process.env.POSTGRES_HOST || 'localhost',
  dbPort: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  dbUser: process.env.POSTGRES_USER || 'postgres',
  dbPassword: process.env.POSTGRES_PASSWORD || 'postgres',
  dbName: process.env.POSTGRES_DB || 'placement_portal',
  
  // JWT & Cookie Configuration
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-replace-in-production-env',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  cookieSecret: process.env.COOKIE_SECRET || 'dev-cookie-secret-replace-in-production-env',
  
  // Admin Bootstrap Credentials (Environment Variables Only - No Hardcoded Secrets)
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
};
