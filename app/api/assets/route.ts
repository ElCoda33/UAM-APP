// app/api/assets/route.ts
import { getServerSession } from 'next-auth/next';
import { RowDataPacket } from 'mysql2/promise';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { ResultSetHeader } from 'mysql2/promise';
import { createAssetSchema, IAssetAPI } from '@/lib/schema';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();

  try {
    const query = `
      SELECT
          a.id,
          a.serial_number,
          a.inventory_code,
          a.description,
          a.product_name,
          DATE_FORMAT(a.warranty_expiry_date, '%Y-%m-%d') AS warranty_expiry_date,
          a.current_section_id,
          s.name AS current_section_name,
          a.current_location_id,
          l.name AS current_location_name,
          a.supplier_company_id,
          c.legal_name AS supplier_company_name,
          c.tax_id AS supplier_company_tax_id,
          DATE_FORMAT(a.purchase_date, '%Y-%m-%d') AS purchase_date,
          a.invoice_number,
          a.acquisition_procedure,
          a.status,
          a.image_url,
          a.created_at,
          a.updated_at
      FROM assets a
      LEFT JOIN sections s ON a.current_section_id = s.id
      LEFT JOIN locations l ON a.current_location_id = l.id
      LEFT JOIN companies c ON a.supplier_company_id = c.id
      WHERE a.deleted_at IS NULL
      ORDER BY a.created_at DESC
    `;

    const [rows] = await pool.query<IAssetAPI[]>(query);

    const assetsWithISOStrings = rows.map((asset: IAssetAPI) => ({
      ...asset,
      created_at: asset.created_at ? new Date(asset.created_at).toISOString() : '',
      updated_at: asset.updated_at ? new Date(asset.updated_at).toISOString() : '',
    }));

    return NextResponse.json(assetsWithISOStrings, { status: 200 });

  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener activos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const body = await request.json();
    await connection.beginTransaction();

    let createdAssets: any[] = [];
    const assetsToCreate = Array.isArray(body) ? body : [body];

    for (const assetData of assetsToCreate) {
      const validation = createAssetSchema.safeParse(assetData);
      if (!validation.success) {
        await connection.rollback();
        return NextResponse.json({
          message: 'Datos de activo inválidos.',
          errors: validation.error.flatten().fieldErrors,
          invalidAssetData: assetData
        }, { status: 400 });
      }
      const validatedData = validation.data;

      if (validatedData.inventory_code && validatedData.inventory_code.trim() !== "") {
        const [existingInventory] = await connection.query<IAssetAPI[]>(
          "SELECT id FROM assets WHERE inventory_code = ? AND deleted_at IS NULL",
          [validatedData.inventory_code]
        );
        if (existingInventory.length > 0) {
          await connection.rollback();
          return NextResponse.json({
            message: `El código de inventario '${validatedData.inventory_code}' ya existe para un activo activo.`,
            field: 'inventory_code'
          }, { status: 409 });
        }
      }

      if (validatedData.serial_number) {
        const [existingSerial] = await connection.query<IAssetAPI[]>(
          "SELECT id FROM assets WHERE serial_number = ? AND deleted_at IS NULL",
          [validatedData.serial_number]
        );
        if (existingSerial.length > 0) {
          await connection.rollback();
          return NextResponse.json({
            message: `El número de serie '${validatedData.serial_number}' ya existe para un activo activo.`,
            field: 'serial_number'
          }, { status: 409 });
        }
      }

      const query = `
        INSERT INTO assets(
          product_name, serial_number, inventory_code, description,
          current_section_id, current_location_id, supplier_company_id,
          purchase_date, invoice_number, warranty_expiry_date,
          acquisition_procedure, status, image_url,
          created_at, updated_at
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW());
      `;
      const params = [
        validatedData.product_name, validatedData.serial_number || null, validatedData.inventory_code,
        validatedData.description || null, validatedData.current_section_id,
        validatedData.current_location_id || null, validatedData.supplier_company_id || null,
        validatedData.purchase_date || null, validatedData.invoice_number || null,
        validatedData.warranty_expiry_date || null, validatedData.acquisition_procedure || null,
        validatedData.status, validatedData.image_url || null,
      ];

      const [result] = await connection.query<ResultSetHeader>(query, params);
      const insertId = result.insertId;
      if (!insertId) {
        throw new Error('Fallo al crear el activo en la base de datos.');
      }
      createdAssets.push({ id: insertId, ...validatedData });
    }

    await connection.commit();
    return NextResponse.json({
      message: assetsToCreate.length > 1 ? 'Activos creados correctamente.' : 'Activo creado correctamente.',
      assets: createdAssets
    }, { status: 201 });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('API Error POST /api/assets:', error);
    return NextResponse.json({
      message: error.message || 'Error interno al crear el activo.',
      field: error.field
    }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}