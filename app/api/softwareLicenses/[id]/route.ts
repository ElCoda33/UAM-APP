// app/api/softwareLicenses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { updateSoftwareLicenseSchema } from '@/lib/schema'; // Usamos el schema de actualización
import { SoftwareLicenseAPIRecord } from '../route'; // Importamos la interfaz del GET general

interface ParamsContext {
  params: { id: string };
}

// GET: Obtener una licencia de software específica por ID (activa)
export async function GET(request: NextRequest, context: ParamsContext) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const { id } = context.params;
  const licenseId = parseInt(id, 10);
  if (isNaN(licenseId)) {
    return NextResponse.json({ message: 'ID de licencia inválido' }, { status: 400 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const query = `
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
      WHERE sl.id = ? AND sl.deleted_at IS NULL;
    `;
    const [rows] = await connection.query<SoftwareLicenseAPIRecord[]>(query, [licenseId]);

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Licencia de software no encontrada o eliminada' }, { status: 404 });
    }
    
    const license = {
        ...rows[0],
        assigned_user_name: rows[0].assigned_user_name?.trim() === '' ? null : rows[0].assigned_user_name?.trim(),
        created_at: new Date(rows[0].created_at).toISOString(),
        updated_at: new Date(rows[0].updated_at).toISOString(),
        deleted_at: rows[0].deleted_at ? new Date(rows[0].deleted_at).toISOString() : null,
    };

    return NextResponse.json(license, { status: 200 });
  } catch (error) {
    console.error(`API Error GET /api/softwareLicenses/${licenseId}:`, error);
    return NextResponse.json({ message: 'Error interno al obtener la licencia de software' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// PUT: Actualizar una licencia de software existente
export async function PUT(request: NextRequest, context: ParamsContext) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado para actualizar' }, { status: 401 });
  }

  const { id } = context.params;
  const licenseId = parseInt(id, 10);
  if (isNaN(licenseId)) {
    return NextResponse.json({ message: 'ID de licencia inválido' }, { status: 400 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const body = await request.json();
    const validation = updateSoftwareLicenseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        message: 'Datos de licencia inválidos.',
        errors: validation.error.flatten().fieldErrors,
      }, { status: 400 });
    }
    
    const fieldsToUpdate = validation.data;
    if (Object.keys(fieldsToUpdate).length === 0) {
        return NextResponse.json({ message: 'No se proporcionaron campos para actualizar.' }, { status: 400 });
    }

    // Opcional: Verificar FKs si se están actualizando
    if (fieldsToUpdate.asset_id !== undefined) {
        if (fieldsToUpdate.asset_id !== null) {
            const [assetExists] = await connection.query<RowDataPacket[]>("SELECT id FROM assets WHERE id = ? AND deleted_at IS NULL", [fieldsToUpdate.asset_id]);
            if (assetExists.length === 0) return NextResponse.json({ message: `Activo con ID ${fieldsToUpdate.asset_id} no encontrado o inactivo.` }, { status: 404 });
        }
    }
    if (fieldsToUpdate.supplier_company_id !== undefined) {
        if (fieldsToUpdate.supplier_company_id !== null) {
            const [supplierExists] = await connection.query<RowDataPacket[]>("SELECT id FROM companies WHERE id = ? AND deleted_at IS NULL", [fieldsToUpdate.supplier_company_id]);
            if (supplierExists.length === 0) return NextResponse.json({ message: `Proveedor con ID ${fieldsToUpdate.supplier_company_id} no encontrado o inactivo.` }, { status: 404 });
        }
    }
    if (fieldsToUpdate.assigned_to_user_id !== undefined) {
        if (fieldsToUpdate.assigned_to_user_id !== null) {
            const [userExists] = await connection.query<RowDataPacket[]>("SELECT id FROM users WHERE id = ? AND deleted_at IS NULL", [fieldsToUpdate.assigned_to_user_id]);
            if (userExists.length === 0) return NextResponse.json({ message: `Usuario asignado con ID ${fieldsToUpdate.assigned_to_user_id} no encontrado o inactivo.` }, { status: 404 });
        }
    }

    // Verificar unicidad de license_key si se está cambiando
    if (fieldsToUpdate.license_key !== undefined && fieldsToUpdate.license_key !== null) {
        const [keyExists] = await connection.query<RowDataPacket[]>(
            "SELECT id FROM software_licenses WHERE license_key = ? AND id != ? AND deleted_at IS NULL", 
            [fieldsToUpdate.license_key, licenseId]
        );
        if (keyExists.length > 0) {
            return NextResponse.json({ message: `La clave de licencia '${fieldsToUpdate.license_key}' ya está en uso por otra licencia activa.`, field: 'license_key' }, { status: 409 });
        }
    }
    
    await connection.beginTransaction();

    const setClauses: string[] = [];
    const queryParams: any[] = [];

    Object.entries(fieldsToUpdate).forEach(([key, value]) => {
        setClauses.push(`${key} = ?`);
        // Para campos opcionales que pueden ser null en DB, asegurar que undefined/null se pase como null
        queryParams.push(value === undefined ? null : value);
    });
    
    if (setClauses.length === 0) {
        await connection.rollback(); // No es estrictamente necesario si no hubo queries antes, pero buena práctica
        return NextResponse.json({ message: "No hay datos válidos para actualizar." }, { status: 400 });
    }

    setClauses.push("updated_at = NOW()");
    queryParams.push(licenseId);

    const updateQuery = `UPDATE software_licenses SET ${setClauses.join(", ")} WHERE id = ? AND deleted_at IS NULL`;
    
    const [result] = await connection.query<ResultSetHeader>(updateQuery, queryParams);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json({ message: 'Licencia no encontrada, eliminada, o sin cambios para aplicar' }, { status: 404 });
    }

    await connection.commit();

    // Devolver la licencia actualizada
    const [updatedLicenseRows] = await connection.query<SoftwareLicenseAPIRecord[]>(
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
        [licenseId]
    );
    if (updatedLicenseRows.length > 0) {
        const updatedLicense = {
            ...updatedLicenseRows[0],
            assigned_user_name: updatedLicenseRows[0].assigned_user_name?.trim() === '' ? null : updatedLicenseRows[0].assigned_user_name?.trim(),
            created_at: new Date(updatedLicenseRows[0].created_at).toISOString(),
            updated_at: new Date(updatedLicenseRows[0].updated_at).toISOString(),
        };
         return NextResponse.json({ message: 'Licencia de software actualizada correctamente.', license: updatedLicense }, { status: 200 });
    }
    return NextResponse.json({ message: 'Licencia actualizada, pero no se pudo recuperar.' }, { status: 207 });


  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error(`API Error PUT /api/softwareLicenses/${licenseId}:`, error);
    return NextResponse.json({ message: error.message || 'Error interno al actualizar la licencia.' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// DELETE: Marcar una licencia de software como eliminada (soft delete)
export async function DELETE(request: NextRequest, context: ParamsContext) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado para eliminar' }, { status: 401 });
  }

  const { id } = context.params;
  const licenseId = parseInt(id, 10);
  if (isNaN(licenseId)) {
    return NextResponse.json({ message: 'ID de licencia inválido' }, { status: 400 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    // Opcional: Lógica para verificar si la licencia puede ser eliminada (ej. si está activa y asignada)

    const [result] = await connection.query<ResultSetHeader>(
      "UPDATE software_licenses SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL",
      [licenseId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json({ message: 'Licencia no encontrada o ya eliminada' }, { status: 404 });
    }

    await connection.commit();
    return NextResponse.json({ message: 'Licencia de software marcada como eliminada.' }, { status: 200 });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error(`API Error DELETE /api/softwareLicenses/${licenseId}:`, error);
    return NextResponse.json({ message: error.message || 'Error interno al eliminar la licencia.' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}