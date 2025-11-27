import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
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

const CSV_EXPORT_COLUMNS_ORDERED = [
    { key: 'first_name', header: 'Nombre' },
    { key: 'last_name', header: 'Apellido' },
    { key: 'email', header: 'Email' },
    { key: 'roles', header: 'Roles' },
    { key: 'section_name', header: 'Sección' },
    { key: 'status', header: 'Estado' },
    { key: 'national_id', header: 'ID Nacional' },
    { key: 'birth_date', header: 'Fecha Nacimiento' },
    { key: 'email_verified_at', header: 'Email Verificado' },
    { key: 'created_at', header: 'Creado El' },
];

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
        let sortColumnDb = 'u.last_name'; // Default
        switch (sort.column) {
            case 'user': sortColumnDb = 'u.first_name'; break; // Sort by first name then last name usually, but let's pick one
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

        const csvHeaderString = CSV_EXPORT_COLUMNS_ORDERED.map(col => `"${col.header.replace(/"/g, '""')}"`).join(',') + '\r\n';

        const csvRows = users.map((user: UserDetailsFromDB) => {
            return CSV_EXPORT_COLUMNS_ORDERED.map(colInfo => {
                let value = user[colInfo.key as keyof UserDetailsFromDB];

                if (colInfo.key === 'status') {
                    value = value ? String(value).replace(/_/g, " ") : '';
                } else if (colInfo.key === 'email_verified_at') {
                    value = value ? 'Verificado' : 'No Verificado';
                }

                return `"${String(value === null || value === undefined ? '' : value).replace(/"/g, '""')}"`;
            }).join(',');
        }).join('\r\n');

        const csvData = csvHeaderString + csvRows;

        return new NextResponse(csvData, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="usuarios_exportados.csv"`,
            },
        });

    } catch (error: any) {
        console.error('Error exportando usuarios a CSV:', error);
        return NextResponse.json({ message: error.message || 'Error interno al exportar a CSV' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
