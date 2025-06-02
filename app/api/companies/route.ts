// app/api/companies/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; //
import { getPool } from '@/lib/db'; //
import { RowDataPacket } from 'mysql2/promise';

interface CompanyOption extends RowDataPacket {
  id: number;
  name: string; // Usaremos un COALESCE para obtener el nombre comercial o legal
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const pool = getPool();
    // Tu tabla 'companies' tiene 'id', 'legal_name', 'trade_name'
    const query = "SELECT id, COALESCE(trade_name, legal_name) as name FROM companies ORDER BY name ASC";
    const [companies] = await pool.query<CompanyOption[]>(query);
    return NextResponse.json(companies, { status: 200 });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ message: 'Error interno al obtener empresas' }, { status: 500 });
  }
}