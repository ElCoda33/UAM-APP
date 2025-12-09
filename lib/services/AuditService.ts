import { getPool } from '@/lib/db';
import { ResultSetHeader } from 'mysql2/promise';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  VIEW = 'VIEW'
}

export interface IAuditLog {
  user_id: number;
  action: AuditAction;
  entity: string;
  entity_id?: string | number;
  details?: string;
  ip_address?: string;
}

export class AuditService {
  private static instance: AuditService;

  private constructor() { }

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  public async log(data: IAuditLog): Promise<void> {
    const pool = getPool();
    try {
      const query = `
                INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            `;
      await pool.query<ResultSetHeader>(query, [
        data.user_id,
        data.action,
        data.entity,
        data.entity_id || null,
        data.details || null,
        data.ip_address || null
      ]);
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // We don't want to throw here to avoid blocking the main operation
    }
  }

  public async getRecentActivity(limit: number = 5): Promise<any[]> {
    const pool = getPool();
    const query = `
      SELECT 
        al.id,
        al.action,
        al.entity,
        al.entity_id,
        al.details,
        al.created_at,
        u.first_name,
        u.last_name,
        u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ?
    `;
    const [rows] = await pool.query<any[]>(query, [limit]);
    return rows;
  }
}
