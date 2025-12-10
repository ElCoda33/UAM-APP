import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { networkConnectionSchema } from '@/lib/schema';

interface Params {
  id: string;
}

export async function GET(request: Request, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const { id } = context.params;
  const assetId = parseInt(id);

  if (isNaN(assetId)) {
    return NextResponse.json({ message: 'ID de activo inválido' }, { status: 400 });
  }

  try {
    const pool = getPool();
    // Fetch connections where this asset is the source (asset_id)
    // We join with assets table to get details of the connected asset
    const query = `
      SELECT 
        anc.id,
        anc.asset_id,
        anc.connected_to_asset_id,
        anc.connection_type,
        anc.port_number,
        anc.notes,
        a.product_name as connected_asset_name,
        a.ip_address as connected_asset_ip,
        a.it_device_type as connected_asset_device_type
      FROM asset_network_connections anc
      JOIN assets a ON anc.connected_to_asset_id = a.id
      WHERE anc.asset_id = ?
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [assetId]);

    return NextResponse.json(rows, { status: 200 });
  } catch (error: any) {
    console.error(`API Error GET /api/assets/${assetId}/connections:`, error);
    return NextResponse.json({ message: 'Error al obtener conexiones', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const { id } = context.params;
  const assetId = parseInt(id);

  if (isNaN(assetId)) {
    return NextResponse.json({ message: 'ID de activo inválido' }, { status: 400 });
  }

  try {
    const body = await request.json();

    // Validate body
    const validation = networkConnectionSchema.safeParse({
      ...body,
      asset_id: assetId // Force asset_id from URL
    });

    if (!validation.success) {
      return NextResponse.json({
        message: 'Datos inválidos',
        errors: validation.error.flatten().fieldErrors
      }, { status: 400 });
    }

    const { connected_to_asset_id, connection_type, port_number, notes } = validation.data;

    if (assetId === connected_to_asset_id) {
      return NextResponse.json({ message: 'No se puede conectar un activo a sí mismo' }, { status: 400 });
    }

    const pool = getPool();

    // Check if connection already exists
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM asset_network_connections WHERE asset_id = ? AND connected_to_asset_id = ?',
      [assetId, connected_to_asset_id]
    );

    if (existing.length > 0) {
      return NextResponse.json({ message: 'Ya existe una conexión con este dispositivo' }, { status: 409 });
    }

    const query = `
      INSERT INTO asset_network_connections (asset_id, connected_to_asset_id, connection_type, port_number, notes)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query<ResultSetHeader>(query, [
      assetId, connected_to_asset_id, connection_type, port_number, notes
    ]);

    return NextResponse.json({
      message: 'Conexión creada correctamente',
      id: result.insertId
    }, { status: 201 });

  } catch (error: any) {
    console.error(`API Error POST /api/assets/${assetId}/connections:`, error);
    return NextResponse.json({ message: 'Error al crear conexión', error: error.message }, { status: 500 });
  }
}
