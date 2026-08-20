import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import healthRoutes from './routes/health.routes';
import { errorHandler } from './middleware/errorHandler';
import { testDatabaseConnection } from './config/db';

const app = express();

// Security & Parsing Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', healthRoutes);

// Root Fallback Route
app.get('/', (req, res) => {
  res.json({
    message: 'Student Placement Portal Backend API Service',
    phase: 'Phase 1 - Project Setup & Foundation',
    healthCheck: '/api/health',
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

  // Perform initial database connection check
  const dbHealth = await testDatabaseConnection();
  if (dbHealth.connected) {
    console.log(`✅ Database Status: CONNECTED to PostgreSQL (${dbHealth.database} at ${dbHealth.host})`);
  } else {
    console.log(`⚠️ Database Status: UNREACHABLE (${dbHealth.error})`);
  }
});

export default app;
