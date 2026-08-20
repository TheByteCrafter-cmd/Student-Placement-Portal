import dotenv from 'dotenv';
import path from 'path';

// Load .env file from root or backend folder
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/placement_portal',
  dbHost: process.env.POSTGRES_HOST || 'localhost',
  dbPort: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  dbUser: process.env.POSTGRES_USER || 'postgres',
  dbPassword: process.env.POSTGRES_PASSWORD || 'postgres',
  dbName: process.env.POSTGRES_DB || 'placement_portal',
};
