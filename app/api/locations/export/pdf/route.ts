import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import puppeteer from 'puppeteer';
import { LocationRecord } from '../../route';

interface ExportFilters {
    searchText?: string;
    searchAttribute?: string;
}

interface ExportPayload {
    filters: ExportFilters;
    sort: {
        column?: string;
        direction?: 'ascending' | 'descending';
    };
    columns: Array<{ uid: string; name: string }>;
}

async function fetchFilteredLocations(connection: any, payload: ExportPayload): Promise<LocationRecord[]> {
    let query = `
      SELECT 
        l.id, l.name, l.description, l.section_id, s.name AS section_name,
        l.created_at, l.updated_at
      FROM locations l
      LEFT JOIN sections s ON l.section_id = s.id
    `;

    const queryParams: any[] = [];
    const { filters, sort } = payload;
    const conditions: string[] = [];

    if (filters.searchText && filters.searchAttribute) {
        let dbColumn = '';
        switch (filters.searchAttribute) {
            case 'name': dbColumn = 'l.name'; break;
            case 'description': dbColumn = 'l.description'; break;
            case 'section_name': dbColumn = 's.name'; break;
            default: dbColumn = `l.${filters.searchAttribute}`;
        }

        conditions.push(`${dbColumn} LIKE ?`);
        queryParams.push(`%${filters.searchText}%`);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (sort.column && sort.direction) {
        let sortColumnDb = 'l.name';
        switch (sort.column) {
            case 'name': sortColumnDb = 'l.name'; break;
            case 'description': sortColumnDb = 'l.description'; break;
            case 'section_name': sortColumnDb = 's.name'; break;
            case 'created_at': sortColumnDb = 'l.created_at'; break;
        }
        const sortDirectionDb = sort.direction === 'descending' ? 'DESC' : 'ASC';
        query += ` ORDER BY ${sortColumnDb} ${sortDirectionDb}`;
    } else {
        query += ` ORDER BY l.name ASC`;
    }

    const [rows] = await connection.query(query, queryParams);
    return (rows as LocationRecord[]).map((loc: LocationRecord) => ({
        ...loc,
        created_at: loc.created_at ? new Date(loc.created_at).toISOString() : '',
        updated_at: loc.updated_at ? new Date(loc.updated_at).toISOString() : '',
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
        const locations = await fetchFilteredLocations(connection, payload);

        if (locations.length === 0) {
            return NextResponse.json({ message: "No hay ubicaciones que coincidan con los filtros para exportar." }, { status: 404 });
        }

        let htmlContent = `
      <html><head><title>Lista de Ubicaciones</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 25px; font-size: 9pt; color: #333; }
        h1 { text-align: center; font-size: 16pt; margin-bottom: 20px; color: #1a237e; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; page-break-inside: auto; }
        th, td { border: 1px solid #ccc; padding: 5px 7px; text-align: left; word-wrap: break-word; font-size: 8pt; }
        th { background-color: #e8eaf6; font-weight: bold; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
      </style></head><body>
      <h1>Lista de Ubicaciones Filtradas</h1>
      <table><thead><tr>`;

        payload.columns.forEach(col => {
            if (col.uid !== 'actions') {
                htmlContent += `<th>${col.name}</th>`;
            }
        });
        htmlContent += `</tr></thead><tbody>`;

        locations.forEach((location: LocationRecord) => {
            htmlContent += `<tr>`;
            payload.columns.forEach(col => {
                if (col.uid !== 'actions') {
                    let value: any = location[col.uid as keyof LocationRecord];
                    htmlContent += `<td>${value === null || value === undefined ? '' : String(value)}</td>`;
                }
            });
            htmlContent += `</tr>`;
        });
        htmlContent += `</tbody></table></body></html>`;

        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: false,
            printBackground: true,
            margin: { top: '25mm', right: '15mm', bottom: '25mm', left: '15mm' },
            displayHeaderFooter: true,
            headerTemplate: `<div style="font-size: 8pt; width: 100%; text-align: center; padding: 0 10mm;">UAM - Listado de Ubicaciones</div>`,
            footerTemplate: `<div style="font-size: 8pt; width: 100%; text-align: center; padding: 0 10mm;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>`
        });
        await browser.close();

        return new NextResponse(pdfBuffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="ubicaciones_exportadas.pdf"`,
            },
        });

    } catch (error: any) {
        console.error('Error exportando ubicaciones a PDF:', error);
        return NextResponse.json({ message: error.message || 'Error interno al exportar a PDF' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
