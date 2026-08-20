import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/env';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import { errorHandler } from './middleware/errorHandler';
import { testDatabaseConnection } from './config/db';
import { initUserTable } from './models/user.model';
import { seedAdminUser } from './db/seedAdmin';

const app = express();

// Security & Cookie Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(cookieParser(config.cookieSecret));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);

// Protected Demo Verification Routes mounted under /api/admin & /api/student
app.use('/api', authRoutes);

// Root Fallback Route
app.get('/', (req, res) => {
  res.json({
    message: 'Student Placement Portal Backend API Service',
    phase: 'Phase 2 - Authentication & Role-Based Access Control',
    endpoints: {
      health: '/api/health',
      register: '/api/auth/register',
      login: '/api/auth/login',
      me: '/api/auth/me',
      adminTest: '/api/admin/test',
      studentTest: '/api/student/test',
    },
  });
});

// 404 Handler for Unknown Routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl} - Endpoint not found.`,
    },
  });
});

// Centralized Error Handler
app.use(errorHandler);

// Start HTTP Server
const server = app.listen(config.port, async () => {
  console.log(`====================================================`);
  console.log(`🚀 Placement Portal Backend Server Running`);
  console.log(`📍 Environment: ${config.env}`);
  console.log(`🌐 URL: http://localhost:${config.port}`);
  console.log(`🏥 Health Check: http://localhost:${config.port}/api/health`);
  console.log(`====================================================`);

  // Initialize DB Schema & Admin Seed
  await initUserTable();
  await seedAdminUser();

  const dbHealth = await testDatabaseConnection();
  if (dbHealth.connected) {
    console.log(`✅ Database Status: CONNECTED to PostgreSQL (${dbHealth.database} at ${dbHealth.host})`);
  } else {
    console.log(`⚠️ Database Status: UNREACHABLE (${dbHealth.error})`);
  }
});

export default app;
