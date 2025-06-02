// app/api/companies/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';
import { updateCompanySchema } from '@/lib/schema';
import type { CompanyRecord } from '../route'; // Importar la interfaz

interface Params {
  id: string;
}

// GET una empresa por ID
export async function GET(request: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const companyId = parseInt(context.params.id, 10);
  if (isNaN(companyId)) {
    return NextResponse.json({ message: 'ID de empresa inválido' }, { status: 400 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.query<CompanyRecord[]>("SELECT * FROM companies WHERE id = ?", [companyId]);
    if (rows.length === 0) {
      return NextResponse.json({ message: 'Empresa no encontrada' }, { status: 404 });
    }
    const company = {
      ...rows[0],
      created_at: rows[0].created_at ? new Date(rows[0].created_at).toISOString() : '',
      updated_at: rows[0].updated_at ? new Date(rows[0].updated_at).toISOString() : '',
    };
    return NextResponse.json(company, { status: 200 });
  } catch (error) {
    console.error(`API Error GET /api/companies/${companyId}:`, error);
    return NextResponse.json({ message: 'Error interno al obtener la empresa' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// PUT para actualizar una empresa
export async function PUT(request: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado para actualizar' }, { status: 401 });
  }

  const companyId = parseInt(context.params.id, 10);
  if (isNaN(companyId)) {
    return NextResponse.json({ message: 'ID de empresa inválido' }, { status: 400 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const body = await request.json();
    const validation = updateCompanySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos', errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { tax_id, legal_name, trade_name, email, phone_number } = validation.data;

    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (tax_id !== undefined) { updateFields.push("tax_id = ?"); updateValues.push(tax_id); }
    if (legal_name !== undefined) { updateFields.push("legal_name = ?"); updateValues.push(legal_name); }
    if (trade_name !== undefined) { updateFields.push("trade_name = ?"); updateValues.push(trade_name ?? null); }
    if (email !== undefined) { updateFields.push("email = ?"); updateValues.push(email ?? null); }
    if (phone_number !== undefined) { updateFields.push("phone_number = ?"); updateValues.push(phone_number ?? null); }

    if (updateFields.length === 0) {
      return NextResponse.json({ message: 'No hay campos para actualizar' }, { status: 400 });
    }

    updateFields.push("updated_at = NOW()");
    updateValues.push(companyId);

    const query = `UPDATE companies SET ${updateFields.join(", ")} WHERE id = ?`;
    const [result] = await connection.query(query, updateValues);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ message: 'Empresa no encontrada o sin cambios' }, { status: 404 });
    }

    const [updatedCompanyRows] = await connection.query<CompanyRecord[]>("SELECT * FROM companies WHERE id = ?", [companyId]);
    return NextResponse.json(updatedCompanyRows[0], { status: 200 });

  } catch (error: any) {
    console.error(`API Error PUT /api/companies/${companyId}:`, error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ message: 'Error: El RUT/Tax ID o Email ya existen para otra empresa.' }, { status: 409 });
    }
    return NextResponse.json({ message: error.message || 'Error interno al actualizar la empresa' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// DELETE para eliminar una empresa
export async function DELETE(request: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado para eliminar' }, { status: 401 });
  }

  const companyId = parseInt(context.params.id, 10);
  if (isNaN(companyId)) {
    return NextResponse.json({ message: 'ID de empresa inválido' }, { status: 400 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    // La FK assets.supplier_company_id tiene ON DELETE SET NULL, así que la eliminación directa es posible.
    const [result] = await connection.query("DELETE FROM companies WHERE id = ?", [companyId]);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ message: 'Empresa no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Empresa eliminada correctamente' }, { status: 200 });

  } catch (error: any) {
    console.error(`API Error DELETE /api/companies/${companyId}:`, error);
    return NextResponse.json({ message: 'Error interno al eliminar la empresa' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}