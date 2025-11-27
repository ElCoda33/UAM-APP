import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
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

const CSV_EXPORT_COLUMNS_ORDERED = [
    { key: 'legal_name', header: 'Razón Social' },
    { key: 'trade_name', header: 'Nombre Fantasía' },
    { key: 'tax_id', header: 'RUT' },
    { key: 'email', header: 'Email' },
    { key: 'phone_number', header: 'Teléfono' },
    { key: 'created_at', header: 'Fecha Creación' },
];

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

        const csvHeaderString = CSV_EXPORT_COLUMNS_ORDERED.map(col => `"${col.header.replace(/"/g, '""')}"`).join(',') + '\r\n';

        const csvRows = companies.map((company: CompanyRecord) => {
            return CSV_EXPORT_COLUMNS_ORDERED.map(colInfo => {
                let value = company[colInfo.key as keyof CompanyRecord];
                return `"${String(value === null || value === undefined ? '' : value).replace(/"/g, '""')}"`;
            }).join(',');
        }).join('\r\n');

        const csvData = csvHeaderString + csvRows;

        return new NextResponse(csvData, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="empresas_exportadas.csv"`,
            },
        });

    } catch (error: any) {
        console.error('Error exportando empresas a CSV:', error);
        return NextResponse.json({ message: error.message || 'Error interno al exportar a CSV' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
