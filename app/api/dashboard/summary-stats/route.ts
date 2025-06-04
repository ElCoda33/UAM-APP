// app/api/dashboard/summary-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

interface CountResult extends RowDataPacket {
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
    const [usersCount] = await connection.query<CountResult[]>("SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL");
    const [assetsCount] = await connection.query<CountResult[]>("SELECT COUNT(*) as count FROM assets WHERE deleted_at IS NULL");
    const [sectionsCount] = await connection.query<CountResult[]>("SELECT COUNT(*) as count FROM sections WHERE deleted_at IS NULL");
    const [companiesCount] = await connection.query<CountResult[]>("SELECT COUNT(*) as count FROM companies WHERE deleted_at IS NULL");
    const [locationsCount] = await connection.query<CountResult[]>("SELECT COUNT(*) as count FROM locations WHERE deleted_at IS NULL"); // Asumiendo que locations también tiene soft delete o un filtro similar
    const [licensesCount] = await connection.query<CountResult[]>("SELECT COUNT(*) as count FROM software_licenses WHERE deleted_at IS NULL");


    const summary = {
      users: usersCount[0]?.count || 0,
      assets: assetsCount[0]?.count || 0,
      sections: sectionsCount[0]?.count || 0,
      companies: companiesCount[0]?.count || 0,
      locations: locationsCount[0]?.count || 0,
      softwareLicenses: licensesCount[0]?.count || 0,
    };

    return NextResponse.json(summary, { status: 200 });

  } catch (error) {
    console.error('API Error GET /api/dashboard/summary-stats:', error);
    return NextResponse.json({ message: 'Error interno al obtener las estadísticas del dashboard' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}