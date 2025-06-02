// app/api/sections/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { updateSectionSchema } from '@/lib/schema';
import type { SectionRecord } from '../route';

interface Params {
  id: string;
}

// GET una sección activa por ID
export async function GET(request: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  const sectionId = parseInt(context.params.id, 10);
  if (isNaN(sectionId)) return NextResponse.json({ message: 'ID de sección inválido' }, { status: 400 });

  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    const query = `
      SELECT s.id, s.name, s.management_level, s.email, s.parent_section_id, 
             p.name AS parent_section_name, s.created_at, s.updated_at, s.deleted_at
      FROM sections s LEFT JOIN sections p ON s.parent_section_id = p.id
      WHERE s.id = ? AND s.deleted_at IS NULL; -- <<< SOLO SECCIÓN ACTIVA
    `;
    const [rows] = await connection.query<SectionRecord[]>(query, [sectionId]);
    if (rows.length === 0) return NextResponse.json({ message: 'Sección no encontrada o eliminada' }, { status: 404 });

    const section = { ...rows[0], /* ... formateo de fechas ... */ };
    return NextResponse.json(section, { status: 200 });
  } catch (error) { /* ... */ }
  finally { if (connection) connection.release(); }
}

// PUT para actualizar una sección activa
export async function PUT(request: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const sectionId = parseInt(context.params.id, 10);
  if (isNaN(sectionId)) return NextResponse.json({ message: 'ID inválido' }, { status: 400 });

  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const validation = updateSectionSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ message: 'Datos inválidos', errors: validation.error.flatten().fieldErrors }, { status: 400 });

    const { name, management_level, email, parent_section_id } = validation.data;
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    // Verificar unicidad de 'name' y 'email' si cambian, excluyendo el registro actual
    if (name !== undefined) {
      const [existingName] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM sections WHERE name = ? AND id != ? AND deleted_at IS NULL", [name, sectionId]
      );
      if (existingName.length > 0) return NextResponse.json({ message: `El nombre '${name}' ya está en uso.` }, { status: 409 });
      updateFields.push("name = ?"); updateValues.push(name);
    }
    if (email !== undefined && email !== null) { // Solo verificar si se proporciona un email
      const [existingEmail] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM sections WHERE email = ? AND id != ? AND deleted_at IS NULL", [email, sectionId]
      );
      if (existingEmail.length > 0) return NextResponse.json({ message: `El email '${email}' ya está en uso.` }, { status: 409 });
      updateFields.push("email = ?"); updateValues.push(email);
    } else if (email === null) { // Permitir poner email a NULL
      updateFields.push("email = ?"); updateValues.push(null);
    }

    if (management_level !== undefined) { updateFields.push("management_level = ?"); updateValues.push(management_level ?? null); }
    if (parent_section_id !== undefined) {
      if (parent_section_id === sectionId) return NextResponse.json({ message: 'Una sección no puede ser su propia dependencia.' }, { status: 400 });
      if (parent_section_id !== null) {
        const [parentExists] = await connection.query<RowDataPacket[]>("SELECT id FROM sections WHERE id = ? AND deleted_at IS NULL", [parent_section_id]);
        if (parentExists.length === 0) return NextResponse.json({ message: `La sección padre ID '${parent_section_id}' no existe o no está activa.` }, { status: 400 });
      }
      updateFields.push("parent_section_id = ?"); updateValues.push(parent_section_id ?? null);
    }
    if (updateFields.length === 0) return NextResponse.json({ message: 'No hay campos para actualizar' }, { status: 400 });

    updateFields.push("updated_at = NOW()");
    updateValues.push(sectionId); // Para el WHERE id = ?
    updateValues.push(sectionId); // Para el WHERE id = ? AND deleted_at IS NULL

    const query = `UPDATE sections SET ${updateFields.join(", ")} WHERE id = ? AND deleted_at IS NULL`; // Solo actualizar si está activa
    const [result] = await connection.query<ResultSetHeader>(query, updateValues);

    if (result.affectedRows === 0) return NextResponse.json({ message: 'Sección no encontrada, eliminada, o sin cambios' }, { status: 404 });

    const [updatedSectionRows] = await connection.query<SectionRecord[]>(
      `SELECT s.*, p.name AS parent_section_name FROM sections s LEFT JOIN sections p ON s.parent_section_id = p.id WHERE s.id = ?`, [sectionId]
    );
    return NextResponse.json(updatedSectionRows[0], { status: 200 });
  } catch (error: any) { /* ... manejo de error como antes ... */
    console.error(`API Error PUT /api/sections/${sectionId}:`, error);
    return NextResponse.json({ message: error.message || 'Error interno al actualizar la sección' }, { status: 500 });
  } finally { if (connection) connection.release(); }
}

// DELETE para eliminación lógica de una sección
export async function DELETE(request: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  const sectionId = parseInt(context.params.id, 10);
  if (isNaN(sectionId)) return NextResponse.json({ message: 'ID de sección inválido' }, { status: 400 });

  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    // Verificar si la sección es padre de otras secciones ACTIVAS
    const [childSections] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM sections WHERE parent_section_id = ? AND deleted_at IS NULL",
      [sectionId]
    );
    if (childSections.length > 0) {
      return NextResponse.json({ message: 'No se puede eliminar. Primero reasigne sus sub-secciones activas.' }, { status: 409 });
    }

    // Realizar eliminación lógica
    const [result] = await connection.query<ResultSetHeader>(
      "UPDATE sections SET deleted_at = NOW(), updated_at = NOW(), name = CONCAT(name, '_deleted_', UNIX_TIMESTAMP()) WHERE id = ? AND deleted_at IS NULL",
      // Añadimos un sufijo al nombre para liberar el constraint UNIQUE si lo vuelves a poner
      // y para evitar que aparezca en búsquedas por nombre exacto de secciones activas.
      // Email también debería manejarse similar si es UNIQUE.
      [sectionId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'Sección no encontrada o ya eliminada' }, { status: 404 });
    }
    // Las FKs en otras tablas (users, locations, assets) tienen ON DELETE SET NULL,
    // pero como esto es un UPDATE (soft delete), esas FKs no se verán afectadas automáticamente.
    // Deberás decidir si quieres explícitamente poner a NULL section_id en users, locations, etc.
    // o si es aceptable que sigan apuntando a una sección "soft-deleted".
    // Por ahora, solo marcamos la sección como eliminada.

    return NextResponse.json({ message: 'Sección eliminada lógicamente' }, { status: 200 });
  } catch (error: any) {
    console.error(`API Error DELETE /api/sections/${sectionId}:`, error);
    return NextResponse.json({ message: error.message || 'Error interno al eliminar la sección' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}