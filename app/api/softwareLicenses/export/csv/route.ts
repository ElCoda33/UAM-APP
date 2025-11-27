import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
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

const CSV_EXPORT_COLUMNS_ORDERED = [
    { key: 'software_name', header: 'Software' },
    { key: 'software_version', header: 'Versión' },
    { key: 'license_key', header: 'Clave de Licencia' },
    { key: 'license_type', header: 'Tipo' },
    { key: 'seats', header: 'Asientos' },
    { key: 'assigned_assets_count', header: 'Activos Asignados' },
    { key: 'purchase_date', header: 'Fecha Compra' },
    { key: 'purchase_cost', header: 'Costo' },
    { key: 'expiry_date', header: 'Fecha Expiración' },
    { key: 'supplier_name', header: 'Proveedor' },
    { key: 'assigned_user_name', header: 'Usuario Asignado' },
    { key: 'notes', header: 'Notas' },
];

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

        const csvHeaderString = CSV_EXPORT_COLUMNS_ORDERED.map(col => `"${col.header.replace(/"/g, '""')}"`).join(',') + '\r\n';

        const csvRows = licenses.map((license: SoftwareLicenseListAPIRecord) => {
            return CSV_EXPORT_COLUMNS_ORDERED.map(colInfo => {
                let value = license[colInfo.key as keyof SoftwareLicenseListAPIRecord];

                if (colInfo.key === 'license_type') {
                    // Format license type for readability
                    value = value ? String(value).replace(/_/g, " ") : '';
                }

                return `"${String(value === null || value === undefined ? '' : value).replace(/"/g, '""')}"`;
            }).join(',');
        }).join('\r\n');

        const csvData = csvHeaderString + csvRows;

        return new NextResponse(csvData, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="licencias_software_exportadas.csv"`,
            },
        });

    } catch (error: any) {
        console.error('Error exportando licencias a CSV:', error);
        return NextResponse.json({ message: error.message || 'Error interno al exportar a CSV' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
