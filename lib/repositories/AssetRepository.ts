import { BaseRepository, IPaginatedResult, IPaginationOptions } from './BaseRepository';
import { IAssetAPI, createAssetSchema } from '@/lib/schema';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

export interface IAssetFilters {
  searchText?: string;
  searchAttribute?: string;
  status?: string | string[];
  purchaseDateFrom?: string;
  purchaseDateTo?: string;
}

export class AssetRepository extends BaseRepository {

  public async findAll(options: IPaginationOptions, filters: IAssetFilters): Promise<IPaginatedResult<IAssetAPI>> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = this.getOffset(page, limit);

    let whereClause = 'WHERE a.deleted_at IS NULL';
    const params: any[] = [];

    if (filters.status) {
      if (Array.isArray(filters.status) && filters.status.length > 0) {
        whereClause += ' AND a.status IN (?)';
        params.push(filters.status);
      } else if (typeof filters.status === 'string') {
        whereClause += ' AND a.status = ?';
        params.push(filters.status);
      }
    }

    if (filters.searchText && filters.searchAttribute) {
      // Validate searchAttribute to prevent SQL injection
      const allowedAttributes = ['product_name', 'serial_number', 'inventory_code', 'description', 'invoice_number'];
      if (allowedAttributes.includes(filters.searchAttribute)) {
        whereClause += ` AND a.${filters.searchAttribute} LIKE ?`;
        params.push(`%${filters.searchText}%`);
      }
    }

    if (filters.purchaseDateFrom) {
      whereClause += ' AND a.purchase_date >= ?';
      params.push(filters.purchaseDateFrom);
    }

    if (filters.purchaseDateTo) {
      whereClause += ' AND a.purchase_date <= ?';
      params.push(filters.purchaseDateTo);
    }

    const countQuery = `SELECT COUNT(*) as total FROM assets a ${whereClause}`;
    const [countRows] = await this.pool.query<RowDataPacket[]>(countQuery, params);
    const total = countRows[0].total;

    const query = `
            SELECT
                a.id,
                a.serial_number,
                a.inventory_code,
                a.description,
                a.product_name,
                DATE_FORMAT(a.warranty_expiry_date, '%Y-%m-%d') AS warranty_expiry_date,
                a.current_section_id,
                s.name AS current_section_name,
                a.current_location_id,
                l.name AS current_location_name,
                a.supplier_company_id,
                c.legal_name AS supplier_company_name,
                c.tax_id AS supplier_company_tax_id,
                DATE_FORMAT(a.purchase_date, '%Y-%m-%d') AS purchase_date,
                a.invoice_number,
                a.acquisition_procedure,
                a.status,
                a.image_url,
                a.status,
                a.image_url,
                a.asset_type,
                a.it_device_type,
                a.ip_address,
                a.created_at,
                a.updated_at
            FROM assets a
            LEFT JOIN sections s ON a.current_section_id = s.id
            LEFT JOIN locations l ON a.current_location_id = l.id
            LEFT JOIN companies c ON a.supplier_company_id = c.id
            ${whereClause}
            ORDER BY a.created_at DESC
            LIMIT ? OFFSET ?
        `;

    // LIMIT and OFFSET params must be integers
    params.push(limit);
    params.push(offset);

    const [rows] = await this.pool.query<IAssetAPI[]>(query, params);

    const assetsWithISOStrings = rows.map((asset: IAssetAPI) => ({
      ...asset,
      created_at: asset.created_at ? new Date(asset.created_at).toISOString() : '',
      updated_at: asset.updated_at ? new Date(asset.updated_at).toISOString() : '',
    }));

