// app/api/assets/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; //
import { getPool } from '@/lib/db'; //
import { RowDataPacket } from 'mysql2/promise';
// Asumimos que tendrás un schema de Zod para validación, similar a lib/schema.ts
// import { updateAssetSchema } from '@/lib/assetSchema'; // Deberás crear este archivo y schema

interface Params {
  id: string;
}

// Interfaz para el activo como se recupera de la DB con joins
interface IAssetDetailAPI extends RowDataPacket {
  id: number;
  serial_number: string | null;
  inventory_code: string;
  description: string | null;
  product_name: string;
  warranty_expiry_date: string | null; // YYYY-MM-DD
  current_section_id: number | null;
  current_section_name: string | null;
  current_location_id: number | null;
  current_location_name: string | null;
  supplier_company_id: number | null;
  supplier_company_name: string | null; // Nombre legal o comercial
  purchase_date: string | null; // YYYY-MM-DD
  invoice_number: string | null;
  acquisition_procedure: string | null;
  status: 'in_use' | 'in_storage' | 'under_repair' | 'disposed' | 'lost' | null;
  image_url: string | null;
  created_at: string; // ISO Timestamp string
  updated_at: string; // ISO Timestamp string
}

export async function GET(request: Request, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const { id } = context.params;
  if (!id || isNaN(parseInt(id))) {
    return NextResponse.json({ message: 'ID de activo inválido' }, { status: 400 });
  }
  const assetId = parseInt(id);

  try {
    const pool = getPool();
    const query = `
      SELECT
          a.id, a.serial_number, a.inventory_code, a.description, a.product_name,
          DATE_FORMAT(a.warranty_expiry_date, '%Y-%m-%d') AS warranty_expiry_date,
          a.current_section_id, s.name AS current_section_name,
          a.current_location_id, l.name AS current_location_name,
          a.supplier_company_id, COALESCE(c.trade_name, c.legal_name) AS supplier_company_name,
          DATE_FORMAT(a.purchase_date, '%Y-%m-%d') AS purchase_date,
          a.invoice_number, a.acquisition_procedure, a.status, a.image_url,
          a.created_at, a.updated_at
      FROM assets a
      LEFT JOIN sections s ON a.current_section_id = s.id
      LEFT JOIN locations l ON a.current_location_id = l.id
      LEFT JOIN companies c ON a.supplier_company_id = c.id
      WHERE a.id = ?;
    `;
    const [rows] = await pool.query<IAssetDetailAPI[]>(query, [assetId]);

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Activo no encontrado' }, { status: 404 });
    }
    const asset = {
      ...rows[0],
      created_at: rows[0].created_at ? new Date(rows[0].created_at).toISOString() : '',
      updated_at: rows[0].updated_at ? new Date(rows[0].updated_at).toISOString() : '',
    };
    return NextResponse.json(asset, { status: 200 });

  } catch (error: any) {
    console.error(`API Error GET /api/assets/${assetId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener el activo', errorDetails: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado para actualizar' }, { status: 401 });
  }
  // Aquí podrías añadir lógica de roles si es necesario

  const { id } = context.params;
  if (!id || isNaN(parseInt(id))) {
    return NextResponse.json({ message: 'ID de activo inválido' }, { status: 400 });
  }
  const assetId = parseInt(id);

  let pool;
  try {
    const body = await request.json();

    // TODO: Validar 'body' con tu 'updateAssetSchema' de Zod
    // const validationResult = updateAssetSchema.safeParse(body);
    // if (!validationResult.success) {
    //   return NextResponse.json({ message: "Datos inválidos.", errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    // }
    // const validatedData = validationResult.data;

    // Por ahora, usaremos el body directamente, pero la validación es crucial
    const {
      product_name, serial_number, inventory_code, description,
      current_section_id, current_location_id, supplier_company_id,
      purchase_date, // Debe ser YYYY-MM-DD o null
      invoice_number, warranty_expiry_date, // Debe ser YYYY-MM-DD o null
      acquisition_procedure, status, image_url
    } = body; // Asume que el body ya está validado y formateado

    pool = getPool();
    const updateQuery = `
      UPDATE assets SET
        product_name = ?, serial_number = ?, inventory_code = ?, description = ?,
        current_section_id = ?, current_location_id = ?, supplier_company_id = ?,
        purchase_date = ?, invoice_number = ?, warranty_expiry_date = ?,
        acquisition_procedure = ?, status = ?, image_url = ?,
        updated_at = NOW()
      WHERE id = ?;
    `;

    const [result] = await pool.query(updateQuery, [
      product_name, serial_number || null, inventory_code, description || null,
      current_section_id ? Number(current_section_id) : null,
      current_location_id ? Number(current_location_id) : null,
      supplier_company_id ? Number(supplier_company_id) : null,
      purchase_date || null,
      invoice_number || null,
      warranty_expiry_date || null,
      acquisition_procedure || null,
      status,
      image_url || null,
      assetId
    ]);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ message: 'Activo no encontrado o sin cambios para aplicar' }, { status: 404 });
    }

    // Opcional: Devolver el activo actualizado
    // const [updatedRows] = await pool.query<IAssetDetailAPI[]>("SELECT * FROM assets WHERE id = ?", [assetId]);
    // return NextResponse.json(updatedRows[0], { status: 200 });
    return NextResponse.json({ message: 'Activo actualizado correctamente' }, { status: 200 });

  } catch (error: any) {
    console.error(`API Error PUT /api/assets/${assetId}:`, error);
    return NextResponse.json({ message: 'Error interno al actualizar el activo', errorDetails: error.message }, { status: 500 });
  }
}