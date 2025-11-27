import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import puppeteer from 'puppeteer';
import { UserDetailsFromDB } from '@/lib/data/users';

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

async function fetchFilteredUsers(connection: any, payload: ExportPayload): Promise<UserDetailsFromDB[]> {
    let query = `
      SELECT
          u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.status,
          u.national_id, DATE_FORMAT(u.birth_date, '%Y-%m-%d') AS birth_date,
          u.email_verified_at, u.created_at, u.updated_at,
          s.id AS section_id, s.name AS section_name,
          (SELECT GROUP_CONCAT(r_names.name SEPARATOR ', ') 
           FROM user_roles ur_names JOIN roles r_names ON ur_names.role_id = r_names.id 
           WHERE ur_names.user_id = u.id) AS roles
      FROM users u
      LEFT JOIN sections s ON u.section_id = s.id
      WHERE u.deleted_at IS NULL
  `;

    const queryParams: any[] = [];
    const { filters, sort } = payload;

    if (filters.searchText && filters.searchAttribute) {
        let dbColumn = '';
        switch (filters.searchAttribute) {
            case 'user': dbColumn = "CONCAT(u.first_name, ' ', u.last_name)"; break;
            case 'email': dbColumn = 'u.email'; break;
            case 'section_name': dbColumn = 's.name'; break;
            case 'national_id': dbColumn = 'u.national_id'; break;
            case 'roles': dbColumn = "(SELECT GROUP_CONCAT(r_names.name SEPARATOR ', ') FROM user_roles ur_names JOIN roles r_names ON ur_names.role_id = r_names.id WHERE ur_names.user_id = u.id)"; break;
            case 'status': dbColumn = 'u.status'; break;
            default: dbColumn = `u.${filters.searchAttribute}`;
        }

        if (filters.searchAttribute === 'status') {
            query += ` AND (u.status LIKE ? OR REPLACE(u.status, '_', ' ') LIKE ?)`;
            queryParams.push(`%${filters.searchText}%`, `%${filters.searchText}%`);
        } else if (filters.searchAttribute === 'email_verified_at') {
            if (filters.searchText.toLowerCase().includes('verificado')) {
                query += ` AND u.email_verified_at IS NOT NULL`;
            } else {
                query += ` AND u.email_verified_at IS NULL`;
            }
        } else {
            query += ` AND ${dbColumn} LIKE ?`;
            queryParams.push(`%${filters.searchText}%`);
        }
    }

    if (filters.status && filters.status.length > 0) {
        query += ` AND u.status IN (?)`;
        queryParams.push(filters.status);
    }

    if (sort.column && sort.direction) {
        let sortColumnDb = 'u.last_name';
        switch (sort.column) {
            case 'user': sortColumnDb = 'u.first_name'; break;
            case 'email': sortColumnDb = 'u.email'; break;
            case 'section_name': sortColumnDb = 's.name'; break;
            case 'status': sortColumnDb = 'u.status'; break;
            case 'national_id': sortColumnDb = 'u.national_id'; break;
            case 'birth_date': sortColumnDb = 'u.birth_date'; break;
            case 'created_at': sortColumnDb = 'u.created_at'; break;
            case 'updated_at': sortColumnDb = 'u.updated_at'; break;
            case 'email_verified_at': sortColumnDb = 'u.email_verified_at'; break;
        }
        const sortDirectionDb = sort.direction === 'descending' ? 'DESC' : 'ASC';
        query += ` ORDER BY ${sortColumnDb} ${sortDirectionDb}`;
    } else {
        query += ` ORDER BY u.last_name ASC, u.first_name ASC`;
    }

    const [rows] = await connection.query(query, queryParams);
    return (rows as UserDetailsFromDB[]).map((user: UserDetailsFromDB) => ({
        ...user,
        email_verified_at: user.email_verified_at ? new Date(user.email_verified_at).toISOString() : null,
        created_at: new Date(user.created_at).toISOString(),
        updated_at: new Date(user.updated_at).toISOString(),
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
        const users = await fetchFilteredUsers(connection, payload);

        if (users.length === 0) {
            return NextResponse.json({ message: "No hay usuarios que coincidan con los filtros para exportar." }, { status: 404 });
        }

        let htmlContent = `
      <html><head><title>Lista de Usuarios</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 25px; font-size: 9pt; color: #333; }
        h1 { text-align: center; font-size: 16pt; margin-bottom: 20px; color: #1a237e; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; page-break-inside: auto; }
        th, td { border: 1px solid #ccc; padding: 5px 7px; text-align: left; word-wrap: break-word; font-size: 8pt; }
        th { background-color: #e8eaf6; font-weight: bold; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
      </style></head><body>
      <h1>Lista de Usuarios Filtrados</h1>
      <table><thead><tr>`;

        payload.columns.forEach(col => {
            if (col.uid !== 'actions') {
                htmlContent += `<th>${col.name}</th>`;
            }
        });
        htmlContent += `</tr></thead><tbody>`;

        users.forEach((user: UserDetailsFromDB) => {
            htmlContent += `<tr>`;
            payload.columns.forEach(col => {
                if (col.uid !== 'actions') {
                    let value: any = '';

                    if (col.uid === 'user') {
                        value = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                    } else if (col.uid === 'status') {
                        value = user.status ? String(user.status).replace(/_/g, " ") : 'N/A';
                    } else if (col.uid === 'email_verified_at') {
                        value = user.email_verified_at ? 'Verificado' : 'No Verificado';
                    } else {
                        value = user[col.uid as keyof UserDetailsFromDB];
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
            headerTemplate: `<div style="font-size: 8pt; width: 100%; text-align: center; padding: 0 10mm;">UAM - Listado de Usuarios</div>`,
            footerTemplate: `<div style="font-size: 8pt; width: 100%; text-align: center; padding: 0 10mm;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>`
        });
        await browser.close();

        // Cast pdfBuffer to any to avoid type mismatch with NextResponse body
        return new NextResponse(pdfBuffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="usuarios_exportados.pdf"`,
            },
        });

    } catch (error: any) {
        console.error('Error exportando usuarios a PDF:', error);
        return NextResponse.json({ message: error.message || 'Error interno al exportar a PDF' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
