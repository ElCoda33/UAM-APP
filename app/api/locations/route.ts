// app/api/locations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';
import { createLocationSchema } from '@/lib/schema'; // Schema renombrado

export interface LocationRecord extends RowDataPacket { // Interfaz renombrada
  id: number;
  name: string;
  description: string | null;
  section_id: number | null;
  section_name: string | null;
  created_at: string;
  updated_at: string;
}

// GET todas las ubicaciones
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search');
  const sectionIdFilter = searchParams.get('sectionId');

  try {
    let query = `
      SELECT 
        l.id, l.name, l.description, l.section_id, s.name AS section_name,
        l.created_at, l.updated_at
      FROM locations l
      LEFT JOIN sections s ON l.section_id = s.id
    `;
    const queryParams: any[] = [];
    const conditions: string[] = [];

    if (searchTerm) {
      conditions.push("(l.name LIKE ? OR l.description LIKE ? OR s.name LIKE ?)");
      const searchPattern = `%${searchTerm}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }
    if (sectionIdFilter) {
      const sId = parseInt(sectionIdFilter, 10);
      if (!isNaN(sId)) {
        conditions.push("l.section_id = ?");
        queryParams.push(sId);
      }
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY l.name ASC";

    const [rows] = await connection.query<LocationRecord[]>(query, queryParams);
    const locations = rows.map(loc => ({ // Variable renombrada
      ...loc,
      created_at: loc.created_at ? new Date(loc.created_at).toISOString() : '',
      updated_at: loc.updated_at ? new Date(loc.updated_at).toISOString() : '',
    }));
    return NextResponse.json(locations, { status: 200 });
  } catch (error) {
    console.error('API Error GET /api/locations:', error); // Ruta actualizada en log
    return NextResponse.json({ message: 'Error interno al obtener ubicaciones' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// POST para crear una nueva ubicación
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado para crear ubicaciones' }, { status: 401 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const body = await request.json();
    const validation = createLocationSchema.safeParse(body); // Schema renombrado

    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const { name, description, section_id } = validation.data;

    const [existingLocation] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM locations WHERE name = ?", [name]
    );
    if (existingLocation.length > 0) {
      return NextResponse.json({ message: `La ubicación con el nombre '${name}' ya existe.` }, { status: 409 });
    }
    if (section_id) {
      const [sectionExists] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM sections WHERE id = ?", [section_id]
      );
      if (sectionExists.length === 0) {
        return NextResponse.json({ message: `La sección de dependencia con ID '${section_id}' no existe.` }, { status: 400 });
      }
    }

    const [result] = await connection.query(
      "INSERT INTO locations (name, description, section_id, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
      [name, description ?? null, section_id]
    );
    const insertId = (result as any).insertId;
    if (!insertId) throw new Error("No se pudo crear la ubicación.");

    const [newLocationRows] = await connection.query<LocationRecord[]>( // Variable renombrada
      `SELECT l.id, l.name, l.description, l.section_id, s.name as section_name, l.created_at, l.updated_at 
         FROM locations l LEFT JOIN sections s ON l.section_id = s.id WHERE l.id = ?`,
      [insertId]
    );
    return NextResponse.json(newLocationRows[0], { status: 201 });
  } catch (error: any) {
    console.error('API Error POST /api/locations:', error); // Ruta actualizada en log
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ message: 'Error: El nombre de la ubicación ya existe.' }, { status: 409 });
    }
    return NextResponse.json({ message: error.message || 'Error interno al crear la ubicación' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}