    return {
      data: assetsWithISOStrings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  public async findAllWithFilters(filters: IAssetFilters & { sort?: { column: string; direction: 'ascending' | 'descending' } }): Promise<IAssetAPI[]> {
    let whereClause = 'WHERE a.deleted_at IS NULL';
    const params: any[] = [];

    if (filters.status) {
      if (Array.isArray(filters.status) && filters.status.length > 0) {
        whereClause += ' AND a.status IN (?)';
        params.push(filters.status);
      } else if (typeof filters.status === 'string') {
        whereClause += ' AND a.status = ?';
        params.push(filters.status);
      }
    }

    if (filters.searchText && filters.searchAttribute) {
      const allowedAttributes = ['product_name', 'serial_number', 'inventory_code', 'description', 'invoice_number'];
      if (allowedAttributes.includes(filters.searchAttribute)) {
        whereClause += ` AND a.${filters.searchAttribute} LIKE ?`;
        params.push(`%${filters.searchText}%`);
      }
    }

    if (filters.purchaseDateFrom) {
      whereClause += ' AND a.purchase_date >= ?';
      params.push(filters.purchaseDateFrom);
    }

    if (filters.purchaseDateTo) {
      whereClause += ' AND a.purchase_date <= ?';
      params.push(filters.purchaseDateTo);
    }

    let orderBy = 'ORDER BY a.created_at DESC';
    if (filters.sort && filters.sort.column) {
      let sortColumnDb = 'a.created_at';
      switch (filters.sort.column) {
        case 'product_name': sortColumnDb = 'a.product_name'; break;
        case 'serial_number': sortColumnDb = 'a.serial_number'; break;
        case 'inventory_code': sortColumnDb = 'a.inventory_code'; break;
        case 'status': sortColumnDb = 'a.status'; break;
        case 'purchase_date': sortColumnDb = 'a.purchase_date'; break;
        case 'warranty_expiry_date': sortColumnDb = 'a.warranty_expiry_date'; break;
        case 'current_section_name': sortColumnDb = 's.name'; break;
        case 'current_location_name': sortColumnDb = 'l.name'; break;
        case 'supplier_company_name': sortColumnDb = 'c.legal_name'; break;
      }
      const sortDirectionDb = filters.sort.direction === 'descending' ? 'DESC' : 'ASC';
      orderBy = `ORDER BY ${sortColumnDb} ${sortDirectionDb}`;
    }

    const query = `
            SELECT
                a.id,
                a.serial_number,
                a.inventory_code,
                a.description,
                a.product_name,
                DATE_FORMAT(a.warranty_expiry_date, '%Y-%m-%d') AS warranty_expiry_date,
                a.current_section_id,
                s.name AS current_section_name,
                a.current_location_id,
                l.name AS current_location_name,
                a.supplier_company_id,
                c.legal_name AS supplier_company_name,
                c.tax_id AS supplier_company_tax_id,
                DATE_FORMAT(a.purchase_date, '%Y-%m-%d') AS purchase_date,
                a.invoice_number,
                a.acquisition_procedure,
                a.status,
                a.image_url,
                a.status,
                a.image_url,
                a.asset_type,
                a.it_device_type,
                a.ip_address,
                a.uplink_asset_id,
                a.created_at,
                a.updated_at
            FROM assets a
            LEFT JOIN sections s ON a.current_section_id = s.id
            LEFT JOIN locations l ON a.current_location_id = l.id
            LEFT JOIN companies c ON a.supplier_company_id = c.id
            ${whereClause}
            ${orderBy}
        `;

    const [rows] = await this.pool.query<IAssetAPI[]>(query, params);

    return rows.map((asset: IAssetAPI) => ({
      ...asset,
      created_at: asset.created_at ? new Date(asset.created_at).toISOString() : '',
      updated_at: asset.updated_at ? new Date(asset.updated_at).toISOString() : '',
    }));
  }

  public async findById(id: number): Promise<IAssetAPI | null> {
    const query = `
            SELECT
                a.id,
                a.serial_number,
                a.inventory_code,
                a.description,
                a.product_name,
                DATE_FORMAT(a.warranty_expiry_date, '%Y-%m-%d') AS warranty_expiry_date,
                a.current_section_id,
                s.name AS current_section_name,
                a.current_location_id,
                l.name AS current_location_name,
                a.supplier_company_id,
                c.legal_name AS supplier_company_name,
                c.tax_id AS supplier_company_tax_id,
                DATE_FORMAT(a.purchase_date, '%Y-%m-%d') AS purchase_date,
                a.invoice_number,
                a.acquisition_procedure,
                a.status,
                a.image_url,
                a.status,
                a.image_url,
                a.asset_type,
                a.it_device_type,
                a.ip_address,
                a.uplink_asset_id,
                a.created_at,
                a.updated_at
            FROM assets a
            LEFT JOIN sections s ON a.current_section_id = s.id
            LEFT JOIN locations l ON a.current_location_id = l.id
            LEFT JOIN companies c ON a.supplier_company_id = c.id
            WHERE a.id = ? AND a.deleted_at IS NULL
        `;
    const [rows] = await this.pool.query<IAssetAPI[]>(query, [id]);

    if (rows.length === 0) return null;

    const asset = rows[0];
    return {
      ...asset,
      created_at: asset.created_at ? new Date(asset.created_at).toISOString() : '',
      updated_at: asset.updated_at ? new Date(asset.updated_at).toISOString() : '',
    };
  }

  public async create(assetData: any): Promise<number> {
    const connection = await this.getConnection();
    try {
      const query = `
                INSERT INTO assets(
                  product_name, serial_number, inventory_code, description,
                  current_section_id, current_location_id, supplier_company_id,
                  purchase_date, invoice_number, warranty_expiry_date,
                  acquisition_procedure, status, image_url,
                  asset_type, it_device_type, ip_address, subnet_mask, uplink_asset_id,
                  created_at, updated_at
                ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW());
              `;
      const params = [
        assetData.product_name, assetData.serial_number || null, assetData.inventory_code,
        assetData.description || null, assetData.current_section_id,
        assetData.current_location_id || null, assetData.supplier_company_id || null,
        assetData.purchase_date || null, assetData.invoice_number || null,
        assetData.warranty_expiry_date || null, assetData.acquisition_procedure || null,
        assetData.status, assetData.image_url || null,
        assetData.asset_type || 'general', assetData.it_device_type || null, assetData.ip_address || null,
        assetData.subnet_mask || null, assetData.uplink_asset_id || null,
      ];

      const [result] = await connection.query<ResultSetHeader>(query, params);
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  public async update(id: number, assetData: any): Promise<boolean> {
    const query = `
            UPDATE assets SET
                product_name = ?, serial_number = ?, inventory_code = ?, description = ?,
                current_section_id = ?, current_location_id = ?, supplier_company_id = ?,
                purchase_date = ?, invoice_number = ?, warranty_expiry_date = ?,
                acquisition_procedure = ?, status = ?, image_url = ?,
                asset_type = ?, it_device_type = ?, ip_address = ?, subnet_mask = ?, uplink_asset_id = ?,
                updated_at = NOW()
            WHERE id = ? AND deleted_at IS NULL
        `;
    const params = [
      assetData.product_name, assetData.serial_number || null, assetData.inventory_code,
      assetData.description || null, assetData.current_section_id,
      assetData.current_location_id || null, assetData.supplier_company_id || null,
      assetData.purchase_date || null, assetData.invoice_number || null,
      assetData.warranty_expiry_date || null, assetData.acquisition_procedure || null,
      assetData.status, assetData.image_url || null,
      assetData.asset_type || 'general', assetData.it_device_type || null, assetData.ip_address || null,
      assetData.subnet_mask || null, assetData.uplink_asset_id || null,
      id
    ];

    const [result] = await this.pool.query<ResultSetHeader>(query, params);
    return result.affectedRows > 0;
  }

  public async delete(id: number): Promise<boolean> {
    const query = 'UPDATE assets SET deleted_at = NOW() WHERE id = ?';
    const [result] = await this.pool.query<ResultSetHeader>(query, [id]);
    return result.affectedRows > 0;
  }

  public async checkInventoryCodeExists(code: string): Promise<boolean> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      "SELECT id FROM assets WHERE inventory_code = ? AND deleted_at IS NULL",
      [code]
    );
    return rows.length > 0;
  }

  public async checkSerialNumberExists(serial: string): Promise<boolean> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      "SELECT id FROM assets WHERE serial_number = ? AND deleted_at IS NULL",
      [serial]
    );
    return rows.length > 0;
  }
}
