import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import puppeteer from 'puppeteer';
import { CompanyRecord } from '../../route';

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

async function fetchFilteredCompanies(connection: any, payload: ExportPayload): Promise<CompanyRecord[]> {
    let query = `
      SELECT id, tax_id, legal_name, trade_name, email, phone_number, created_at, updated_at
      FROM companies
    `;

    const queryParams: any[] = [];
    const { filters, sort } = payload;
    const conditions: string[] = [];

    if (filters.searchText && filters.searchAttribute) {
        let dbColumn = '';
        switch (filters.searchAttribute) {
            case 'legal_name': dbColumn = 'legal_name'; break;
            case 'trade_name': dbColumn = 'trade_name'; break;
            case 'tax_id': dbColumn = 'tax_id'; break;
            case 'email': dbColumn = 'email'; break;
            case 'phone_number': dbColumn = 'phone_number'; break;
            default: dbColumn = filters.searchAttribute;
        }

        conditions.push(`${dbColumn} LIKE ?`);
        queryParams.push(`%${filters.searchText}%`);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (sort.column && sort.direction) {
        let sortColumnDb = 'legal_name';
        switch (sort.column) {
            case 'legal_name': sortColumnDb = 'legal_name'; break;
            case 'trade_name': sortColumnDb = 'trade_name'; break;
            case 'tax_id': sortColumnDb = 'tax_id'; break;
            case 'email': sortColumnDb = 'email'; break;
            case 'phone_number': sortColumnDb = 'phone_number'; break;
            case 'created_at': sortColumnDb = 'created_at'; break;
        }
        const sortDirectionDb = sort.direction === 'descending' ? 'DESC' : 'ASC';
        query += ` ORDER BY ${sortColumnDb} ${sortDirectionDb}`;
    } else {
        query += ` ORDER BY legal_name ASC`;
    }

    const [rows] = await connection.query(query, queryParams);
    return (rows as CompanyRecord[]).map((company: CompanyRecord) => ({
        ...company,
        created_at: company.created_at ? new Date(company.created_at).toISOString() : '',
        updated_at: company.updated_at ? new Date(company.updated_at).toISOString() : '',
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
        const companies = await fetchFilteredCompanies(connection, payload);

        if (companies.length === 0) {
            return NextResponse.json({ message: "No hay empresas que coincidan con los filtros para exportar." }, { status: 404 });
        }

        let htmlContent = `
      <html><head><title>Lista de Empresas</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 25px; font-size: 9pt; color: #333; }
        h1 { text-align: center; font-size: 16pt; margin-bottom: 20px; color: #1a237e; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; page-break-inside: auto; }
        th, td { border: 1px solid #ccc; padding: 5px 7px; text-align: left; word-wrap: break-word; font-size: 8pt; }
        th { background-color: #e8eaf6; font-weight: bold; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
      </style></head><body>
      <h1>Lista de Empresas Filtradas</h1>
      <table><thead><tr>`;

        payload.columns.forEach(col => {
            if (col.uid !== 'actions') {
                htmlContent += `<th>${col.name}</th>`;
            }
        });
        htmlContent += `</tr></thead><tbody>`;

        companies.forEach((company: CompanyRecord) => {
            htmlContent += `<tr>`;
            payload.columns.forEach(col => {
                if (col.uid !== 'actions') {
                    let value: any = company[col.uid as keyof CompanyRecord];
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
            headerTemplate: `<div style="font-size: 8pt; width: 100%; text-align: center; padding: 0 10mm;">UAM - Listado de Empresas</div>`,
            footerTemplate: `<div style="font-size: 8pt; width: 100%; text-align: center; padding: 0 10mm;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>`
        });
        await browser.close();

        return new NextResponse(pdfBuffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="empresas_exportadas.pdf"`,
            },
        });

    } catch (error: any) {
        console.error('Error exportando empresas a PDF:', error);
        return NextResponse.json({ message: error.message || 'Error interno al exportar a PDF' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
