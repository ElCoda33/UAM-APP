// app/api/softwareLicenses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { createSoftwareLicenseSchema } from '@/lib/schema'; // Usamos el schema de creación

// Interfaz para el registro de licencia de software devuelto por la API (con datos relacionados)
export interface SoftwareLicenseAPIRecord extends RowDataPacket {
  id: number;
  asset_id: number | null;
  asset_name?: string | null; // assets.product_name
  software_name: string;
  software_version: string | null;
  license_key: string | null;
  license_type: string; // Valor del ENUM
  seats: number;
  purchase_date: string | null; // Formato YYYY-MM-DD
  purchase_cost: number | null;
  expiry_date: string | null; // Formato YYYY-MM-DD
  supplier_company_id: number | null;
  supplier_name?: string | null; // companies.legal_name o trade_name
  invoice_number: string | null;
  assigned_to_user_id: number | null;
  assigned_user_name?: string | null; // users.first_name + users.last_name
  notes: string | null;
  created_at: string; // Formato ISO
  updated_at: string; // Formato ISO
  deleted_at: string | null; // Formato ISO o null
}

// GET: Obtener todas las licencias de software (activas)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search'); // Para búsqueda simple por nombre de software

  try {
    let query = `
      SELECT 
        sl.id, sl.asset_id, a.product_name AS asset_name,
        sl.software_name, sl.software_version, sl.license_key, sl.license_type, sl.seats,
        DATE_FORMAT(sl.purchase_date, '%Y-%m-%d') AS purchase_date,
        sl.purchase_cost,
        DATE_FORMAT(sl.expiry_date, '%Y-%m-%d') AS expiry_date,
        sl.supplier_company_id, COALESCE(c.trade_name, c.legal_name) AS supplier_name,
        sl.invoice_number, sl.assigned_to_user_id,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS assigned_user_name,
        sl.notes, sl.created_at, sl.updated_at, sl.deleted_at
      FROM software_licenses sl
      LEFT JOIN assets a ON sl.asset_id = a.id AND a.deleted_at IS NULL
      LEFT JOIN companies c ON sl.supplier_company_id = c.id AND c.deleted_at IS NULL
      LEFT JOIN users u ON sl.assigned_to_user_id = u.id AND u.deleted_at IS NULL
      WHERE sl.deleted_at IS NULL
    `;
    const queryParams: any[] = [];

    if (searchTerm) {
      query += ` AND (sl.software_name LIKE ? OR sl.license_key LIKE ? OR a.product_name LIKE ?)`;
      queryParams.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
    }
    query += " ORDER BY sl.software_name ASC, sl.created_at DESC";

    const [rows] = await connection.query<SoftwareLicenseAPIRecord[]>(query, queryParams);
    
    const licenses = rows.map(lic => ({
      ...lic,
      assigned_user_name: lic.assigned_user_name?.trim() === '' ? null : lic.assigned_user_name?.trim(),
      created_at: lic.created_at ? new Date(lic.created_at).toISOString() : '',
      updated_at: lic.updated_at ? new Date(lic.updated_at).toISOString() : '',
      deleted_at: lic.deleted_at ? new Date(lic.deleted_at).toISOString() : null,
    }));

    return NextResponse.json(licenses, { status: 200 });
  } catch (error) {
    console.error('API Error GET /api/softwareLicenses:', error);
    return NextResponse.json({ message: 'Error interno al obtener licencias de software' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// POST: Crear una nueva licencia de software
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado para crear licencias' }, { status: 401 });
  }
  // Podrías añadir chequeo de rol aquí si es necesario

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const body = await request.json();
    const validation = createSoftwareLicenseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        message: 'Datos de licencia inválidos.',
        errors: validation.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const {
      asset_id, software_name, software_version, license_key, license_type, seats,
      purchase_date, purchase_cost, expiry_date, supplier_company_id, invoice_number,
      assigned_to_user_id, notes
    } = validation.data;

    // Opcional: Verificar existencia de FKs si no confías plenamente en la UI o quieres errores más descriptivos
    if (asset_id) {
      const [assetExists] = await connection.query<RowDataPacket[]>("SELECT id FROM assets WHERE id = ? AND deleted_at IS NULL", [asset_id]);
      if (assetExists.length === 0) return NextResponse.json({ message: `Activo con ID ${asset_id} no encontrado o inactivo.` }, { status: 404 });
    }
    if (supplier_company_id) {
      const [supplierExists] = await connection.query<RowDataPacket[]>("SELECT id FROM companies WHERE id = ? AND deleted_at IS NULL", [supplier_company_id]);
      if (supplierExists.length === 0) return NextResponse.json({ message: `Proveedor con ID ${supplier_company_id} no encontrado o inactivo.` }, { status: 404 });
    }
    if (assigned_to_user_id) {
      const [userExists] = await connection.query<RowDataPacket[]>("SELECT id FROM users WHERE id = ? AND deleted_at IS NULL", [assigned_to_user_id]);
      if (userExists.length === 0) return NextResponse.json({ message: `Usuario asignado con ID ${assigned_to_user_id} no encontrado o inactivo.` }, { status: 404 });
    }

    // Considerar unicidad de license_key si es relevante para licencias activas
    if (license_key) {
        const [keyExists] = await connection.query<RowDataPacket[]>("SELECT id FROM software_licenses WHERE license_key = ? AND deleted_at IS NULL", [license_key]);
        if (keyExists.length > 0) {
            return NextResponse.json({ message: `La clave de licencia '${license_key}' ya está en uso por una licencia activa.`, field: 'license_key' }, { status: 409 });
        }
    }
    
    await connection.beginTransaction();

    const insertQuery = `
      INSERT INTO software_licenses (
        asset_id, software_name, software_version, license_key, license_type, seats,
        purchase_date, purchase_cost, expiry_date, supplier_company_id, invoice_number,
        assigned_to_user_id, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW());
    `;
    const params = [
      asset_id ?? null, software_name, software_version ?? null, license_key ?? null, license_type, seats,
      purchase_date ?? null, purchase_cost ?? null, expiry_date ?? null, supplier_company_id ?? null, invoice_number ?? null,
      assigned_to_user_id ?? null, notes ?? null
    ];

    const [result] = await connection.query<ResultSetHeader>(insertQuery, params);
    const newLicenseId = result.insertId;

    if (!newLicenseId) {
      await connection.rollback();
      throw new Error('Fallo al crear la licencia de software.');
    }

    await connection.commit();

    // Devolver la licencia recién creada (con datos relacionados)
    const [newLicenseRows] = await connection.query<SoftwareLicenseAPIRecord[]>(
      `SELECT 
        sl.id, sl.asset_id, a.product_name AS asset_name,
        sl.software_name, sl.software_version, sl.license_key, sl.license_type, sl.seats,
        DATE_FORMAT(sl.purchase_date, '%Y-%m-%d') AS purchase_date,
        sl.purchase_cost,
        DATE_FORMAT(sl.expiry_date, '%Y-%m-%d') AS expiry_date,
        sl.supplier_company_id, COALESCE(c.trade_name, c.legal_name) AS supplier_name,
        sl.invoice_number, sl.assigned_to_user_id,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS assigned_user_name,
        sl.notes, sl.created_at, sl.updated_at, sl.deleted_at
      FROM software_licenses sl
      LEFT JOIN assets a ON sl.asset_id = a.id AND a.deleted_at IS NULL
      LEFT JOIN companies c ON sl.supplier_company_id = c.id AND c.deleted_at IS NULL
      LEFT JOIN users u ON sl.assigned_to_user_id = u.id AND u.deleted_at IS NULL
      WHERE sl.id = ?`,
      [newLicenseId]
    );
    
    if (newLicenseRows.length > 0) {
        const createdLicense = {
            ...newLicenseRows[0],
            assigned_user_name: newLicenseRows[0].assigned_user_name?.trim() === '' ? null : newLicenseRows[0].assigned_user_name?.trim(),
            created_at: new Date(newLicenseRows[0].created_at).toISOString(),
            updated_at: new Date(newLicenseRows[0].updated_at).toISOString(),
        };
        return NextResponse.json({ message: 'Licencia de software creada correctamente.', license: createdLicense }, { status: 201 });
    } else {
        // Esto sería inesperado si la inserción fue exitosa
        return NextResponse.json({ message: 'Licencia creada, pero no se pudo recuperar.'}, { status: 207 });
    }

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('API Error POST /api/softwareLicenses:', error);
    return NextResponse.json({ message: error.message || 'Error interno al crear la licencia de software.' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}