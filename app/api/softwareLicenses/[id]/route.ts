// app/api/softwareLicenses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { updateSoftwareLicenseSchema } from '@/lib/schema'; // Schema de actualización con assign_to_asset_ids
import { SoftwareLicenseListAPIRecord } from '../route'; // Interfaz base

export interface AssignedAssetInfo extends RowDataPacket {
    assignment_id: number;
    asset_id: number;
    asset_product_name: string | null;
    asset_inventory_code: string | null;
    installation_date: string | null; // Formato YYYY-MM-DD
    assignment_notes: string | null; // 'notes' de la tabla de unión
}

export interface SoftwareLicenseDetailAPIRecord extends SoftwareLicenseListAPIRecord {
    assigned_assets: AssignedAssetInfo[];
}

interface ParamsContext {
    params: { id: string };
}

// GET: Obtener una licencia específica por ID (activa) y sus activos asignados
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
        const licenseQuery = `
      SELECT 
        sl.id, sl.software_name, sl.software_version, sl.license_key, sl.license_type, 
        sl.seats, DATE_FORMAT(sl.purchase_date, '%Y-%m-%d') AS purchase_date, sl.purchase_cost,
        DATE_FORMAT(sl.expiry_date, '%Y-%m-%d') AS expiry_date,
        sl.supplier_company_id, COALESCE(c.trade_name, c.legal_name) AS supplier_name,
        sl.invoice_number, sl.assigned_to_user_id,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS assigned_user_name,
        sl.notes, sl.created_at, sl.updated_at, sl.deleted_at,
        0 AS assigned_assets_count -- Placeholder, será reemplazado por la longitud del array de assets
      FROM software_licenses sl
      LEFT JOIN companies c ON sl.supplier_company_id = c.id AND c.deleted_at IS NULL
      LEFT JOIN users u ON sl.assigned_to_user_id = u.id AND u.deleted_at IS NULL
      WHERE sl.id = ? AND sl.deleted_at IS NULL;
    `;
        const [licenseRows] = await connection.query<SoftwareLicenseListAPIRecord[]>(licenseQuery, [licenseId]);

        if (licenseRows.length === 0) {
            return NextResponse.json({ message: 'Licencia de software no encontrada o eliminada' }, { status: 404 });
        }

        let licenseDetail: Partial<SoftwareLicenseDetailAPIRecord> = {
            ...licenseRows[0],
            assigned_user_name: licenseRows[0].assigned_user_name?.trim() === '' ? null : licenseRows[0].assigned_user_name?.trim(),
            created_at: new Date(licenseRows[0].created_at).toISOString(),
            updated_at: new Date(licenseRows[0].updated_at).toISOString(),
            deleted_at: licenseRows[0].deleted_at ? new Date(licenseRows[0].deleted_at).toISOString() : null,
        };

        const assignmentsQuery = `
      SELECT 
        asla.id AS assignment_id,
        asla.asset_id, 
        a.product_name AS asset_product_name,
        a.inventory_code AS asset_inventory_code,
        DATE_FORMAT(asla.installation_date, '%Y-%m-%d') AS installation_date,
        asla.notes AS assignment_notes
      FROM asset_software_license_assignments asla
      JOIN assets a ON asla.asset_id = a.id
      WHERE asla.software_license_id = ? AND a.deleted_at IS NULL; 
    `;
        const [assignmentRows] = await connection.query<AssignedAssetInfo[]>(assignmentsQuery, [licenseId]);

        licenseDetail.assigned_assets = assignmentRows;
        licenseDetail.assigned_assets_count = assignmentRows.length;


        return NextResponse.json(licenseDetail as SoftwareLicenseDetailAPIRecord, { status: 200 });
    } catch (error) {
        console.error(`API Error GET /api/softwareLicenses/${licenseId}:`, error);
        return NextResponse.json({ message: 'Error interno al obtener la licencia' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}

// PUT: Actualizar una licencia y sus asignaciones a activos
export async function PUT(request: NextRequest, context: ParamsContext) {
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
        const body = await request.json();
        const validation = updateSoftwareLicenseSchema.safeParse(body); // Usa el schema actualizado

        if (!validation.success) {
            return NextResponse.json({ message: 'Datos inválidos.', errors: validation.error.flatten().fieldErrors }, { status: 400 });
        }

        const { assign_to_asset_ids, ...licenseDataToUpdate } = validation.data;

        if (Object.keys(licenseDataToUpdate).length === 0 && assign_to_asset_ids === undefined) {
            return NextResponse.json({ message: 'No se proporcionaron campos para actualizar.' }, { status: 400 });
        }

        await connection.beginTransaction();

        // 1. Actualizar campos de la tabla software_licenses si hay alguno
        if (Object.keys(licenseDataToUpdate).length > 0) {
            // Verificar unicidad de license_key si se está cambiando
            if (licenseDataToUpdate.license_key !== undefined && licenseDataToUpdate.license_key !== null) {
                const [keyExists] = await connection.query<RowDataPacket[]>(
                    "SELECT id FROM software_licenses WHERE license_key = ? AND id != ? AND deleted_at IS NULL",
                    [licenseDataToUpdate.license_key, licenseId]
                );
                if (keyExists.length > 0) {
                    await connection.rollback();
                    return NextResponse.json({ message: `La clave de licencia '${licenseDataToUpdate.license_key}' ya está en uso.`, field: 'license_key' }, { status: 409 });
                }
            }
            // ... (otras verificaciones de FKs si es necesario para campos en licenseDataToUpdate)

            const setClauses: string[] = [];
            const queryParams: any[] = [];
            Object.entries(licenseDataToUpdate).forEach(([key, value]) => {
                if (value !== undefined) { // Solo actualizar campos que se envían
                    setClauses.push(`${key} = ?`);
                    queryParams.push(value === '' ? null : value);
                }
            });

            if (setClauses.length > 0) {
                setClauses.push("updated_at = NOW()");
                queryParams.push(licenseId);
                const updateLicenseQuery = `UPDATE software_licenses SET ${setClauses.join(", ")} WHERE id = ? AND deleted_at IS NULL`;
                const [result] = await connection.query<ResultSetHeader>(updateLicenseQuery, queryParams);
                // Si result.affectedRows === 0, podría ser que la licencia no exista o ya esté eliminada.
                // O que no hubo cambios reales en los valores.
            }
        }

        // 2. Sincronizar asignaciones en asset_software_license_assignments si se proporcionó assign_to_asset_ids
        if (assign_to_asset_ids !== undefined) {
            // Eliminar asignaciones existentes para esta licencia
            await connection.query("DELETE FROM asset_software_license_assignments WHERE software_license_id = ?", [licenseId]);

            // Crear nuevas asignaciones
            if (assign_to_asset_ids.length > 0) {
                // Validar que todos los asset_ids existen y están activos
                for (const assetId of assign_to_asset_ids) {
                    const [assetExists] = await connection.query<RowDataPacket[]>("SELECT id FROM assets WHERE id = ? AND deleted_at IS NULL", [assetId]);
                    if (assetExists.length === 0) {
                        await connection.rollback();
                        return NextResponse.json({ message: `El activo con ID ${assetId} no existe o está inactivo. No se pueden crear todas las asignaciones.` }, { status: 400 });
                    }
                }
                const newAssignmentValues = assign_to_asset_ids.map(assetId =>
                    [assetId, licenseId, new Date() /* installation_date */]
                );
                await connection.query(
                    "INSERT INTO asset_software_license_assignments (asset_id, software_license_id, installation_date) VALUES ?",
                    [newAssignmentValues]
                );
            }
        }

        await connection.commit();

        // Devolver la licencia actualizada con sus nuevas asignaciones
        // (Similar a la lógica del GET de este mismo archivo)
        // Para brevedad, asumimos que el GET se puede llamar internamente o se reconstruye la respuesta.
        // Aquí solo devolvemos un mensaje de éxito y la licencia actualizada si es fácil.
        const [updatedLicenseRows] = await connection.query<SoftwareLicenseDetailAPIRecord[]>(
            // Query del GET /api/softwareLicenses/[id] para obtener el objeto completo
            `SELECT sl.id, sl.software_name, sl.software_version, sl.license_key, sl.license_type, 
                sl.seats, DATE_FORMAT(sl.purchase_date, '%Y-%m-%d') AS purchase_date, sl.purchase_cost,
                DATE_FORMAT(sl.expiry_date, '%Y-%m-%d') AS expiry_date,
                sl.supplier_company_id, COALESCE(c.trade_name, c.legal_name) AS supplier_name,
                sl.invoice_number, sl.assigned_to_user_id,
                CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS assigned_user_name,
                sl.notes, sl.created_at, sl.updated_at, sl.deleted_at,
                0 AS assigned_assets_count
              FROM software_licenses sl
              LEFT JOIN companies c ON sl.supplier_company_id = c.id AND c.deleted_at IS NULL
              LEFT JOIN users u ON sl.assigned_to_user_id = u.id AND u.deleted_at IS NULL
              WHERE sl.id = ? AND sl.deleted_at IS NULL;`, [licenseId]
        );
        if (updatedLicenseRows.length === 0) {
            return NextResponse.json({ message: 'Licencia actualizada, pero no se pudo recuperar (podría haber sido eliminada).' }, { status: 207 });
        }
        let finalUpdatedLicense: Partial<SoftwareLicenseDetailAPIRecord> = {
            ...updatedLicenseRows[0],
            assigned_user_name: updatedLicenseRows[0].assigned_user_name?.trim() === '' ? null : updatedLicenseRows[0].assigned_user_name?.trim(),
            created_at: new Date(updatedLicenseRows[0].created_at).toISOString(),
            updated_at: new Date(updatedLicenseRows[0].updated_at).toISOString(),
        };
        const [finalAssignmentRows] = await connection.query<AssignedAssetInfo[]>(
            `SELECT asla.id AS assignment_id, asla.asset_id, a.product_name AS asset_product_name, a.inventory_code AS asset_inventory_code,
        DATE_FORMAT(asla.installation_date, '%Y-%m-%d') AS installation_date, asla.notes AS assignment_notes
        FROM asset_software_license_assignments asla JOIN assets a ON asla.asset_id = a.id
        WHERE asla.software_license_id = ? AND a.deleted_at IS NULL;`, [licenseId]
        );
        finalUpdatedLicense.assigned_assets = finalAssignmentRows;
        finalUpdatedLicense.assigned_assets_count = finalAssignmentRows.length;

        return NextResponse.json({ message: 'Licencia actualizada correctamente.', license: finalUpdatedLicense }, { status: 200 });

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
        await connection.beginTransaction();

        // Opcional: antes de hacer soft-delete, podrías querer desasignar de activos
        // await connection.query("DELETE FROM asset_software_license_assignments WHERE software_license_id = ?", [licenseId]);
        // Sin embargo, si la licencia se "restaura" (quitando deleted_at), las asignaciones seguirían ahí, lo cual puede ser deseable.
        // Si mantienes las asignaciones, asegúrate que las queries que muestran asignaciones también filtren por software_licenses.deleted_at IS NULL.

        const [result] = await connection.query<ResultSetHeader>(
            "UPDATE software_licenses SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL",
            [licenseId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return NextResponse.json({ message: 'Licencia no encontrada o ya eliminada' }, { status: 404 });
        }

        await connection.commit();
        return NextResponse.json({ message: 'Licencia marcada como eliminada.' }, { status: 200 });

    } catch (error: any) {
        if (connection) await connection.rollback();
        console.error(`API Error DELETE /api/softwareLicenses/${licenseId}:`, error);
        return NextResponse.json({ message: error.message || 'Error interno al eliminar la licencia.' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}

export interface SoftwareLicenseDetailAPIRecord extends SoftwareLicenseListAPIRecord {
    assigned_assets: AssignedAssetInfo[];
}