import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getPool } from '@/lib/db';

export interface ILocation {
  id: number;
  name: string;
  description: string | null;
  section_id: number | null;
  section_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ILocationFilters {
  search?: string;
  sectionId?: number;
}

export interface IPaginationResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class LocationRepository {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  public async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: ILocationFilters
  ): Promise<IPaginationResult<ILocation>> {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];

    if (filters?.search) {
      whereClause += ' AND (l.name LIKE ? OR l.description LIKE ? OR s.name LIKE ?)';
      const searchPattern = `%${filters.search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    if (filters?.sectionId) {
      whereClause += ' AND l.section_id = ?';
      queryParams.push(filters.sectionId);
    }

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM locations l
      LEFT JOIN sections s ON l.section_id = s.id
      ${whereClause}
    `;
    const [countRows] = await this.pool.query<RowDataPacket[]>(countQuery, queryParams);
    const total = countRows[0].total;

    // Fetch data
    const query = `
      SELECT 
        l.id, l.name, l.description, l.section_id, s.name AS section_name,
        l.created_at, l.updated_at
      FROM locations l
      LEFT JOIN sections s ON l.section_id = s.id
      ${whereClause}
      ORDER BY l.name ASC
      LIMIT ? OFFSET ?
    `;

    // Add pagination params
    const finalParams = [...queryParams, limit, offset];

    const [rows] = await this.pool.query<RowDataPacket[]>(query, finalParams);

    const data = rows.map((row: any) => ({
      ...row,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public async findById(id: number): Promise<ILocation | null> {
    const query = `
      SELECT 
        l.id, l.name, l.description, l.section_id, s.name AS section_name,
        l.created_at, l.updated_at
      FROM locations l
      LEFT JOIN sections s ON l.section_id = s.id
      WHERE l.id = ?
    `;
    const [rows] = await this.pool.query<RowDataPacket[]>(query, [id]);

    if (rows.length === 0) return null;

    const row = rows[0] as any;
    return {
      ...row,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    };
  }

  public async create(data: Omit<ILocation, 'id' | 'created_at' | 'updated_at' | 'section_name'>): Promise<ILocation> {
    // Check for duplicates
    const [existing] = await this.pool.query<RowDataPacket[]>(
      "SELECT id FROM locations WHERE name = ?",
      [data.name]
    );
    if (existing.length > 0) {
      throw new Error(`La ubicación con el nombre '${data.name}' ya existe.`);
    }

    const query = `
      INSERT INTO locations (name, description, section_id, created_at, updated_at) 
      VALUES (?, ?, ?, NOW(), NOW())
    `;
    const [result] = await this.pool.query<ResultSetHeader>(query, [
      data.name,
      data.description || null,
      data.section_id || null
    ]);

    const newLocation = await this.findById(result.insertId);
    if (!newLocation) throw new Error("Error creating location");

    return newLocation;
  }

  public async update(id: number, data: Partial<Omit<ILocation, 'id' | 'created_at' | 'updated_at'>>): Promise<ILocation | null> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      // Check for duplicates if name is changing
      const [existing] = await this.pool.query<RowDataPacket[]>(
        "SELECT id FROM locations WHERE name = ? AND id != ?",
        [data.name, id]
      );
      if (existing.length > 0) {
        throw new Error(`La ubicación con el nombre '${data.name}' ya existe.`);
      }
      updates.push('name = ?');
      values.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }

    if (data.section_id !== undefined) {
      updates.push('section_id = ?');
      values.push(data.section_id);
    }

    if (updates.length === 0) return this.findById(id);

    updates.push('updated_at = NOW()');

    const query = `UPDATE locations SET ${updates.join(', ')} WHERE id = ?`;
    values.push(id);

    await this.pool.query(query, values);
    return this.findById(id);
  }

  public async delete(id: number): Promise<boolean> {
    // Check if used in assets
    const [assets] = await this.pool.query<RowDataPacket[]>(
      "SELECT id FROM assets WHERE current_location_id = ? AND deleted_at IS NULL",
      [id]
    );

    if (assets.length > 0) {
      throw new Error("No se puede eliminar la ubicación porque tiene activos asociados.");
    }

    const query = "DELETE FROM locations WHERE id = ?";
    const [result] = await this.pool.query<ResultSetHeader>(query, [id]);
    return result.affectedRows > 0;
  }
}
