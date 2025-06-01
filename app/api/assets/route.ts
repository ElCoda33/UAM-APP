// app/api/assets/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

// Interfaz para el objeto Asset tal como se devolverá desde esta API
export interface IAssetAPI extends RowDataPacket {
  id: number;
  serial_number: string | null;
  inventory_code: string;
  description: string | null;
  product_name: string;
  warranty_expiry_date: string | null; // Se enviarán como string YYYY-MM-DD
  current_section_id: number | null;
  current_section_name: string | null; // Nombre de la sección actual
  current_location_id: number | null;
  current_location_name: string | null; // Nombre de la ubicación actual
  supplier_company_id: number | null;
  supplier_company_name: string | null; // Nombre legal de la empresa proveedora
  supplier_company_tax_id: string | null; // RUT/Tax ID de la empresa proveedora
  purchase_date: string | null; // Se enviarán como string YYYY-MM-DD
  invoice_number: string | null;
  acquisition_procedure: string | null;
  status: 'in_use' | 'in_storage' | 'under_repair' | 'disposed' | 'lost' | null;
  image_url: string | null;
  created_at: string; // ISO Timestamp string
  updated_at: string; // ISO Timestamp string
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  // Opcional: Verificar roles si solo ciertos usuarios pueden ver todos los activos
  // const userRoles = session.user.roles || [];
  // if (!userRoles.includes('Admin') && !userRoles.includes('AssetManager')) {
  //   return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
  // }

  const pool = getPool();

  try {
    // Query para obtener activos con nombres de tablas relacionadas
    const query = `
      SELECT
          a.id,
          a.serial_number,
          a.inventory_code,
          a.description,
          a.product_name,
          DATE_FORMAT(a.warranty_expiry_date, '%Y-%m-%d') AS warranty_expiry_date,
          a.current_section_id,
          s.name AS current_section_name,
          a.current_location_id,
          l.name AS current_location_name,
          a.supplier_company_id,
          c.legal_name AS supplier_company_name,
          c.tax_id AS supplier_company_tax_id,
          DATE_FORMAT(a.purchase_date, '%Y-%m-%d') AS purchase_date,
          a.invoice_number,
          a.acquisition_procedure,
          a.status,
          a.image_url,
          a.created_at,
          a.updated_at
      FROM
          assets a
      LEFT JOIN
          sections s ON a.current_section_id = s.id
      LEFT JOIN
          locations l ON a.current_location_id = l.id
      LEFT JOIN
          companies c ON a.supplier_company_id = c.id
      ORDER BY
          a.created_at DESC;
    `;

    const [assetRows] = await pool.query<IAssetAPI[]>(query);

    // Convertir timestamps a string ISO para consistencia
    const assetsWithISOStrings = assetRows.map(asset => ({
      ...asset,
      created_at: asset.created_at ? new Date(asset.created_at).toISOString() : '', // O null si prefieres
      updated_at: asset.updated_at ? new Date(asset.updated_at).toISOString() : '', // O null
    }));


    return NextResponse.json(assetsWithISOStrings, { status: 200 });

  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener activos' }, { status: 500 });
  }
}