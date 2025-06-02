// app/api/assets/export/csv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { IAssetAPI } from '@/lib/schema'; // O desde donde la hayas definido

interface ExportFilters {
  searchText?: string;
  searchAttribute?: string;
  status?: string[] | null;
  purchaseDateFrom?: string | null; // YYYY-MM-DD
  purchaseDateTo?: string | null;   // YYYY-MM-DD
}

interface ExportPayload {
  filters: ExportFilters;
  sort: {
    column?: string;
    direction?: 'ascending' | 'descending';
  };
  // La prop 'columns' del payload ya no se usará para definir la estructura del CSV,
  // pero se mantiene por si se usa en fetchFilteredAssets para alguna optimización (aunque no actualmente).
  columns: Array<{ uid: string; name: string }>;
}

// Definición fija de las columnas y el orden para el CSV exportado
const CSV_EXPORT_COLUMNS_ORDERED: Array<{ key: keyof IAssetAPI | 'current_section_name' | 'current_location_name' | 'supplier_company_tax_id'; header: string }> = [
  { key: 'product_name', header: 'product_name' },
  { key: 'serial_number', header: 'serial_number' },
  { key: 'inventory_code', header: 'inventory_code' },
  { key: 'description', header: 'description' },
  { key: 'current_section_name', header: 'current_section_name' },
  { key: 'current_location_name', header: 'current_location_name' },
  { key: 'supplier_company_tax_id', header: 'supplier_company_tax_id' },
  { key: 'purchase_date', header: 'purchase_date' }, // Debe estar en YYYY-MM-DD
  { key: 'invoice_number', header: 'invoice_number' },
  { key: 'warranty_expiry_date', header: 'warranty_expiry_date' }, // Debe estar en YYYY-MM-DD
  { key: 'acquisition_procedure', header: 'acquisition_procedure' },
  { key: 'status', header: 'status' }, // Debe ser el valor raw del enum
  { key: 'image_url', header: 'image_url' },
];

// Función para construir la query y parámetros (podrías moverla a un helper)
// Esta función ya existe y recupera los datos necesarios.
async function fetchFilteredAssets(connection: any, payload: ExportPayload): Promise<IAssetAPI[]> {
  let query = `
        SELECT 
            a.id, a.serial_number, a.inventory_code, a.description, a.product_name,
            DATE_FORMAT(a.warranty_expiry_date, '%Y-%m-%d') AS warranty_expiry_date,
            a.current_section_id, s.name AS current_section_name,
            a.current_location_id, l.name AS current_location_name,
            a.supplier_company_id, COALESCE(c.trade_name, c.legal_name) AS supplier_company_name,
            c.tax_id AS supplier_company_tax_id,
            DATE_FORMAT(a.purchase_date, '%Y-%m-%d') AS purchase_date,
            a.invoice_number, a.acquisition_procedure, a.status, a.image_url,
            a.created_at, a.updated_at
        FROM assets a
        LEFT JOIN sections s ON a.current_section_id = s.id
        LEFT JOIN locations l ON a.current_location_id = l.id
        LEFT JOIN companies c ON a.supplier_company_id = c.id
        WHERE a.deleted_at IS NULL`;

  const queryParams: any[] = [];
  const { filters, sort } = payload;

  if (filters.searchText && filters.searchAttribute) {
    const dbColumn = filters.searchAttribute === 'current_section_name' ? 's.name' :
      filters.searchAttribute === 'current_location_name' ? 'l.name' :
        filters.searchAttribute === 'supplier_company_name' ? 'COALESCE(c.trade_name, c.legal_name)' :
          `a.${filters.searchAttribute}`;
    if (filters.searchAttribute === 'status') {
      query += ` AND (a.status LIKE ? OR REPLACE(a.status, '_', ' ') LIKE ?)`;
      queryParams.push(`%${filters.searchText}%`, `%${filters.searchText}%`);
    } else {
      query += ` AND ${dbColumn} LIKE ?`;
      queryParams.push(`%${filters.searchText}%`);
    }
  }
  if (filters.status && filters.status.length > 0) {
    query += ` AND a.status IN (?)`;
    queryParams.push(filters.status);
  }
  if (filters.purchaseDateFrom) {
    query += ` AND a.purchase_date >= ?`;
    queryParams.push(filters.purchaseDateFrom);
  }
  if (filters.purchaseDateTo) {
    query += ` AND a.purchase_date <= ?`;
    queryParams.push(filters.purchaseDateTo);
  }

  if (sort.column && sort.direction) {
    const validSortColumns: Record<string, string> = {
      'product_name': 'a.product_name', 'serial_number': 'a.serial_number', 'inventory_code': 'a.inventory_code',
      'current_section_name': 's.name', 'status': 'a.status', 'purchase_date': 'a.purchase_date',
      'warranty_expiry_date': 'a.warranty_expiry_date',
      // Otros mapeos si son necesarios
    };
    const sortColumnDb = validSortColumns[sort.column] || 'a.product_name';
    const sortDirectionDb = sort.direction === 'descending' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortColumnDb} ${sortDirectionDb}`;
  } else {
    query += ` ORDER BY a.product_name ASC`;
  }

  const [rows] = await connection.query<IAssetAPI[]>(query, queryParams);
  // La conversión de fechas a YYYY-MM-DD ya se hace en la query SQL con DATE_FORMAT.
  // La conversión de timestamps a ISO string para created_at/updated_at es buena práctica si se usaran en la API.
  // Para el CSV, los campos de fecha específicos (purchase_date, warranty_expiry_date) ya están formateados.
  return rows.map(asset => ({
    ...asset,
    created_at: asset.created_at ? new Date(asset.created_at).toISOString() : '',
    updated_at: asset.updated_at ? new Date(asset.updated_at).toISOString() : '',
  }));
}


export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const payload: ExportPayload = await request.json();
    const assets = await fetchFilteredAssets(connection, payload);

    if (assets.length === 0) {
      return NextResponse.json({ message: "No hay activos que coincidan con los filtros para exportar." }, { status: 404 });
    }

    // Generar CSV con el encabezado y orden fijos
    const csvHeaderString = CSV_EXPORT_COLUMNS_ORDERED.map(col => `"${col.header.replace(/"/g, '""')}"`).join(',') + '\r\n';

    const csvRows = assets.map(asset => {
      return CSV_EXPORT_COLUMNS_ORDERED.map(colInfo => {
        let value = asset[colInfo.key as keyof IAssetAPI]; // Castear colInfo.key

        // Las fechas ya deberían venir formateadas como YYYY-MM-DD desde la query
        // El estado 'status' ya es el valor raw del enum.
        // image_url también es directo.

        return `"${String(value === null || value === undefined ? '' : value).replace(/"/g, '""')}"`;
      }).join(',');
    }).join('\r\n');

    const csvData = csvHeaderString + csvRows;

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="activos_exportados.csv"`,
      },
    });

  } catch (error: any) {
    console.error('Error exportando activos a CSV:', error);
    return NextResponse.json({ message: error.message || 'Error interno al exportar a CSV' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}