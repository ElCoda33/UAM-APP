// app/api/assets/[id]/move/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; //
import { getPool } from '@/lib/db'; //
import { RowDataPacket } from 'mysql2/promise';

interface Params {
  id: string; // Asset ID from URL
}

interface MoveAssetRequestBody {
  lugar_destino_name: string;
  persona_recibe_ci: string;
  tipo_ubicacion: string;
  dependencia_destino_name: string; // Target section name
  // From UserContext, passed by form:
  ci_usuario_autoriza: string;
  seccion_transfiere_name: string;
  // Dates passed by form:
  fecha_movimiento_str: string;
  fecha_recibido_str: string;
}

interface IdResult extends RowDataPacket {
  id: number;
}
interface AssetIdResult extends RowDataPacket {
  id: number;
  current_location_id: number | null;
  current_section_id: number | null; // ID de la sección actual del activo
  status: string | null; // Estado actual del activo
}

export async function POST(request: NextRequest, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  // El ID del usuario logueado se obtiene de session.user.id

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
      persona_recibe_ci,
      tipo_ubicacion,
      dependencia_destino_name,
      ci_usuario_autoriza, // CI del usuario logueado (que realiza la acción)
      seccion_transfiere_name, // Nombre de la sección del usuario logueado
      fecha_movimiento_str,
      fecha_recibido_str,
    } = body;

    if (!lugar_destino_name || !persona_recibe_ci || !tipo_ubicacion || !dependencia_destino_name) {
      await connection.release();
      return NextResponse.json({ message: 'Faltan campos obligatorios en la solicitud.' }, { status: 400 });
    }

    await connection.beginTransaction();

    // 1. Obtener IDs y datos actuales
    const [assetRows] = await connection.query<AssetIdResult[]>(
      "SELECT id, current_location_id, current_section_id, status FROM assets WHERE id = ?",
      [assetIdFromUrl]
    );
    if (assetRows.length === 0) throw new Error(`Activo con ID '${assetIdFromUrl}' no encontrado.`);
    const asset_id = assetRows[0].id;
    const from_location_id = assetRows[0].current_location_id;
    const from_section_id_actual = assetRows[0].current_section_id; // Sección de origen real del activo
    const current_asset_status = assetRows[0].status;


    // Validar que la sección que transfiere (del usuario logueado) coincide con la sección actual del activo,
    // o definir reglas de negocio si pueden ser diferentes.
    const [fromSectionUserRows] = await connection.query<IdResult[]>("SELECT id FROM sections WHERE name = ?", [seccion_transfiere_name]);
    if (fromSectionUserRows.length === 0) throw new Error(`Sección de origen (usuario) '${seccion_transfiere_name}' no encontrada.`);
    const from_section_id_usuario = fromSectionUserRows[0].id;

    // Podrías añadir una validación aquí: if (from_section_id_usuario !== from_section_id_actual && tipo_ubicacion !== 'Dar de baja') { ... }


    const [toSectionRows] = await connection.query<IdResult[]>("SELECT id FROM sections WHERE name = ?", [dependencia_destino_name]);
    if (toSectionRows.length === 0) throw new Error(`Sección de destino '${dependencia_destino_name}' no encontrada.`);
    const to_section_id = toSectionRows[0].id;

    const [toLocationRows] = await connection.query<IdResult[]>("SELECT id FROM locations WHERE name = ? AND section_id = ?", [lugar_destino_name, to_section_id]);
    if (toLocationRows.length === 0) throw new Error(`Lugar de destino '${lugar_destino_name}' no encontrado en la sección '${dependencia_destino_name}'.`);
    const to_location_id = toLocationRows[0].id;

    const [authorizingUserRows] = await connection.query<IdResult[]>("SELECT id FROM users WHERE national_id = ?", [ci_usuario_autoriza]);
    if (authorizingUserRows.length === 0) throw new Error(`Usuario autorizante con CI '${ci_usuario_autoriza}' no encontrado.`);
    const authorized_by_user_id = authorizingUserRows[0].id;
    // Verificar que el usuario autorizante es el logueado
    if (String(authorized_by_user_id) !== session.user.id) {
      throw new Error("El usuario que autoriza no coincide con el usuario logueado.");
    }

    const [receivingUserRows] = await connection.query<IdResult[]>("SELECT id FROM users WHERE national_id = ?", [persona_recibe_ci]);
    if (receivingUserRows.length === 0) throw new Error(`Usuario receptor con CI '${persona_recibe_ci}' no encontrado.`);
    const received_by_user_id = receivingUserRows[0].id;

    const transfer_date = new Date(fecha_movimiento_str).toISOString().slice(0, 19).replace('T', ' ');
    const received_date = new Date(fecha_recibido_str).toISOString().slice(0, 19).replace('T', ' ');

    // 2. Actualizar la tabla 'assets'
    let newAssetStatus = current_asset_status; // Por defecto, mantener estado actual
    let updateAssetSectionId: number | null = to_section_id;
    let updateAssetLocationId: number | null = to_location_id;

    if (tipo_ubicacion === 'Dar de baja') {
      newAssetStatus = 'disposed';
      updateAssetSectionId = null; // Al dar de baja, podría no tener sección/ubicación
      updateAssetLocationId = null;
    } else if (tipo_ubicacion === 'Externa') {
      // Lógica específica si el movimiento es a una ubicación externa,
      // podrías querer limpiar current_location_id o usar un ID de ubicación externa.
      // Por ahora, se asume que 'lugar_destino_name' es una ubicación válida en la DB.
    }
    // Si es 'Interna', ya tenemos to_section_id y to_location_id.

    await connection.query(
      "UPDATE assets SET current_section_id = ?, current_location_id = ?, status = ?, updated_at = NOW() WHERE id = ?",
      [updateAssetSectionId, updateAssetLocationId, newAssetStatus, asset_id]
    );

    // 3. Insertar en 'asset_transfers'
    const notesForTransfer = `Tipo de movimiento: ${tipo_ubicacion}.`;
    const insertTransferQuery = `
        INSERT INTO asset_transfers (
            asset_id, transfer_date, 
            from_section_id, from_location_id, /* Sección/ubicación de origen reales del activo */
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
    if (connection) {
      await connection.rollback();
    }
    console.error("API Error POST /api/assets/[id]/move:", error);
    return NextResponse.json({ message: error.message || 'Error al procesar el movimiento del activo.' }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}