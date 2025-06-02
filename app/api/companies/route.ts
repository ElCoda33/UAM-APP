// app/api/companies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';
import { createCompanySchema } from '@/lib/schema';

export interface CompanyRecord extends RowDataPacket {
  id: number;
  tax_id: string;
  legal_name: string;
  trade_name: string | null;
  email: string | null;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
}

// GET todas las empresas (con posible filtrado)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search'); // Para filtrar por nombre, rut, etc.

  try {
    let query = `
      SELECT id, tax_id, legal_name, trade_name, email, phone_number, created_at, updated_at
      FROM companies
    `;
    const queryParams: string[] = [];

    if (searchTerm) {
      query += " WHERE legal_name LIKE ? OR trade_name LIKE ? OR tax_id LIKE ? OR email LIKE ?";
      const searchPattern = `%${searchTerm}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }
    query += " ORDER BY legal_name ASC";

    const [rows] = await connection.query<CompanyRecord[]>(query, queryParams);

    const companies = rows.map(company => ({
      ...company,
      created_at: company.created_at ? new Date(company.created_at).toISOString() : '',
      updated_at: company.updated_at ? new Date(company.updated_at).toISOString() : '',
    }));

    return NextResponse.json(companies, { status: 200 });
  } catch (error) {
    console.error('API Error GET /api/companies:', error);
    return NextResponse.json({ message: 'Error interno al obtener empresas' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// POST para crear una nueva empresa
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) { // Añadir chequeo de rol si es necesario
    return NextResponse.json({ message: 'No autorizado para crear empresas' }, { status: 401 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const body = await request.json();
    const validation = createCompanySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { tax_id, legal_name, trade_name, email, phone_number } = validation.data;

    // Verificar si tax_id o email (si es unique) ya existen
    const [existingCompany] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM companies WHERE tax_id = ? OR (email IS NOT NULL AND email = ?)",
      [tax_id, email ?? null]
    );
    if (existingCompany.length > 0) {
      // Podrías ser más específico sobre qué campo está duplicado
      return NextResponse.json({ message: 'Una empresa con el mismo RUT/Tax ID o Email ya existe.' }, { status: 409 });
    }

    const [result] = await connection.query(
      "INSERT INTO companies (tax_id, legal_name, trade_name, email, phone_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
      [tax_id, legal_name, trade_name ?? null, email ?? null, phone_number ?? null]
    );

    const insertId = (result as any).insertId;
    if (!insertId) {
      throw new Error("No se pudo crear la empresa.");
    }

    const [newCompanyRows] = await connection.query<CompanyRecord[]>("SELECT * FROM companies WHERE id = ?", [insertId]);
    return NextResponse.json(newCompanyRows[0], { status: 201 });

  } catch (error: any) {
    console.error('API Error POST /api/companies:', error);
    if (error.code === 'ER_DUP_ENTRY') { // tax_id es UNIQUE
      return NextResponse.json({ message: 'Error: El RUT/Tax ID de la empresa ya existe.' }, { status: 409 });
    }
    return NextResponse.json({ message: error.message || 'Error interno al crear la empresa' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}