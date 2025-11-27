import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import puppeteer from 'puppeteer';
import { SoftwareLicenseListAPIRecord } from '../../route';

interface ExportFilters {
    searchText?: string;
    searchAttribute?: string;
    status?: string[] | null;
}

interface ExportPayload {
    filters: ExportFilters;
    sort: {
        column?: string;
        direction?: 'ascending' | 'descending';
    };
    columns: Array<{ uid: string; name: string }>;
}

async function fetchFilteredLicenses(connection: any, payload: ExportPayload): Promise<SoftwareLicenseListAPIRecord[]> {
    let query = `
      SELECT 
        sl.id, sl.software_name, sl.software_version, sl.license_key, sl.license_type, 
        sl.seats, DATE_FORMAT(sl.purchase_date, '%Y-%m-%d') AS purchase_date, sl.purchase_cost,
        DATE_FORMAT(sl.expiry_date, '%Y-%m-%d') AS expiry_date,
        sl.supplier_company_id, COALESCE(c.trade_name, c.legal_name) AS supplier_name,
        sl.assigned_to_user_id, CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS assigned_user_name,
        sl.notes, sl.created_at, sl.updated_at, sl.deleted_at,
        (SELECT COUNT(*) FROM asset_software_license_assignments asla WHERE asla.software_license_id = sl.id) AS assigned_assets_count
      FROM software_licenses sl
      LEFT JOIN companies c ON sl.supplier_company_id = c.id AND c.deleted_at IS NULL
      LEFT JOIN users u ON sl.assigned_to_user_id = u.id AND u.deleted_at IS NULL
      WHERE sl.deleted_at IS NULL
  `;

    const queryParams: any[] = [];
    const { filters, sort } = payload;

    if (filters.searchText && filters.searchAttribute) {
        let dbColumn = '';
        switch (filters.searchAttribute) {
            case 'software_name': dbColumn = 'sl.software_name'; break;
            case 'software_version': dbColumn = 'sl.software_version'; break;
            case 'license_key': dbColumn = 'sl.license_key'; break;
            case 'license_type': dbColumn = 'sl.license_type'; break;
            case 'supplier_name': dbColumn = 'COALESCE(c.trade_name, c.legal_name)'; break;
            case 'assigned_user_name': dbColumn = "CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))"; break;
            default: dbColumn = `sl.${filters.searchAttribute}`;
        }

        query += ` AND ${dbColumn} LIKE ?`;
        queryParams.push(`%${filters.searchText}%`);
    }

    if (sort.column && sort.direction) {
        let sortColumnDb = 'sl.software_name';
        switch (sort.column) {
            case 'software_name': sortColumnDb = 'sl.software_name'; break;
            case 'software_version': sortColumnDb = 'sl.software_version'; break;
            case 'license_type': sortColumnDb = 'sl.license_type'; break;
            case 'seats': sortColumnDb = 'sl.seats'; break;
            case 'purchase_date': sortColumnDb = 'sl.purchase_date'; break;
            case 'expiry_date': sortColumnDb = 'sl.expiry_date'; break;
            case 'supplier_name': sortColumnDb = 'COALESCE(c.trade_name, c.legal_name)'; break;
            case 'assigned_assets_count': sortColumnDb = 'assigned_assets_count'; break;
        }
        const sortDirectionDb = sort.direction === 'descending' ? 'DESC' : 'ASC';
        query += ` ORDER BY ${sortColumnDb} ${sortDirectionDb}`;
    } else {
        query += ` ORDER BY sl.software_name ASC, sl.created_at DESC`;
    }

    const [rows] = await connection.query(query, queryParams);
    return (rows as SoftwareLicenseListAPIRecord[]).map((lic: SoftwareLicenseListAPIRecord) => ({
        ...lic,
        assigned_user_name: lic.assigned_user_name?.trim() === '' ? null : lic.assigned_user_name?.trim(),
        created_at: new Date(lic.created_at).toISOString(),
        updated_at: new Date(lic.updated_at).toISOString(),
        deleted_at: lic.deleted_at ? new Date(lic.deleted_at).toISOString() : null,
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
        const licenses = await fetchFilteredLicenses(connection, payload);

        if (licenses.length === 0) {
            return NextResponse.json({ message: "No hay licencias que coincidan con los filtros para exportar." }, { status: 404 });
        }

        let htmlContent = `
      <html><head><title>Lista de Licencias de Software</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 25px; font-size: 9pt; color: #333; }
        h1 { text-align: center; font-size: 16pt; margin-bottom: 20px; color: #1a237e; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; page-break-inside: auto; }
        th, td { border: 1px solid #ccc; padding: 5px 7px; text-align: left; word-wrap: break-word; font-size: 8pt; }
        th { background-color: #e8eaf6; font-weight: bold; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
      </style></head><body>
      <h1>Lista de Licencias de Software Filtradas</h1>
      <table><thead><tr>`;

        payload.columns.forEach(col => {
            if (col.uid !== 'actions' && col.uid !== 'status_derived') {
                htmlContent += `<th>${col.name}</th>`;
            }
        });
        htmlContent += `</tr></thead><tbody>`;

        licenses.forEach((license: SoftwareLicenseListAPIRecord) => {
            htmlContent += `<tr>`;
            payload.columns.forEach(col => {
                if (col.uid !== 'actions' && col.uid !== 'status_derived') {
                    let value: any = '';

                    if (col.uid === 'license_type') {
                        value = license.license_type ? String(license.license_type).replace(/_/g, " ") : 'N/A';
                    } else {
                        value = license[col.uid as keyof SoftwareLicenseListAPIRecord];
                    }

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
            landscape: true,
            printBackground: true,
            margin: { top: '25mm', right: '15mm', bottom: '25mm', left: '15mm' },
            displayHeaderFooter: true,
            headerTemplate: `<div style="font-size: 8pt; width: 100%; text-align: center; padding: 0 10mm;">UAM - Listado de Licencias de Software</div>`,
            footerTemplate: `<div style="font-size: 8pt; width: 100%; text-align: center; padding: 0 10mm;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>`
        });
        await browser.close();

        return new NextResponse(pdfBuffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="licencias_software_exportadas.pdf"`,
            },
        });

    } catch (error: any) {
        console.error('Error exportando licencias a PDF:', error);
        return NextResponse.json({ message: error.message || 'Error interno al exportar a PDF' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
