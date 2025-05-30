// app/api/sections/route.ts
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
        const [sections] = await pool.query("SELECT id, name FROM sections ORDER BY name ASC");
        return NextResponse.json(sections, { status: 200 });
    } catch (error) {
        console.error('Error fetching sections:', error);
        return NextResponse.json({ message: 'Error interno al obtener secciones' }, { status: 500 });
    }
}