import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
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

const CSV_EXPORT_COLUMNS_ORDERED = [
    { key: 'name', header: 'Nombre' },
    { key: 'management_level', header: 'Nivel Gerencial' },
    { key: 'email', header: 'Email' },
    { key: 'parent_section_name', header: 'Sección Padre' },
    { key: 'created_at', header: 'Fecha Creación' },
];

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

        const csvHeaderString = CSV_EXPORT_COLUMNS_ORDERED.map(col => `"${col.header.replace(/"/g, '""')}"`).join(',') + '\r\n';

        const csvRows = sections.map((section: SectionRecord) => {
            return CSV_EXPORT_COLUMNS_ORDERED.map(colInfo => {
                let value = section[colInfo.key as keyof SectionRecord];
                return `"${String(value === null || value === undefined ? '' : value).replace(/"/g, '""')}"`;
            }).join(',');
        }).join('\r\n');

        const csvData = csvHeaderString + csvRows;

        return new NextResponse(csvData, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="secciones_exportadas.csv"`,
            },
        });

    } catch (error: any) {
        console.error('Error exportando secciones a CSV:', error);
        return NextResponse.json({ message: error.message || 'Error interno al exportar a CSV' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
