// app/api/assets/[id]/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

interface ParamsContext {
    params: {
        id: string; // El ID del activo (entity_id en la tabla documents)
    };
}

// Interfaz para la información del documento que se devolverá al frontend
// Asegúrate de que coincida con la que usas en el frontend.
export interface AssetDocumentInfo extends RowDataPacket {
    id: number; // ID del documento mismo
    original_filename: string;
    mime_type: string;
    file_size_bytes: number;
    // storage_path: string; // No es estrictamente necesario para el listado, pero sí para la descarga
    document_category: string | null;
    description: string | null;
    uploaded_by_user_id: number | null;
    uploaded_by_user_name?: string | null;
    created_at: string; // Fecha de subida
}

export async function GET(request: NextRequest, context: ParamsContext) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    // console.log("API /api/assets/[id]/documents - context.params:", JSON.stringify(context.params));
    const assetIdParam = context.params.id; // Parámetro dinámico de la ruta (debe ser [id])
    const assetId = parseInt(assetIdParam, 10);

    if (isNaN(assetId) || assetId <= 0) {
        // console.error("API /api/assets/[id]/documents - ID de activo inválido:", assetIdParam);
        return NextResponse.json({ message: 'ID de activo inválido proporcionado en la ruta.' }, { status: 400 });
    }

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        const query = `
      SELECT
          d.id,
          d.original_filename,
          d.mime_type,
          d.file_size_bytes,
          d.storage_path, 
          d.document_category,
          d.description,
          d.uploaded_by_user_id,
          CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS uploaded_by_user_name,
          d.created_at
      FROM
          documents d
      LEFT JOIN
          users u ON d.uploaded_by_user_id = u.id
      WHERE
          d.entity_type = 'asset' 
          AND d.entity_id = ? 
          AND d.deleted_at IS NULL
      ORDER BY
          d.created_at DESC;
    `;
        // console.log(`API /api/assets/[id]/documents - Executing query for assetId: ${assetId}`);
        const [rows] = await connection.query<AssetDocumentInfo[]>(query, [assetId]);
        // console.log(`API /api/assets/[id]/documents - Rows fetched: ${rows.length}`);

        const documents = rows.map(doc => ({
            ...doc,
            uploaded_by_user_name: (doc.uploaded_by_user_name || '').trim() || 'Sistema', // Default si no hay user
            created_at: doc.created_at ? new Date(doc.created_at).toISOString() : new Date().toISOString(),
        }));

        return NextResponse.json(documents, { status: 200 });

    } catch (error: any) {
        console.error(`API Error GET /api/assets/${assetId}/documents:`, error);
        return NextResponse.json({ message: 'Error interno al obtener los documentos del activo.', errorDetails: error.message }, { status: 500 });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}