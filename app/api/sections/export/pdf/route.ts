import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import puppeteer from 'puppeteer';
import { SectionRecord } from '../../route';

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

async function fetchFilteredSections(connection: any, payload: ExportPayload): Promise<SectionRecord[]> {
    let query = `
      SELECT 
        s.id, s.name, s.management_level, s.email, s.parent_section_id,
        p.name AS parent_section_name,
        s.created_at, s.updated_at, s.deleted_at
      FROM sections s
      LEFT JOIN sections p ON s.parent_section_id = p.id
      WHERE s.deleted_at IS NULL
    `;

    const queryParams: any[] = [];
    const { filters, sort } = payload;

    if (filters.searchText && filters.searchAttribute) {
        let dbColumn = '';
        switch (filters.searchAttribute) {
            case 'name': dbColumn = 's.name'; break;
            case 'email': dbColumn = 's.email'; break;
            case 'parent_section_name': dbColumn = 'p.name'; break;
            case 'management_level': dbColumn = 's.management_level'; break;
            default: dbColumn = `s.${filters.searchAttribute}`;
        }

        query += ` AND ${dbColumn} LIKE ?`;
        queryParams.push(`%${filters.searchText}%`);
    }

    if (sort.column && sort.direction) {
        let sortColumnDb = 's.name';
        switch (sort.column) {
            case 'name': sortColumnDb = 's.name'; break;
            case 'management_level': sortColumnDb = 's.management_level'; break;
            case 'email': sortColumnDb = 's.email'; break;
            case 'parent_section_name': sortColumnDb = 'p.name'; break;
            case 'created_at': sortColumnDb = 's.created_at'; break;
        }
        const sortDirectionDb = sort.direction === 'descending' ? 'DESC' : 'ASC';
        query += ` ORDER BY ${sortColumnDb} ${sortDirectionDb}`;
    } else {
        query += ` ORDER BY s.name ASC`;
    }

    const [rows] = await connection.query(query, queryParams);
    return (rows as SectionRecord[]).map((section: SectionRecord) => ({
        ...section,
        created_at: section.created_at ? new Date(section.created_at).toISOString() : '',
        updated_at: section.updated_at ? new Date(section.updated_at).toISOString() : '',
        deleted_at: section.deleted_at ? new Date(section.deleted_at).toISOString() : null,
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
        const sections = await fetchFilteredSections(connection, payload);

        if (sections.length === 0) {
            return NextResponse.json({ message: "No hay secciones que coincidan con los filtros para exportar." }, { status: 404 });
        }

        let htmlContent = `
      <html><head><title>Lista de Secciones</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 25px; font-size: 9pt; color: #333; }
        h1 { text-align: center; font-size: 16pt; margin-bottom: 20px; color: #1a237e; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; page-break-inside: auto; }
        th, td { border: 1px solid #ccc; padding: 5px 7px; text-align: left; word-wrap: break-word; font-size: 8pt; }
        th { background-color: #e8eaf6; font-weight: bold; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
      </style></head><body>
      <h1>Lista de Secciones Filtradas</h1>
      <table><thead><tr>`;

        payload.columns.forEach(col => {
            if (col.uid !== 'actions') {
                htmlContent += `<th>${col.name}</th>`;
            }
        });
        htmlContent += `</tr></thead><tbody>`;

        sections.forEach((section: SectionRecord) => {
            htmlContent += `<tr>`;
            payload.columns.forEach(col => {
                if (col.uid !== 'actions') {
                    let value: any = section[col.uid as keyof SectionRecord];
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
            headerTemplate: `<div style="font-size: 8pt; width: 100%; text-align: center; padding: 0 10mm;">UAM - Listado de Secciones</div>`,
            footerTemplate: `<div style="font-size: 8pt; width: 100%; text-align: center; padding: 0 10mm;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>`
        });
        await browser.close();

        return new NextResponse(pdfBuffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="secciones_exportadas.pdf"`,
            },
        });

    } catch (error: any) {
        console.error('Error exportando secciones a PDF:', error);
        return NextResponse.json({ message: error.message || 'Error interno al exportar a PDF' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
