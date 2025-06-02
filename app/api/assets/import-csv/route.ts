// app/api/assets/import-csv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { createAssetSchema, csvAssetRowSchema } from '@/lib/schema'; // Asumiendo schema definido

interface SectionRow extends RowDataPacket { id: number; }
interface LocationRow extends RowDataPacket { id: number; }
interface CompanyRow extends RowDataPacket { id: number; }

async function parseCsv(csvText: string): Promise<Array<Record<string, string>>> {
  const lines = csvText.split(/\r\n|\n|\r/); // Manejar diferentes finales de línea
  if (lines.length < 2) throw new Error("El CSV debe tener al menos una fila de encabezado y una de datos.");

  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const dataRows = lines.slice(1).filter(line => line.trim() !== '');

  return dataRows.map(line => {
    const values = line.split(',');
    const rowObject: Record<string, string> = {};
    header.forEach((key, index) => {
      rowObject[key] = values[index]?.trim() || "";
    });
    return rowObject;
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const formData = await request.formData();
    const file = formData.get('csvFile') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No se proporcionó archivo CSV.' }, { status: 400 });
    }
    if (file.type !== 'text/csv') {
      return NextResponse.json({ message: 'Formato de archivo no válido. Solo se permite CSV.' }, { status: 400 });
    }

    const csvText = await file.text();
    const parsedRows = await parseCsv(csvText);

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ row: number; messages: string[]; data: any }> = [];
    const createdAssetIds: number[] = [];

    await connection.beginTransaction();

    for (let i = 0; i < parsedRows.length; i++) {
      const rawRow = parsedRows[i];
      const rowIndex = i + 2; // +1 por el header, +1 por index base 0

      // 1. Validación inicial de la fila del CSV
      const rowValidation = csvAssetRowSchema.safeParse(rawRow);
      if (!rowValidation.success) {
        errorCount++;
        errors.push({ row: rowIndex, messages: rowValidation.error.flatten().formErrors, data: rawRow });
        continue;
      }
      let validatedRowData = rowValidation.data;

      // 2. Mapeo y obtención de IDs (Sección, Ubicación, Empresa)
      let current_section_id: number | undefined;
      if (validatedRowData.current_section_name) {
        const [sectionRows] = await connection.query<SectionRow[]>("SELECT id FROM sections WHERE name = ? AND deleted_at IS NULL", [validatedRowData.current_section_name]);
        if (sectionRows.length > 0) current_section_id = sectionRows[0].id;
        else {
          errorCount++; errors.push({ row: rowIndex, messages: [`Sección '${validatedRowData.current_section_name}' no encontrada o inactiva.`], data: rawRow }); continue;
        }
      } else {
        errorCount++; errors.push({ row: rowIndex, messages: [`'current_section_name' es requerido en el CSV.`], data: rawRow }); continue;
      }

      let current_location_id: number | undefined | null = null;
      if (validatedRowData.current_location_name && current_section_id) { // Ubicación depende de sección
        const [locRows] = await connection.query<LocationRow[]>("SELECT id FROM locations WHERE name = ? AND section_id = ? AND deleted_at IS NULL", [validatedRowData.current_location_name, current_section_id]);
        if (locRows.length > 0) current_location_id = locRows[0].id;
        else { // Opcional: crear ubicación si no existe? Por ahora, error.
          errorCount++; errors.push({ row: rowIndex, messages: [`Ubicación '${validatedRowData.current_location_name}' no encontrada en la sección especificada o inactiva.`], data: rawRow }); continue;
        }
      }

      let supplier_company_id: number | undefined | null = null;
      if (validatedRowData.supplier_company_tax_id) { // Asumimos que el CSV tiene tax_id del proveedor
        const [compRows] = await connection.query<CompanyRow[]>("SELECT id FROM companies WHERE tax_id = ? AND deleted_at IS NULL", [validatedRowData.supplier_company_tax_id]);
        if (compRows.length > 0) supplier_company_id = compRows[0].id;
        else {
          errorCount++; errors.push({ row: rowIndex, messages: [`Empresa proveedora con RUT '${validatedRowData.supplier_company_tax_id}' no encontrada o inactiva.`], data: rawRow }); continue;
        }
      }

      // 3. Construir el objeto final para createAssetSchema
      const finalAssetData = {
        product_name: validatedRowData.product_name || "Producto no especificado", // Campo obligatorio
        serial_number: validatedRowData.serial_number || null,
        inventory_code: validatedRowData.inventory_code || `INV-${Date.now()}-${i}`, // Campo obligatorio
        description: validatedRowData.description || null,
        current_section_id: current_section_id,
        current_location_id: current_location_id,
        supplier_company_id: supplier_company_id,
        purchase_date: validatedRowData.purchase_date || null,
        invoice_number: validatedRowData.invoice_number || null,
        warranty_expiry_date: validatedRowData.warranty_expiry_date || null,
        acquisition_procedure: validatedRowData.acquisition_procedure || null,
        status: validatedRowData.status || 'in_storage', // Default status
        image_url: validatedRowData.image_url || null,
      };

      // 4. Validación final con createAssetSchema
      const finalValidation = createAssetSchema.safeParse(finalAssetData);
      if (!finalValidation.success) {
        errorCount++;
        errors.push({ row: rowIndex, messages: finalValidation.error.flatten().formErrors, data: rawRow });
        continue;
      }
      const dbReadyData = finalValidation.data;

      // 5. Chequeos de Unicidad y Guardado
      const [existingInventory] = await connection.query<RowDataPacket[]>("SELECT id FROM assets WHERE inventory_code = ? AND deleted_at IS NULL", [dbReadyData.inventory_code]);
      if (existingInventory.length > 0) {
        errorCount++; errors.push({ row: rowIndex, messages: [`Código de inventario '${dbReadyData.inventory_code}' ya existe.`], data: rawRow }); continue;
      }
      if (dbReadyData.serial_number) {
        const [existingSerial] = await connection.query<RowDataPacket[]>("SELECT id FROM assets WHERE serial_number = ? AND deleted_at IS NULL", [dbReadyData.serial_number]);
        if (existingSerial.length > 0) {
          errorCount++; errors.push({ row: rowIndex, messages: [`Número de serie '${dbReadyData.serial_number}' ya existe.`], data: rawRow }); continue;
        }
      }

      const query = `INSERT INTO assets (product_name, serial_number, inventory_code, description, current_section_id, current_location_id, supplier_company_id, purchase_date, invoice_number, warranty_expiry_date, acquisition_procedure, status, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
      const params = [
        dbReadyData.product_name, dbReadyData.serial_number, dbReadyData.inventory_code, dbReadyData.description,
        dbReadyData.current_section_id, dbReadyData.current_location_id, dbReadyData.supplier_company_id,
        dbReadyData.purchase_date, dbReadyData.invoice_number, dbReadyData.warranty_expiry_date,
        dbReadyData.acquisition_procedure, dbReadyData.status, dbReadyData.image_url
      ];
      const [result] = await connection.query<ResultSetHeader>(query, params);
      if (result.insertId) {
        successCount++;
        createdAssetIds.push(result.insertId);
      } else {
        errorCount++; errors.push({ row: rowIndex, messages: ["Error desconocido al insertar en DB."], data: rawRow });
      }
    }

    if (errorCount > 0 && successCount > 0) { // Errores parciales
      await connection.commit(); // Confirmar los exitosos
      return NextResponse.json({
        message: `Importación parcial: ${successCount} activos creados, ${errorCount} filas con errores.`,
        successCount, errorCount, errors, createdAssetIds
      }, { status: 207 }); // Multi-Status
    } else if (errorCount > 0 && successCount === 0) { // Todos errores
      await connection.rollback();
      return NextResponse.json({ message: "Importación fallida. Ningún activo fue creado.", successCount, errorCount, errors }, { status: 400 });
    }

    await connection.commit();
    return NextResponse.json({ message: `Importación completada: ${successCount} activos creados.`, successCount, errorCount, errors, createdAssetIds }, { status: 201 });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('API Error POST /api/assets/import-csv:', error);
    return NextResponse.json({ message: error.message || 'Error interno al importar activos desde CSV.' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}