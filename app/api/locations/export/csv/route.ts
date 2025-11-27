import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
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

const CSV_EXPORT_COLUMNS_ORDERED = [
    { key: 'name', header: 'Nombre' },
    { key: 'description', header: 'Descripción' },
    { key: 'section_name', header: 'Sección' },
    { key: 'created_at', header: 'Fecha Creación' },
];

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

        const csvHeaderString = CSV_EXPORT_COLUMNS_ORDERED.map(col => `"${col.header.replace(/"/g, '""')}"`).join(',') + '\r\n';

        const csvRows = locations.map((location: LocationRecord) => {
            return CSV_EXPORT_COLUMNS_ORDERED.map(colInfo => {
                let value = location[colInfo.key as keyof LocationRecord];
                return `"${String(value === null || value === undefined ? '' : value).replace(/"/g, '""')}"`;
            }).join(',');
        }).join('\r\n');

        const csvData = csvHeaderString + csvRows;

        return new NextResponse(csvData, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="ubicaciones_exportadas.csv"`,
            },
        });

    } catch (error: any) {
        console.error('Error exportando ubicaciones a CSV:', error);
        return NextResponse.json({ message: error.message || 'Error interno al exportar a CSV' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
