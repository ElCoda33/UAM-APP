import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getPool } from '@/lib/db';

export interface ISection {
  id: number;
  name: string;
  management_level: number | null;
  email: string | null;
  parent_section_id: number | null;
  parent_section_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ISectionFilters {
  search?: string;
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

export class SectionRepository {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  public async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: ISectionFilters
  ): Promise<IPaginationResult<ISection>> {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];

    if (filters?.search) {
      whereClause += ' AND (s.name LIKE ? OR s.email LIKE ?)';
      const searchPattern = `%${filters.search}%`;
      queryParams.push(searchPattern, searchPattern);
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM sections s ${whereClause}`;
    const [countRows] = await this.pool.query<RowDataPacket[]>(countQuery, queryParams);
    const total = countRows[0].total;

    // Fetch data
    const query = `
      SELECT 
        s.id, s.name, s.management_level, s.email, s.parent_section_id,
        p.name as parent_section_name,
        s.created_at, s.updated_at
      FROM sections s
      LEFT JOIN sections p ON s.parent_section_id = p.id
      ${whereClause}
      ORDER BY s.name ASC
      LIMIT ? OFFSET ?
    `;

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

  public async findById(id: number): Promise<ISection | null> {
    const query = `
      SELECT 
        s.id, s.name, s.management_level, s.email, s.parent_section_id,
        p.name as parent_section_name,
        s.created_at, s.updated_at 
      FROM sections s
      LEFT JOIN sections p ON s.parent_section_id = p.id
      WHERE s.id = ?
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

  public async create(data: Omit<ISection, 'id' | 'created_at' | 'updated_at' | 'parent_section_name'>): Promise<ISection> {
    const [existing] = await this.pool.query<RowDataPacket[]>(
      "SELECT id FROM sections WHERE name = ?",
      [data.name]
    );
    if (existing.length > 0) {
      throw new Error(`La sección con el nombre '${data.name}' ya existe.`);
    }

    const query = `
      INSERT INTO sections (name, management_level, email, parent_section_id, created_at, updated_at) 
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `;
    const [result] = await this.pool.query<ResultSetHeader>(query, [
      data.name,
      data.management_level || null,
      data.email || null,
      data.parent_section_id || null
    ]);

    const newSection = await this.findById(result.insertId);
    if (!newSection) throw new Error("Error creating section");

    return newSection;
  }

  public async update(id: number, data: Partial<Omit<ISection, 'id' | 'created_at' | 'updated_at' | 'parent_section_name'>>): Promise<ISection | null> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      const [existing] = await this.pool.query<RowDataPacket[]>(
        "SELECT id FROM sections WHERE name = ? AND id != ?",
        [data.name, id]
      );
      if (existing.length > 0) {
        throw new Error(`La sección con el nombre '${data.name}' ya existe.`);
      }
      updates.push('name = ?');
      values.push(data.name);
    }

    if (data.management_level !== undefined) { updates.push('management_level = ?'); values.push(data.management_level); }
    if (data.email !== undefined) { updates.push('email = ?'); values.push(data.email); }
    if (data.parent_section_id !== undefined) { updates.push('parent_section_id = ?'); values.push(data.parent_section_id); }

    if (updates.length === 0) return this.findById(id);

    updates.push('updated_at = NOW()');

    const query = `UPDATE sections SET ${updates.join(', ')} WHERE id = ?`;
    values.push(id);

    await this.pool.query(query, values);
    return this.findById(id);
  }

  public async delete(id: number): Promise<boolean> {
    // Check dependencies (Locations, Assets, Users)
    const [locations] = await this.pool.query<RowDataPacket[]>("SELECT id FROM locations WHERE section_id = ?", [id]);
    if (locations.length > 0) throw new Error("No se puede eliminar la sección porque tiene ubicaciones asociadas.");

    const [assets] = await this.pool.query<RowDataPacket[]>("SELECT id FROM assets WHERE current_section_id = ? AND deleted_at IS NULL", [id]);
    if (assets.length > 0) throw new Error("No se puede eliminar la sección porque tiene activos asociados.");

    const [users] = await this.pool.query<RowDataPacket[]>("SELECT id FROM users WHERE section_id = ? AND status != 'disabled'", [id]);
    if (users.length > 0) throw new Error("No se puede eliminar la sección porque tiene usuarios asociados.");

    const query = "DELETE FROM sections WHERE id = ?";
    const [result] = await this.pool.query<ResultSetHeader>(query, [id]);
    return result.affectedRows > 0;
  }
}
