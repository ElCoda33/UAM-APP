// app/api/assets/[id]/move/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

interface Params {
  id: string; // Asset ID from URL
}

interface MoveAssetRequestBody {
  lugar_destino_name: string;
  persona_recibe_id: number; // ID del usuario seleccionado en el buscador
  tipo_ubicacion: string;
  dependencia_destino_name: string; 
  // Las fechas vienen como string desde el form
  fecha_movimiento_str: string;
  fecha_recibido_str: string;
  notes?: string;
}

interface IdResult extends RowDataPacket {
  id: number;
}

interface AssetIdResult extends RowDataPacket {
  id: number;
  current_location_id: number | null;
  current_section_id: number | null;
  status: string | null;
}

interface UserAuthResult extends RowDataPacket {
  id: number;
  national_id: string | null;
  section_id: number | null;
}

export async function POST(request: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const loggedUserId = parseInt(session.user.id, 10);
  const assetIdFromUrl = parseInt(context.params.id, 10);

  if (isNaN(assetIdFromUrl)) {
    return NextResponse.json({ message: 'ID de activo inválido en la URL.' }, { status: 400 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const body: MoveAssetRequestBody = await request.json();
    const {
      lugar_destino_name,
      persona_recibe_id,
      tipo_ubicacion,
      dependencia_destino_name,
      fecha_movimiento_str,
      fecha_recibido_str,
      notes
    } = body;

    // Validaciones básicas
    if (!lugar_destino_name || !persona_recibe_id || !tipo_ubicacion || !dependencia_destino_name) {
      await connection.release();
      return NextResponse.json({ message: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    await connection.beginTransaction();

    // 1. Obtener datos del Usuario Autorizante (el logueado) directamente de la DB
    const [authUserRows] = await connection.query<UserAuthResult[]>(
      "SELECT id, national_id, section_id FROM users WHERE id = ?",
      [loggedUserId]
    );
    if (authUserRows.length === 0) throw new Error("Usuario logueado no encontrado en base de datos.");
    const authorized_by_user_id = authUserRows[0].id;

    // 2. Obtener datos actuales del activo
    const [assetRows] = await connection.query<AssetIdResult[]>(
      "SELECT id, current_location_id, current_section_id, status FROM assets WHERE id = ?",
      [assetIdFromUrl]
    );
    if (assetRows.length === 0) throw new Error(`Activo no encontrado.`);
    const asset_id = assetRows[0].id;
    const from_location_id = assetRows[0].current_location_id;
    const from_section_id_actual = assetRows[0].current_section_id;
    const current_asset_status = assetRows[0].status;

    // 3. Obtener ID de la Sección de Destino
    const [toSectionRows] = await connection.query<IdResult[]>("SELECT id FROM sections WHERE name = ?", [dependencia_destino_name]);
    if (toSectionRows.length === 0) throw new Error(`Sección de destino '${dependencia_destino_name}' no encontrada.`);
    const to_section_id = toSectionRows[0].id;

    // 4. Obtener ID de la Ubicación de Destino
    const [toLocationRows] = await connection.query<IdResult[]>("SELECT id FROM locations WHERE name = ? AND section_id = ?", [lugar_destino_name, to_section_id]);
    if (toLocationRows.length === 0) throw new Error(`Lugar de destino '${lugar_destino_name}' no encontrado en la sección '${dependencia_destino_name}'.`);
    const to_location_id = toLocationRows[0].id;

    // 5. Validar usuario receptor (que exista y esté activo)
    const [receivingUserRows] = await connection.query<IdResult[]>("SELECT id FROM users WHERE id = ? AND deleted_at IS NULL", [persona_recibe_id]);
    if (receivingUserRows.length === 0) throw new Error(`Usuario receptor no encontrado o inactivo.`);
    const received_by_user_id = receivingUserRows[0].id;

    // Fechas
    const transfer_date = new Date(fecha_movimiento_str).toISOString().slice(0, 19).replace('T', ' ');
    const received_date = new Date(fecha_recibido_str).toISOString().slice(0, 19).replace('T', ' ');

    // 6. Actualizar tabla assets
    let newAssetStatus = current_asset_status;
    let updateAssetSectionId: number | null = to_section_id;
    let updateAssetLocationId: number | null = to_location_id;

    if (tipo_ubicacion === 'Dar de baja') {
      newAssetStatus = 'disposed';
      updateAssetSectionId = null;
      updateAssetLocationId = null;
    }

    await connection.query(
      "UPDATE assets SET current_section_id = ?, current_location_id = ?, status = ?, updated_at = NOW() WHERE id = ?",
      [updateAssetSectionId, updateAssetLocationId, newAssetStatus, asset_id]
    );

    // 7. Insertar historial en asset_transfers
    const notesForTransfer = `Tipo de movimiento: ${tipo_ubicacion}. ${notes || ''}`;
    const insertTransferQuery = `
        INSERT INTO asset_transfers (
            asset_id, transfer_date, 
            from_section_id, from_location_id,
            to_section_id, to_location_id, 
            authorized_by_user_id, received_by_user_id, received_date, 
            notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW());
    `;
    await connection.query(insertTransferQuery, [
      asset_id, transfer_date,
      from_section_id_actual, from_location_id,
      to_section_id, to_location_id,
      authorized_by_user_id, received_by_user_id, received_date,
      notesForTransfer
    ]);

    await connection.commit();
    return NextResponse.json({ message: 'Movimiento realizado correctamente' }, { status: 200 });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error("API Error POST move:", error);
    return NextResponse.json({ message: error.message || 'Error al procesar el movimiento.' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}