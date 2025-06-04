// app/api/softwareLicenses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { createSoftwareLicenseSchema } from '@/lib/schema'; // Schema de creación con assign_to_asset_ids

// Interfaz para el listado general de licencias
export interface SoftwareLicenseListAPIRecord extends RowDataPacket {
  id: number;
  software_name: string;
  software_version: string | null;
  license_key: string | null;
  license_type: string;
  seats: number;
  purchase_date: string | null;
  purchase_cost: number | null;
  expiry_date: string | null;
  supplier_company_id: number | null;
  supplier_name?: string | null;
  assigned_to_user_id: number | null;
  assigned_user_name?: string | null;
  notes: string | null;
  assigned_assets_count: number; // Nuevo: Conteo de activos asignados
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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
  const searchTerm = searchParams.get('search');

  try {
    let query = `
      SELECT 
        sl.id, sl.software_name, sl.software_version, sl.license_key, sl.license_type, 
        sl.seats, DATE_FORMAT(sl.purchase_date, '%Y-%m-%d') AS purchase_date, sl.purchase_cost,
        DATE_FORMAT(sl.expiry_date, '%Y-%m-%d') AS expiry_date,
        sl.supplier_company_id, COALESCE(c.trade_name, c.legal_name) AS supplier_name,
        sl.assigned_to_user_id, CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS assigned_user_name,
        sl.notes, sl.created_at, sl.updated_at, sl.deleted_at,
        (SELECT COUNT(*) FROM asset_software_license_assignments asla WHERE asla.software_license_id = sl.id) AS assigned_assets_count
      FROM software_licenses sl
      LEFT JOIN companies c ON sl.supplier_company_id = c.id AND c.deleted_at IS NULL
      LEFT JOIN users u ON sl.assigned_to_user_id = u.id AND u.deleted_at IS NULL
      WHERE sl.deleted_at IS NULL
    `;
    const queryParams: any[] = [];

    if (searchTerm) {
      query += ` AND (sl.software_name LIKE ? OR sl.license_key LIKE ?)`; // Simplificado, puedes añadir más campos
      queryParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }
    query += " ORDER BY sl.software_name ASC, sl.created_at DESC";

    const [rows] = await connection.query<SoftwareLicenseListAPIRecord[]>(query, queryParams);
    
    const licenses = rows.map(lic => ({
      ...lic,
      assigned_user_name: lic.assigned_user_name?.trim() === '' ? null : lic.assigned_user_name?.trim(),
      created_at: new Date(lic.created_at).toISOString(),
      updated_at: new Date(lic.updated_at).toISOString(),
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

// POST: Crear una nueva licencia de software y opcionalmente asignarla a activos
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const body = await request.json();
    const validation = createSoftwareLicenseSchema.safeParse(body); // Usa el schema actualizado

    if (!validation.success) {
      return NextResponse.json({
        message: 'Datos de licencia inválidos.', errors: validation.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const { assign_to_asset_ids, ...licenseData } = validation.data;

    await connection.beginTransaction();

    // Verificar unicidad de license_key si es relevante
    if (licenseData.license_key) {
        const [keyExists] = await connection.query<RowDataPacket[]>("SELECT id FROM software_licenses WHERE license_key = ? AND deleted_at IS NULL", [licenseData.license_key]);
        if (keyExists.length > 0) {
            await connection.rollback();
            return NextResponse.json({ message: `La clave de licencia '${licenseData.license_key}' ya está en uso.`, field: 'license_key' }, { status: 409 });
        }
    }

    // Verificar FKs principales
    if (licenseData.supplier_company_id) { /* ... */ }
    if (licenseData.assigned_to_user_id) { /* ... */ }

    const insertLicenseQuery = `
      INSERT INTO software_licenses (
        software_name, software_version, license_key, license_type, seats,
        purchase_date, purchase_cost, expiry_date, supplier_company_id, invoice_number,
        assigned_to_user_id, notes, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL);
    `;
    const licenseParams = [
      licenseData.software_name, licenseData.software_version ?? null, licenseData.license_key ?? null,
      licenseData.license_type, licenseData.seats, licenseData.purchase_date ?? null,
      licenseData.purchase_cost ?? null, licenseData.expiry_date ?? null,
      licenseData.supplier_company_id ?? null, licenseData.invoice_number ?? null,
      licenseData.assigned_to_user_id ?? null, licenseData.notes ?? null
    ];

    const [resultLicense] = await connection.query<ResultSetHeader>(insertLicenseQuery, licenseParams);
    const newLicenseId = resultLicense.insertId;

    if (!newLicenseId) {
      await connection.rollback();
      throw new Error('Fallo al crear la licencia de software.');
    }

    // Asignar a activos si se proporcionaron IDs
    if (assign_to_asset_ids && assign_to_asset_ids.length > 0) {
      for (const assetId of assign_to_asset_ids) {
        const [assetExists] = await connection.query<RowDataPacket[]>("SELECT id FROM assets WHERE id = ? AND deleted_at IS NULL", [assetId]);
        if (assetExists.length === 0) {
          await connection.rollback();
          return NextResponse.json({ message: `El activo con ID ${assetId} no existe o está inactivo.` }, { status: 400 });
        }
      }
      const assignmentValues = assign_to_asset_ids.map(assetId => 
        [assetId, newLicenseId, new Date() /* installation_date */]
      );
      await connection.query(
        "INSERT INTO asset_software_license_assignments (asset_id, software_license_id, installation_date) VALUES ?",
        [assignmentValues]
      );
    }

    await connection.commit();

    // Devolver la licencia recién creada (podríamos hacer un fetch completo aquí si es necesario)
    const [createdLicenseRows] = await connection.query<SoftwareLicenseListAPIRecord[]>(
        `SELECT sl.*, 
        (SELECT COUNT(*) FROM asset_software_license_assignments asla WHERE asla.software_license_id = sl.id) AS assigned_assets_count,
        COALESCE(c.trade_name, c.legal_name) AS supplier_name,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS assigned_user_name
         FROM software_licenses sl 
         LEFT JOIN companies c ON sl.supplier_company_id = c.id AND c.deleted_at IS NULL
         LEFT JOIN users u ON sl.assigned_to_user_id = u.id AND u.deleted_at IS NULL
         WHERE sl.id = ?`, [newLicenseId]
    );
     if (createdLicenseRows.length > 0) {
        const license = {
            ...createdLicenseRows[0],
            assigned_user_name: createdLicenseRows[0].assigned_user_name?.trim() === '' ? null : createdLicenseRows[0].assigned_user_name?.trim(),
            created_at: new Date(createdLicenseRows[0].created_at).toISOString(),
            updated_at: new Date(createdLicenseRows[0].updated_at).toISOString(),
        };
        return NextResponse.json({ message: 'Licencia creada y asignada correctamente.', license: license }, { status: 201 });
    }
    return NextResponse.json({ message: 'Licencia creada, pero error al recuperarla.'}, {status: 207});


  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('API Error POST /api/softwareLicenses:', error);
    return NextResponse.json({ message: error.message || 'Error interno al crear la licencia.' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}