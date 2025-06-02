// app/api/sections/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise'; // Import ResultSetHeader
import { createSectionSchema } from '@/lib/schema';

export interface SectionRecord extends RowDataPacket {
    id: number;
    name: string;
    management_level: number | null;
    email: string | null;
    parent_section_id: number | null;
    parent_section_name: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null; // Añadido
}

// GET todas las secciones (solo activas)
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const pool = getPool();
    const connection = await pool.getConnection();
    const { searchParams } = new URL(request.url);
    const filterName = searchParams.get('name');

    try {
        let query = `
      SELECT 
        s.id, s.name, s.management_level, s.email, s.parent_section_id,
        p.name AS parent_section_name,
        s.created_at, s.updated_at, s.deleted_at
      FROM sections s
      LEFT JOIN sections p ON s.parent_section_id = p.id
      WHERE s.deleted_at IS NULL -- <<< SOLO SECCIONES ACTIVAS
    `;
        const queryParams: string[] = [];

        if (filterName) {
            query += " AND s.name LIKE ?"; // Añadir AND porque ya hay un WHERE
            queryParams.push(`%${filterName}%`);
        }
        query += " ORDER BY s.name ASC";

        const [rows] = await connection.query<SectionRecord[]>(query, queryParams);
        const sections = rows.map(section => ({
            ...section,
            created_at: section.created_at ? new Date(section.created_at).toISOString() : '',
            updated_at: section.updated_at ? new Date(section.updated_at).toISOString() : '',
            deleted_at: section.deleted_at ? new Date(section.deleted_at).toISOString() : null,
        }));
        return NextResponse.json(sections, { status: 200 });
    } catch (error) {
        console.error('API Error GET /api/sections:', error);
        return NextResponse.json({ message: 'Error interno al obtener secciones' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}

// POST para crear una nueva sección
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        const body = await request.json();
        const validation = createSectionSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ message: 'Datos inválidos', errors: validation.error.flatten().fieldErrors }, { status: 400 });
        }
        const { name, management_level, email, parent_section_id } = validation.data;

        // Verificar unicidad de 'name' entre secciones activas
        const [existingName] = await connection.query<RowDataPacket[]>(
            "SELECT id FROM sections WHERE name = ? AND deleted_at IS NULL", [name]
        );
        if (existingName.length > 0) {
            return NextResponse.json({ message: `El nombre de sección '${name}' ya está en uso por una sección activa.` }, { status: 409 });
        }
        // Verificar unicidad de 'email' entre secciones activas (si el email no es null)
        if (email) {
            const [existingEmail] = await connection.query<RowDataPacket[]>(
                "SELECT id FROM sections WHERE email = ? AND deleted_at IS NULL", [email]
            );
            if (existingEmail.length > 0) {
                return NextResponse.json({ message: `El email '${email}' ya está en uso por una sección activa.` }, { status: 409 });
            }
        }
        if (parent_section_id) {
            const [parentExists] = await connection.query<RowDataPacket[]>(
                "SELECT id FROM sections WHERE id = ? AND deleted_at IS NULL", [parent_section_id]
            );
            if (parentExists.length === 0) {
                return NextResponse.json({ message: `La sección padre con ID '${parent_section_id}' no existe o no está activa.` }, { status: 400 });
            }
        }

        const [result] = await connection.query<ResultSetHeader>( // Usar ResultSetHeader para obtener insertId
            "INSERT INTO sections (name, management_level, email, parent_section_id, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
            [name, management_level ?? null, email ?? null, parent_section_id ?? null]
        );
        const insertId = result.insertId;
        if (!insertId) throw new Error("No se pudo crear la sección.");

        const [newSectionRows] = await connection.query<SectionRecord[]>(
            `SELECT s.*, p.name AS parent_section_name 
         FROM sections s LEFT JOIN sections p ON s.parent_section_id = p.id 
         WHERE s.id = ? AND s.deleted_at IS NULL`,
            [insertId]
        );
        return NextResponse.json(newSectionRows[0], { status: 201 });
    } catch (error: any) {
        console.error('API Error POST /api/sections:', error);
        return NextResponse.json({ message: error.message || 'Error interno al crear la sección' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}