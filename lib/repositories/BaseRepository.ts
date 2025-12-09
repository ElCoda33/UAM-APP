import { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getPool } from '@/lib/db';

export interface IPaginationOptions {
  page?: number;
  limit?: number;
}

export interface IPaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export abstract class BaseRepository {
  protected pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  protected async getConnection(): Promise<PoolConnection> {
    return await this.pool.getConnection();
  }

  protected getOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  protected async countTotal(tableName: string, whereClause: string = '', params: any[] = []): Promise<number> {
    const query = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`;
    const [rows] = await this.pool.query<RowDataPacket[]>(query, params);
    return rows[0].total;
  }
}
