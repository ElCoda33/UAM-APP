// app/api/roles/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    try {
        const pool = getPool();
        const [roles] = await pool.query("SELECT id, name FROM roles ORDER BY name ASC");
        return NextResponse.json(roles, { status: 200 });
    } catch (error) {
        console.error('Error fetching roles:', error);
        return NextResponse.json({ message: 'Error interno al obtener roles' }, { status: 500 });
    }
}