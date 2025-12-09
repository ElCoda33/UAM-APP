import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { getPool } from '@/lib/db';

export interface ICompany {
  id: number;
  legal_name: string;
  trade_name: string | null;
  tax_id: string;
  address?: string | null; // Not in schema, but maybe useful to keep if we add it later, or remove. Schema doesn't have address.
  phone_number: string | null;
  email: string | null;
  // contact_name: string | null; // Schema doesn't have contact_name
  created_at?: string;
  updated_at?: string;
}

export interface ICompanyFilters {
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

export class CompanyRepository {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  public async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: ICompanyFilters
  ): Promise<IPaginationResult<ICompany>> {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];

    if (filters?.search) {
      whereClause += ' AND (legal_name LIKE ? OR trade_name LIKE ? OR tax_id LIKE ? OR email LIKE ?)';
      const searchPattern = `%${filters.search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM companies ${whereClause}`;
    const [countRows] = await this.pool.query<RowDataPacket[]>(countQuery, queryParams);
    const total = countRows[0].total;

    // Fetch data
    const query = `
      SELECT id, legal_name, trade_name, tax_id, phone_number, email, created_at, updated_at
      FROM companies
      ${whereClause}
      ORDER BY legal_name ASC
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

  public async findById(id: number): Promise<ICompany | null> {
    const query = `SELECT id, legal_name, trade_name, tax_id, phone_number, email, created_at, updated_at FROM companies WHERE id = ?`;
    const [rows] = await this.pool.query<RowDataPacket[]>(query, [id]);

    if (rows.length === 0) return null;

    const row = rows[0] as any;
    return {
      ...row,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    };
  }

  public async create(data: Omit<ICompany, 'id' | 'created_at' | 'updated_at'>): Promise<ICompany> {
    const [existing] = await this.pool.query<RowDataPacket[]>(
      "SELECT id FROM companies WHERE legal_name = ? OR tax_id = ?",
      [data.legal_name, data.tax_id]
    );
    if (existing.length > 0) {
      throw new Error(`La empresa con la Razón Social '${data.legal_name}' o RUT '${data.tax_id}' ya existe.`);
    }

    const query = `
      INSERT INTO companies (legal_name, trade_name, tax_id, phone_number, email, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `;
    const [result] = await this.pool.query<ResultSetHeader>(query, [
      data.legal_name,
      data.trade_name || null,
      data.tax_id,
      data.phone_number || null,
      data.email || null
    ]);

    const newCompany = await this.findById(result.insertId);
    if (!newCompany) throw new Error("Error creating company");

    return newCompany;
  }

  public async update(id: number, data: Partial<Omit<ICompany, 'id' | 'created_at' | 'updated_at'>>): Promise<ICompany | null> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.legal_name !== undefined) {
      const [existing] = await this.pool.query<RowDataPacket[]>(
        "SELECT id FROM companies WHERE legal_name = ? AND id != ?",
        [data.legal_name, id]
      );
      if (existing.length > 0) {
        throw new Error(`La empresa con la Razón Social '${data.legal_name}' ya existe.`);
      }
      updates.push('legal_name = ?');
      values.push(data.legal_name);
    }

    if (data.trade_name !== undefined) { updates.push('trade_name = ?'); values.push(data.trade_name); }
    if (data.tax_id !== undefined) {
      // Check duplicate tax_id
      const [existingRut] = await this.pool.query<RowDataPacket[]>(
        "SELECT id FROM companies WHERE tax_id = ? AND id != ?",
        [data.tax_id, id]
      );
      if (existingRut.length > 0) {
        throw new Error(`La empresa con el RUT '${data.tax_id}' ya existe.`);
      }
      updates.push('tax_id = ?'); values.push(data.tax_id);
    }
    if (data.phone_number !== undefined) { updates.push('phone_number = ?'); values.push(data.phone_number); }
    if (data.email !== undefined) { updates.push('email = ?'); values.push(data.email); }

    if (updates.length === 0) return this.findById(id);

    updates.push('updated_at = NOW()');

    const query = `UPDATE companies SET ${updates.join(', ')} WHERE id = ?`;
    values.push(id);

    await this.pool.query(query, values);
    return this.findById(id);
  }

  public async delete(id: number): Promise<boolean> {
    // Check dependencies (Assets)
    const [assets] = await this.pool.query<RowDataPacket[]>("SELECT id FROM assets WHERE supplier_company_id = ? AND deleted_at IS NULL", [id]);
    if (assets.length > 0) throw new Error("No se puede eliminar la empresa porque tiene activos asociados (como proveedor).");

    const query = "DELETE FROM companies WHERE id = ?";
    const [result] = await this.pool.query<ResultSetHeader>(query, [id]);
    return result.affectedRows > 0;
  }
}
