// app/api/assets/[id]/movements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; //
import { getPool } from '@/lib/db'; //
import { RowDataPacket } from 'mysql2/promise';

interface Params {
  id: string; // Asset ID from URL
}

export interface AssetMovementRecord extends RowDataPacket {
  transfer_id: number;
  transfer_date: string; // Formato ISO
  from_section_name: string | null;
  from_location_name: string | null;
  // from_user_name: string | null; // Opcional: Nombre completo del usuario origen
  to_section_name: string | null;
  to_location_name: string | null;
  // to_user_name: string | null; // Opcional: Nombre completo del usuario destino
  authorized_by_user_name: string | null; // Nombre completo
  received_by_user_name: string | null;   // Nombre completo
  received_date: string | null; // Formato ISO
  notes: string | null; // Aquí puede ir el "tipo_ubicacion" u otras notas
  // Otros campos relevantes de asset_transfers si son necesarios
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
        at.transfer_date,
        s_from.name AS from_section_name,
        l_from.name AS from_location_name,
        s_to.name AS to_section_name,
        l_to.name AS to_location_name,
        CONCAT(u_auth.first_name, ' ', u_auth.last_name) AS authorized_by_user_name,
        CONCAT(u_rec.first_name, ' ', u_rec.last_name) AS received_by_user_name,
        at.received_date,
        at.notes
      FROM asset_transfers at
      LEFT JOIN sections s_from ON at.from_section_id = s_from.id
      LEFT JOIN locations l_from ON at.from_location_id = l_from.id
      LEFT JOIN sections s_to ON at.to_section_id = s_to.id
      LEFT JOIN locations l_to ON at.to_location_id = l_to.id
      LEFT JOIN users u_auth ON at.authorized_by_user_id = u_auth.id
      LEFT JOIN users u_rec ON at.received_by_user_id = u_rec.id
      WHERE at.asset_id = ?
      ORDER BY at.transfer_date DESC;
    `;

    const [movements] = await connection.query<AssetMovementRecord[]>(query, [assetId]);

    // Formatear fechas a ISO string para consistencia si no lo están ya
    const formattedMovements = movements.map(mov => ({
      ...mov,
      transfer_date: mov.transfer_date ? new Date(mov.transfer_date).toISOString() : '',
      received_date: mov.received_date ? new Date(mov.received_date).toISOString() : null,
    }));

    return NextResponse.json(formattedMovements, { status: 200 });

  } catch (error) {
    console.error(`API Error GET /api/assets/${assetId}/movements:`, error);
    return NextResponse.json({ message: 'Error interno al obtener el historial de movimientos del activo.' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}