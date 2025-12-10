import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { ResultSetHeader } from 'mysql2/promise';

interface Params {
  id: string;
  connectionId: string;
}

export async function DELETE(request: Request, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const { id, connectionId } = context.params;
  const assetId = parseInt(id);
  const connId = parseInt(connectionId);

  if (isNaN(assetId) || isNaN(connId)) {
    return NextResponse.json({ message: 'IDs inválidos' }, { status: 400 });
  }

  try {
    const pool = getPool();

    // Delete connection ensuring it belongs to the asset
    const query = `DELETE FROM asset_network_connections WHERE id = ? AND asset_id = ?`;
    const [result] = await pool.query<ResultSetHeader>(query, [connId, assetId]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'Conexión no encontrada o no pertenece a este activo' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Conexión eliminada correctamente' }, { status: 200 });

  } catch (error: any) {
    console.error(`API Error DELETE /api/assets/${assetId}/connections/${connId}:`, error);
    return NextResponse.json({ message: 'Error al eliminar conexión', error: error.message }, { status: 500 });
  }
}
