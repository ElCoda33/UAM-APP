// app/api/sections/[id]/subsections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

interface Params {
  id: string; // Parent Section ID
}

// Usaremos la interfaz SectionRecord existente si es adecuada, o una más simple
export interface SubSectionRecord extends RowDataPacket {
  id: number;
  name: string;
  management_level: number | null;
  email: string | null;
  // Podrías contar cuántos usuarios o sub-subsecciones tiene cada una si fuera necesario
}

export async function GET(request: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const parentSectionId = parseInt(context.params.id, 10);
  if (isNaN(parentSectionId)) {
    return NextResponse.json({ message: 'ID de sección padre inválido' }, { status: 400 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const query = `
      SELECT 
        id, 
        name,
        management_level,
        email
      FROM sections
      WHERE parent_section_id = ?
      ORDER BY name ASC;
    `;

    const [subsections] = await connection.query<SubSectionRecord[]>(query, [parentSectionId]);
    return NextResponse.json(subsections, { status: 200 });

  } catch (error) {
    console.error(`API Error GET /api/sections/${parentSectionId}/subsections:`, error);
    return NextResponse.json({ message: 'Error interno al obtener subsecciones' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}