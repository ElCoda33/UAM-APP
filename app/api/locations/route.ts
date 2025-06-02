// app/api/locations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; //
import { getPool } from '@/lib/db'; //
import { RowDataPacket } from 'mysql2/promise';

interface LocationResult extends RowDataPacket {
  id: number;
  name: string;
  section_id?: number;
}

interface SectionIdResult extends RowDataPacket {
  id: number;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  const { searchParams } = new URL(request.url);
  const sectionName = searchParams.get('sectionName');
  const sectionIdParam = searchParams.get('sectionId');

  try {
    let sqlQuery = "SELECT id, name, section_id FROM locations";
    const queryParams: (string | number)[] = [];
    const conditions: string[] = [];

    if (sectionIdParam) {
      const id = parseInt(sectionIdParam, 10);
      if (!isNaN(id)) {
        conditions.push("section_id = ?");
        queryParams.push(id);
      } else {
        // Opcional: devolver error si sectionIdParam no es un número válido
        console.warn("API Locations GET: sectionIdParam no es un número válido:", sectionIdParam);
      }
    } else if (sectionName) {
      const [secRows] = await connection.query<SectionIdResult[]>(
        "SELECT id FROM sections WHERE name = ?",
        [sectionName]
      );
      if (secRows.length > 0) {
        conditions.push("section_id = ?");
        queryParams.push(secRows[0].id);
      } else {
        // Si el nombre de la sección no se encuentra, devolvemos una lista vacía
        // ya que no habrá ubicaciones para una sección inexistente.
        await connection.release();
        return NextResponse.json([], { status: 200 });
      }
    }

    if (conditions.length > 0) {
      sqlQuery += " WHERE " + conditions.join(" AND ");
    }
    sqlQuery += " ORDER BY name ASC";

    const [locations] = await connection.query<LocationResult[]>(sqlQuery, queryParams);
    return NextResponse.json(locations, { status: 200 });

  } catch (error) {
    console.error('API Error GET /api/locations:', error);
    return NextResponse.json({ message: 'Error interno al obtener ubicaciones' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}