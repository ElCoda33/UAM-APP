// app/api/assets/[id]/software-licenses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

interface ParamsContext {
    params: {
        id: string; // Este 'id' es el asset_id
    };
}

// Interfaz para la información de la licencia de software vinculada al activo
export interface AssetLinkedSoftwareLicense extends RowDataPacket {
    software_license_id: number;    // ID de la tabla software_licenses
    software_name: string;
    software_version: string | null;
    license_key: string | null;       // Clave de licencia completa
    license_type: string;
    seats: number | null;             // Puestos de la licencia original
    expiry_date: string | null;       // Fecha de vencimiento de la licencia (YYYY-MM-DD)
    installation_date_on_asset: string | null; // Fecha de instalación en este activo (YYYY-MM-DD)
    assignment_notes: string | null;  // Notas específicas de esta asignación activo-licencia
}

export async function GET(request: NextRequest, context: ParamsContext) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const assetId = parseInt(context.params.id, 10);
    if (isNaN(assetId)) {
        return NextResponse.json({ message: 'ID de activo inválido' }, { status: 400 });
    }

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        const query = `
      SELECT
          sl.id AS software_license_id,
          sl.software_name,
          sl.software_version,
          sl.license_key,
          sl.license_type,
          sl.seats,
          DATE_FORMAT(sl.expiry_date, '%Y-%m-%d') AS expiry_date,
          DATE_FORMAT(asla.installation_date, '%Y-%m-%d') AS installation_date_on_asset,
          asla.notes AS assignment_notes
      FROM
          software_licenses sl
      JOIN
          asset_software_license_assignments asla ON sl.id = asla.software_license_id
      WHERE
          asla.asset_id = ? AND sl.deleted_at IS NULL
      ORDER BY
          sl.software_name ASC;
    `;

        const [rows] = await connection.query<AssetLinkedSoftwareLicense[]>(query, [assetId]);

        // No es necesario formatear fechas aquí porque DATE_FORMAT en SQL ya lo hace.

        return NextResponse.json(rows, { status: 200 });

    } catch (error) {
        console.error(`API Error GET /api/assets/${assetId}/software-licenses:`, error);
        return NextResponse.json({ message: 'Error interno al obtener las licencias de software para el activo' }, { status: 500 });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}