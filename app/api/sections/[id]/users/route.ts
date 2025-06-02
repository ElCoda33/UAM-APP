// app/api/sections/[id]/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

interface Params {
  id: string; // Section ID
}

export interface SectionUserRecord extends RowDataPacket {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  // roles: string | null; // Estaba comentado, lo mantendremos así por ahora
}

export async function GET(request: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const sectionId = parseInt(context.params.id, 10);
  if (isNaN(sectionId)) {
    return NextResponse.json({ message: 'ID de sección inválido' }, { status: 400 });
  }

  const pool = getPool();
  let connection; // Declarar fuera para el bloque finally

  try {
    connection = await pool.getConnection(); // Obtener conexión

    const query = `
      SELECT 
        u.id AS user_id, /* Asegúrate que tu tabla users tenga 'id' y no 'user_id' como PK */
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url
      FROM users u
      WHERE u.section_id = ?
      ORDER BY u.last_name ASC, u.first_name ASC;
    `;

    // console.log(`API /api/sections/${sectionId}/users: Executing query: ${query} with sectionId: ${sectionId}`); // Log para depuración
    const [users] = await connection.query<SectionUserRecord[]>(query, [sectionId]);
    // console.log(`API /api/sections/${sectionId}/users: Query result - ${users.length} users found.`); // Log para depuración

    return NextResponse.json(users, { status: 200 });

  } catch (error: any) { // Captura cualquier error
    console.error(`API Error GET /api/sections/${sectionId}/users:`, error); // ESTE ES EL LOG IMPORTANTE
    return NextResponse.json({ message: 'Error interno al obtener usuarios de la sección', errorDetails: error.message }, { status: 500 });
  } finally {
    if (connection) {
      try {
        await connection.release();
      } catch (releaseError) {
        console.error(`API Error GET /api/sections/${sectionId}/users - Error releasing connection:`, releaseError);
      }
    }
  }
}