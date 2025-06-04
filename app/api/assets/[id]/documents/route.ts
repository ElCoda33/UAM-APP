// app/api/assets/[assetId]/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

interface ParamsContext {
    params: {
        assetId: string; // El ID del activo vendrá de la ruta
    };
}

// Interfaz para la información del documento que se devolverá al frontend
export interface AssetDocumentInfo extends RowDataPacket {
    id: number;
    original_filename: string;
    mime_type: string;
    file_size_bytes: number;
    storage_path: string;
    document_category: string | null;
    description: string | null;
    uploaded_by_user_id: number | null;
    uploaded_by_user_name?: string | null; // Opcional: Nombre del usuario que subió
    created_at: string; // Fecha de subida
}

export async function GET(request: NextRequest, context: ParamsContext) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const assetId = parseInt(context.params.assetId, 10);
    if (isNaN(assetId)) {
        return NextResponse.json({ message: 'ID de activo inválido' }, { status: 400 });
    }

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        // Consulta para obtener documentos asociados al assetId, con el nombre del usuario que lo subió
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

        const [rows] = await connection.query<AssetDocumentInfo[]>(query, [assetId]);

        const documents = rows.map(doc => ({
            ...doc,
            uploaded_by_user_name: (doc.uploaded_by_user_name || '').trim() || 'Desconocido',
            created_at: doc.created_at ? new Date(doc.created_at).toISOString() : new Date().toISOString(),
        }));

        return NextResponse.json(documents, { status: 200 });

    } catch (error) {
        console.error(`API Error GET /api/assets/${assetId}/documents:`, error);
        return NextResponse.json({ message: 'Error interno al obtener los documentos del activo' }, { status: 500 });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}