// app/api/assets/[id]/movements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise'; // Importa RowDataPacket

interface Params {
  id: string; // Asset ID from URL
}

// Definición de la interfaz expandida (puedes moverla a un archivo .d.ts si la usas en varios lugares)
export interface AssetMovementRecord extends RowDataPacket {
  transfer_id: number;
  asset_id: number;
  transfer_date: string;
  from_section_id: number | null;
  from_section_name: string | null;
  from_location_id: number | null;
  from_location_name: string | null;
  from_user_id: number | null;
  from_user_name: string | null;
  to_section_id: number | null;
  to_section_name: string | null;
  to_location_id: number | null;
  to_location_name: string | null;
  to_user_id: number | null;
  to_user_name: string | null;
  authorized_by_user_id: number | null;
  authorized_by_user_name: string | null;
  authorized_by_user_ci: string | null;
  received_by_user_id: number | null;
  received_by_user_name: string | null;
  received_by_user_ci: string | null;
  received_by_user_section_name: string | null;
  received_date: string | null;
  transfer_reason: string | null;
  notes: string | null;
  signature_image_url: string | null;
  transfer_created_at: string;
}

export async function GET(request: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const assetId = parseInt(context.params.id, 10);
  if (isNaN(assetId)) {
    return NextResponse.json({ message: 'ID de activo inválido.' }, { status: 400 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const query = `
      SELECT
        at.id AS transfer_id,
        at.asset_id,
        at.transfer_date,
        
        at.from_section_id,
        s_from.name AS from_section_name,
        at.from_location_id,
        l_from.name AS from_location_name,
        at.from_user_id,
        CONCAT(COALESCE(u_from.first_name, ''), ' ', COALESCE(u_from.last_name, '')) AS from_user_name,
        
        at.to_section_id,
        s_to.name AS to_section_name,
        at.to_location_id,
        l_to.name AS to_location_name,
        at.to_user_id,
        CONCAT(COALESCE(u_to.first_name, ''), ' ', COALESCE(u_to.last_name, '')) AS to_user_name,

        at.authorized_by_user_id,
        CONCAT(COALESCE(u_auth.first_name, ''), ' ', COALESCE(u_auth.last_name, '')) AS authorized_by_user_name,
        u_auth.national_id AS authorized_by_user_ci,

        at.received_by_user_id,
        CONCAT(COALESCE(u_rec.first_name, ''), ' ', COALESCE(u_rec.last_name, '')) AS received_by_user_name,
        u_rec.national_id AS received_by_user_ci,
        s_rec.name AS received_by_user_section_name,

        at.received_date,
        at.transfer_reason,
        at.notes,
        at.signature_image_url,
        at.created_at AS transfer_created_at
      FROM asset_transfers at
      LEFT JOIN sections s_from ON at.from_section_id = s_from.id
      LEFT JOIN locations l_from ON at.from_location_id = l_from.id
      LEFT JOIN users u_from ON at.from_user_id = u_from.id
      LEFT JOIN sections s_to ON at.to_section_id = s_to.id
      LEFT JOIN locations l_to ON at.to_location_id = l_to.id
      LEFT JOIN users u_to ON at.to_user_id = u_to.id
      LEFT JOIN users u_auth ON at.authorized_by_user_id = u_auth.id
      LEFT JOIN users u_rec ON at.received_by_user_id = u_rec.id
      LEFT JOIN sections s_rec ON u_rec.section_id = s_rec.id
      WHERE at.asset_id = ?
      ORDER BY at.transfer_date DESC;
    `;

    const [movementsFromDb] = await connection.query<AssetMovementRecord[]>(query, [assetId]);

    // Formatear fechas a ISO string para consistencia
    const formattedMovements = movementsFromDb.map(mov => ({
      ...mov,
      transfer_date: mov.transfer_date ? new Date(mov.transfer_date).toISOString() : '',
      received_date: mov.received_date ? new Date(mov.received_date).toISOString() : null,
      transfer_created_at: mov.transfer_created_at ? new Date(mov.transfer_created_at).toISOString() : '',
      // Limpiar nombres concatenados si ambos first_name y last_name son NULL para evitar un espacio solitario.
      from_user_name: (mov.from_user_name && mov.from_user_name.trim() !== '') ? mov.from_user_name.trim() : null,
      to_user_name: (mov.to_user_name && mov.to_user_name.trim() !== '') ? mov.to_user_name.trim() : null,
      authorized_by_user_name: (mov.authorized_by_user_name && mov.authorized_by_user_name.trim() !== '') ? mov.authorized_by_user_name.trim() : null,
      received_by_user_name: (mov.received_by_user_name && mov.received_by_user_name.trim() !== '') ? mov.received_by_user_name.trim() : null,
    }));

    return NextResponse.json(formattedMovements, { status: 200 });

  } catch (error) {
    console.error(`API Error GET /api/assets/${assetId}/movements:`, error);
    return NextResponse.json({ message: 'Error interno al obtener el historial de movimientos del activo.' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}