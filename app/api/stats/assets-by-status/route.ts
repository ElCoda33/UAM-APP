// app/api/stats/assets-by-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

interface AssetStatusCount extends RowDataPacket {
  status: string;
  count: number;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const query = `
            SELECT 
                status, 
                COUNT(*) as count 
            FROM assets 
            WHERE deleted_at IS NULL 
            GROUP BY status 
            ORDER BY count DESC;
        `;

    const [rows] = await connection.query<AssetStatusCount[]>(query);

    // Mapear los valores de status a etiquetas más legibles si es necesario aquí
    // o hacerlo en el frontend. Por ahora, devolvemos los status raw de la DB.

    return NextResponse.json(rows, { status: 200 });

  } catch (error) {
    console.error('API Error GET /api/stats/assets-by-status:', error);
    return NextResponse.json({ message: 'Error interno al obtener estadísticas de activos por estado' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}