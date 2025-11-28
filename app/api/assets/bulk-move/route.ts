// app/api/assets/bulk-move/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { ResultSetHeader } from 'mysql2/promise';

interface BulkMovePayload {
    assetIds: (string | number)[];
    lugar_destino_id: number;
    persona_recibe_id: number;
    tipo_ubicacion: string;
    dependencia_destino_id: number;
    fecha_movimiento_str: string;
    fecha_recibido_str: string;
    notes?: string;
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        const body: BulkMovePayload = await request.json();
        const {
            assetIds,
            lugar_destino_id,
            persona_recibe_id,
            tipo_ubicacion,
            dependencia_destino_id,
            fecha_movimiento_str,
            fecha_recibido_str,
            notes
        } = body;

        // Validaciones
        if (!assetIds || assetIds.length === 0) {
            return NextResponse.json({ message: 'Debe proporcionar al menos un activo para mover.' }, { status: 400 });
        }

        if (!lugar_destino_id || !persona_recibe_id || !tipo_ubicacion || !dependencia_destino_id) {
            return NextResponse.json({ message: 'Faltan campos obligatorios.' }, { status: 400 });
        }

        await connection.beginTransaction();

        const userId = session.user.id;
        const successfulMoves: number[] = [];
        const failedMoves: { assetId: string | number; error: string }[] = [];

        // Procesar cada activo
        for (const assetId of assetIds) {
            try {
                // Obtener ubicación actual del activo
                const [assetRows]: any = await connection.query(
                    "SELECT current_section_id, current_location_id FROM assets WHERE id = ? AND deleted_at IS NULL",
                    [assetId]
                );

                if (assetRows.length === 0) {
                    failedMoves.push({ assetId, error: 'Activo no encontrado o eliminado' });
                    continue;
                }

                const currentAsset = assetRows[0];

                // Insertar transferencia en asset_transfers
                const insertTransferQuery = `
                    INSERT INTO asset_transfers (
                        asset_id, 
                        from_section_id, 
                        from_location_id, 
                        from_user_id,
                        to_section_id, 
                        to_location_id, 
                        to_user_id,
                        received_by_user_id,
                        transfer_date, 
                        received_date, 
                        notes,
                        created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `;

                await connection.query<ResultSetHeader>(insertTransferQuery, [
                    assetId,
                    currentAsset.current_section_id,  // from_section_id
                    currentAsset.current_location_id, // from_location_id
                    userId,                            // from_user_id (quien entrega)
                    dependencia_destino_id,            // to_section_id
                    lugar_destino_id,                  // to_location_id
                    persona_recibe_id,                 // to_user_id
                    persona_recibe_id,                 // received_by_user_id
                    fecha_movimiento_str.slice(0, 19).replace('T', ' '), // transfer_date (MySQL format)
                    fecha_recibido_str.slice(0, 19).replace('T', ' '),   // received_date (MySQL format)
                    notes || null                      // notes
                ]);

                // Actualizar ubicación actual del activo
                await connection.query(
                    "UPDATE assets SET current_section_id = ?, current_location_id = ?, updated_at = NOW() WHERE id = ?",
                    [dependencia_destino_id, lugar_destino_id, assetId]
                );

                successfulMoves.push(Number(assetId));
            } catch (error: any) {
                console.error(`Error moviendo activo ${assetId}:`, error);
                failedMoves.push({ assetId, error: error.message || 'Error desconocido' });
            }
        }

        await connection.commit();

        const message = failedMoves.length > 0
            ? `${successfulMoves.length} activos movidos correctamente. ${failedMoves.length} fallaron.`
            : `${successfulMoves.length} activos movidos correctamente.`;

        return NextResponse.json({
            message,
            successful: successfulMoves,
            failed: failedMoves
        }, { status: failedMoves.length > 0 ? 207 : 200 }); // 207 Multi-Status

    } catch (error: any) {
        if (connection) await connection.rollback();
        console.error('Error en movimiento masivo:', error);
        return NextResponse.json({
            message: error.message || 'Error interno al procesar el movimiento masivo.'
        }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}
