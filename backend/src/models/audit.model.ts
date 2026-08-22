import { pool, testDatabaseConnection } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLogRecord {
  id: string;
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, any>;
  created_at: Date;
}

const inMemoryAuditLogs: AuditLogRecord[] = [];

/**
 * Initializes the PostgreSQL schema for audit_logs
 */
export async function initAuditLogTable(): Promise<void> {
  const dbHealth = await testDatabaseConnection();
  if (!dbHealth.connected) {
    console.log('ℹ️ PostgreSQL offline: Audit log store running in-memory fallback mode.');
    return;
  }

  const query = `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id UUID NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
  `;

  try {
    await pool.query(query);
    console.log('✅ PostgreSQL Schema: `audit_logs` table verified.');
  } catch (err: any) {
    console.error('❌ Failed to initialize PostgreSQL audit_logs table:', err.message);
  }
}

/**
 * Appends an audit log entry (Append-only)
 */
export async function createAuditLog(data: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
}): Promise<AuditLogRecord> {
  const dbHealth = await testDatabaseConnection();
  const metadata = data.metadata || {};

  if (dbHealth.connected) {
    try {
      const res = await pool.query(
        `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, actor_user_id, action, entity_type, entity_id, metadata, created_at`,
        [data.actorUserId, data.action, data.entityType, data.entityId, JSON.stringify(metadata)]
      );
      return res.rows[0];
    } catch (err: any) {
      console.error('Error creating audit log in DB:', err.message);
    }
  }

  const record: AuditLogRecord = {
    id: uuidv4(),
    actor_user_id: data.actorUserId,
    action: data.action,
    entity_type: data.entityType,
    entity_id: data.entityId,
    metadata,
    created_at: new Date(),
  };

  inMemoryAuditLogs.unshift(record);
  return record;
}

/**
 * Queries audit logs with pagination and filters
 */
export async function getAuditLogs(options: {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
}): Promise<{ logs: AuditLogRecord[]; total: number }> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;

  const dbHealth = await testDatabaseConnection();

  if (dbHealth.connected) {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      if (options.action) {
        conditions.push(`action = $${paramIdx++}`);
        values.push(options.action);
      }
      if (options.entityType) {
        conditions.push(`entity_type = $${paramIdx++}`);
        values.push(options.entityType);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countRes = await pool.query(`SELECT COUNT(*) FROM audit_logs ${whereClause}`, values);
      const total = parseInt(countRes.rows[0].count, 10);

      values.push(limit, offset);
      const res = await pool.query(
        `SELECT id, actor_user_id, action, entity_type, entity_id, metadata, created_at
         FROM audit_logs ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        values
      );

      return { logs: res.rows, total };
    } catch (err: any) {
      console.error('Error fetching audit logs from DB:', err.message);
    }
  }

  let filtered = [...inMemoryAuditLogs];
  if (options.action) {
    filtered = filtered.filter((l) => l.action === options.action);
  }
  if (options.entityType) {
    filtered = filtered.filter((l) => l.entity_type === options.entityType);
  }

  const total = filtered.length;
  const logs = filtered.slice(offset, offset + limit);
  return { logs, total };
}
