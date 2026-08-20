import { Router, Request, Response } from 'express';
import { config } from '../config/env';
import { testDatabaseConnection } from '../config/db';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  const dbHealth = await testDatabaseConnection();

  const healthPayload = {
    status: dbHealth.connected ? 'healthy' : 'degraded',
    service: 'Student Placement Portal API',
    phase: 'Phase 1 - Project Foundation',
    timestamp: new Date().toISOString(),
    environment: config.env,
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbHealth,
  };

  const statusCode = dbHealth.connected ? 200 : 200; // 200 OK with degraded status payload if DB offline in dev
  res.status(statusCode).json(healthPayload);
});

export default router;
