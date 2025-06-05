// app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

// Interfaz para la información del documento que se devolverá
// Similar a la que usamos en el componente AssociatedDocumentsList (GenericDocumentInfo)
export interface DocumentDetails extends RowDataPacket {
    id: number; // ID del documento mismo
    original_filename: string;
    mime_type: string;
    file_size_bytes: number;
    storage_path: string; // Podría ser útil para la depuración o si el cliente necesita la ruta relativa.
    document_category: string | null;
    description: string | null;
    uploaded_by_user_id: number | null;
    uploaded_by_user_name?: string | null; // Nombre del usuario que subió el doc
    created_at: string; // Fecha de subida (ISO string)
    // No se incluye entity_type ni entity_id porque se usan como parámetros de filtro
}

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityIdParam = searchParams.get('entityId');

    if (!entityType) {
        return NextResponse.json({ message: 'El parámetro entityType es requerido.' }, { status: 400 });
    }
    if (!entityIdParam) {
        return NextResponse.json({ message: 'El parámetro entityId es requerido.' }, { status: 400 });
    }

    const entityId = parseInt(entityIdParam, 10);
    if (isNaN(entityId) || entityId <= 0) {
        return NextResponse.json({ message: 'El parámetro entityId debe ser un número positivo.' }, { status: 400 });
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
                d.entity_type = ?
                AND d.entity_id = ?
                AND d.deleted_at IS NULL
            ORDER BY
                d.created_at DESC;
        `;

        const [rows] = await connection.query<DocumentDetails[]>(query, [entityType, entityId]);

        const documents = rows.map(doc => ({
            ...doc,
            uploaded_by_user_name: (doc.uploaded_by_user_name || '').trim() || 'Sistema',
            created_at: doc.created_at ? new Date(doc.created_at).toISOString() : new Date().toISOString(),
        }));

        return NextResponse.json(documents, { status: 200 });

    } catch (error: any) {
        console.error(`API Error GET /api/documents (entityType: ${entityType}, entityId: ${entityId}):`, error);
        return NextResponse.json({ message: 'Error interno al obtener los documentos.', errorDetails: error.message }, { status: 500 });
    } finally {
        if (connection) {
            connection.release();
        }
    }
}