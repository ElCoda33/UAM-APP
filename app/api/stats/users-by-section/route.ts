// app/api/stats/users-by-section/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

interface UsersBySectionCount extends RowDataPacket {
  section_id: number;
  section_name: string;
  user_count: number;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    // Contar usuarios activos por sección activa
    const query = `
            SELECT 
                s.id as section_id,
                s.name as section_name, 
                COUNT(u.id) as user_count
            FROM users u
            JOIN sections s ON u.section_id = s.id
            WHERE u.deleted_at IS NULL AND s.deleted_at IS NULL 
            GROUP BY s.id, s.name
            ORDER BY user_count DESC;
        `;

    const [rows] = await connection.query<UsersBySectionCount[]>(query);

    return NextResponse.json(rows, { status: 200 });

  } catch (error) {
    console.error('API Error GET /api/stats/users-by-section:', error);
    return NextResponse.json({ message: 'Error interno al obtener estadísticas de usuarios por sección' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}