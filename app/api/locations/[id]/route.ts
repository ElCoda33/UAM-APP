// app/api/locations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';
import { updateLocationSchema } from '@/lib/schema'; // Schema renombrado
import type { LocationRecord } from '../route'; // Importar la interfaz renombrada

interface Params {
  id: string;
}

// GET una ubicación por ID
export async function GET(request: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  const locationId = parseInt(context.params.id, 10); // Variable renombrada
  if (isNaN(locationId)) {
    return NextResponse.json({ message: 'ID de ubicación inválido' }, { status: 400 });
  }
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    const query = `
      SELECT l.id, l.name, l.description, l.section_id, s.name AS section_name, l.created_at, l.updated_at
      FROM locations l LEFT JOIN sections s ON l.section_id = s.id
      WHERE l.id = ?;
    `;
    const [rows] = await connection.query<LocationRecord[]>(query, [locationId]);
    if (rows.length === 0) return NextResponse.json({ message: 'Ubicación no encontrada' }, { status: 404 });

    const locationData = { // Variable renombrada
      ...rows[0],
      created_at: rows[0].created_at ? new Date(rows[0].created_at).toISOString() : '',
      updated_at: rows[0].updated_at ? new Date(rows[0].updated_at).toISOString() : '',
    };
    return NextResponse.json(locationData, { status: 200 });
  } catch (error) {
    console.error(`API Error GET /api/locations/${locationId}:`, error); // Ruta actualizada
    return NextResponse.json({ message: 'Error interno al obtener la ubicación' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// PUT para actualizar una ubicación
export async function PUT(request: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado para actualizar' }, { status: 401 });
  }
  const locationId = parseInt(context.params.id, 10); // Variable renombrada
  if (isNaN(locationId)) {
    return NextResponse.json({ message: 'ID de ubicación inválido' }, { status: 400 });
  }
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const validation = updateLocationSchema.safeParse(body); // Schema renombrado
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const { name, description, section_id } = validation.data;
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    if (name !== undefined) { updateFields.push("name = ?"); updateValues.push(name); }
    if (description !== undefined) { updateFields.push("description = ?"); updateValues.push(description ?? null); }
    if (section_id !== undefined) {
      if (section_id !== null) {
        const [sectionExists] = await connection.query<RowDataPacket[]>("SELECT id FROM sections WHERE id = ?", [section_id]);
        if (sectionExists.length === 0) return NextResponse.json({ message: `La sección de dependencia con ID '${section_id}' no existe.` }, { status: 400 });
      }
      updateFields.push("section_id = ?"); updateValues.push(section_id ?? null);
    }
    if (updateFields.length === 0) return NextResponse.json({ message: 'No hay campos para actualizar' }, { status: 400 });
    updateFields.push("updated_at = NOW()");
    updateValues.push(locationId);
    const query = `UPDATE locations SET ${updateFields.join(", ")} WHERE id = ?`;
    const [result] = await connection.query(query, updateValues);
    if ((result as any).affectedRows === 0) return NextResponse.json({ message: 'Ubicación no encontrada o sin cambios' }, { status: 404 });

    const [updatedLocationRows] = await connection.query<LocationRecord[]>( // Variable renombrada
      `SELECT l.id, l.name, l.description, l.section_id, s.name as section_name, l.created_at, l.updated_at 
         FROM locations l LEFT JOIN sections s ON l.section_id = s.id WHERE l.id = ?`,
      [locationId]
    );
    return NextResponse.json(updatedLocationRows[0], { status: 200 });
  } catch (error: any) {
    console.error(`API Error PUT /api/locations/${locationId}:`, error); // Ruta actualizada
    if (error.code === 'ER_DUP_ENTRY') return NextResponse.json({ message: 'Error: El nombre de la ubicación ya existe.' }, { status: 409 });
    return NextResponse.json({ message: error.message || 'Error interno al actualizar la ubicación' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// DELETE para eliminar una ubicación
export async function DELETE(request: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado para eliminar' }, { status: 401 });
  }
  const locationId = parseInt(context.params.id, 10); // Variable renombrada
  if (isNaN(locationId)) return NextResponse.json({ message: 'ID de ubicación inválido' }, { status: 400 });
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query("DELETE FROM locations WHERE id = ?", [locationId]);
    if ((result as any).affectedRows === 0) return NextResponse.json({ message: 'Ubicación no encontrada' }, { status: 404 });
    return NextResponse.json({ message: 'Ubicación eliminada correctamente' }, { status: 200 });
  } catch (error: any) {
    console.error(`API Error DELETE /api/locations/${locationId}:`, error); // Ruta actualizada
    if (error.code === 'ER_ROW_IS_REFERENCED_2') return NextResponse.json({ message: 'No se puede eliminar la ubicación porque está referenciada.' }, { status: 409 });
    return NextResponse.json({ message: 'Error interno al eliminar la ubicación' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}