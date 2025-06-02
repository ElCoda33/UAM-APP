// app/api/assets/export/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import puppeteer from 'puppeteer';
import { IAssetAPI } from '@/lib/schema'; // O desde donde la hayas definido

interface ExportFilters { // Misma interfaz que en CSV
  searchText?: string;
  searchAttribute?: string;
  status?: string[] | null;
  purchaseDateFrom?: string | null;
  purchaseDateTo?: string | null;
}
interface ExportPayload { // Misma interfaz que en CSV
  filters: ExportFilters;
  sort: { column?: string; direction?: 'ascending' | 'descending'; };
  columns: Array<{ uid: string; name: string }>;
}

// Reutilizar fetchFilteredAssets (idealmente movida a un archivo helper)
async function fetchFilteredAssets(connection: any, payload: ExportPayload): Promise<IAssetAPI[]> {
  let query = `
        SELECT a.*, s.name AS current_section_name, l.name AS current_location_name, 
               COALESCE(c.trade_name, c.legal_name) AS supplier_company_name, c.tax_id AS supplier_company_tax_id
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
    };
    const sortColumnDb = validSortColumns[sort.column] || 'a.product_name';
    const sortDirectionDb = sort.direction === 'descending' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortColumnDb} ${sortDirectionDb}`;
  } else {
    query += ` ORDER BY a.product_name ASC`;
  }
  const [rows] = await connection.query<IAssetAPI[]>(query, queryParams);
  return rows;
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

    // Generar HTML para el PDF
    let htmlContent = `
      <html><head><title>Lista de Activos</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 25px; font-size: 9pt; color: #333; }
        h1 { text-align: center; font-size: 16pt; margin-bottom: 20px; color: #1a237e; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; page-break-inside: auto; }
        th, td { border: 1px solid #ccc; padding: 5px 7px; text-align: left; word-wrap: break-word; font-size: 8pt; }
        th { background-color: #e8eaf6; font-weight: bold; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; } /* Repetir encabezado en cada página */
      </style></head><body>
      <h1>Lista de Activos Filtrados</h1>
      <table><thead><tr>`;

    payload.columns.forEach(col => {
      htmlContent += `<th>${col.name}</th>`;
    });
    htmlContent += `</tr></thead><tbody>`;

    assets.forEach(asset => {
      htmlContent += `<tr>`;
      payload.columns.forEach(col => {
        let value = (asset as any)[col.uid];
        if (col.uid === 'purchase_date' || col.uid === 'warranty_expiry_date') {
          value = value ? new Date(value).toLocaleDateString('es-UY', { timeZone: 'UTC' }) : '';
        } else if (col.uid === 'status') {
          value = value ? String(value).replace(/_/g, " ") : 'N/A';
        }
        htmlContent += `<td>${value === null || value === undefined ? '' : String(value)}</td>`;
      });
      htmlContent += `</tr>`;
    });
    htmlContent += `</tbody></table></body></html>`;

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: payload.columns.length > 6, // Paisaje si hay muchas columnas
      printBackground: true,
      margin: { top: '25mm', right: '15mm', bottom: '25mm', left: '15mm' },
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size: 8pt; width: 100%; text-align: center; padding: 0 10mm;">UAM - Listado de Activos</div>`,
      footerTemplate: `<div style="font-size: 8pt; width: 100%; text-align: center; padding: 0 10mm;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>`
    });
    await browser.close();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="activos_exportados.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('Error exportando activos a PDF:', error);
    return NextResponse.json({ message: error.message || 'Error interno al exportar a PDF' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}