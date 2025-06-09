// UAM-APP-64f64af525589015ece75e34ea14616deb6098c8/app/api/documents/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

interface DocumentRecord extends RowDataPacket {
    id: number;
    original_filename: string;
    stored_filename: string;
    mime_type: string;
    storage_path: string;
    entity_type: string | null;
    entity_id: number | null;
    uploaded_by_user_id: number | null;
}

const PRIVATE_UPLOAD_ROOT = path.join(process.cwd(), 'private_uploads');

async function userHasPermissionToAccessDocument(userId: number, userRoles: string[], document: DocumentRecord): Promise<boolean> {
    if (userRoles.includes('Admin')) {
        return true;
    }
    if (document.uploaded_by_user_id === userId) {
        return true;
    }
    return false;
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const currentUserId = parseInt(session.user.id, 10);
    const currentUserRoles = session.user.roles || [];

    const documentIdParam = params.id;
    const documentId = parseInt(documentIdParam, 10);

    if (isNaN(documentId) || documentId <= 0) {
        return NextResponse.json({ message: 'ID de documento inválido en la ruta.' }, { status: 400 });
    }

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        const [docRows] = await connection.query<DocumentRecord[]>(
            "SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL",
            [documentId]
        );

        if (docRows.length === 0) {
            connection.release();
            return NextResponse.json({ message: 'Documento no encontrado o ha sido eliminado.' }, { status: 404 });
        }
        const doc = docRows[0];

        const canAccess = await userHasPermissionToAccessDocument(currentUserId, currentUserRoles, doc);
        if (!canAccess) {
            connection.release();
            return NextResponse.json({ message: 'Acceso denegado a este documento.' }, { status: 403 });
        }

        const filePathOnServer = path.join(PRIVATE_UPLOAD_ROOT, doc.storage_path, doc.stored_filename);

        try {
            const fileBuffer = await fs.readFile(filePathOnServer);

            const headers = new Headers();
            headers.set('Content-Type', doc.mime_type);
            headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.original_filename)}"`);

            connection.release();
            return new NextResponse(fileBuffer, { status: 200, headers });

        } catch (fileError: any) {
            console.error(`API Descarga - Error al leer el archivo físico ${filePathOnServer}:`, fileError);
            connection.release();
            if (fileError.code === 'ENOENT') {
                return NextResponse.json({ message: 'El archivo asociado al documento no fue encontrado en el servidor.' }, { status: 404 });
            }
            return NextResponse.json({ message: 'Error al acceder al archivo en el servidor.' }, { status: 500 });
        }

    } catch (error: any) {
        if (connection) connection.release();
        console.error('API Descarga - Error general:', error);
        return NextResponse.json({ message: error.message || 'Error interno del servidor al procesar la solicitud del documento.' }, { status: 500 });
    }
}

// NUEVA FUNCIÓN DELETE
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    // Opcional: Añadir validación de roles si es necesario
    // const userRoles = session.user.roles || [];
    // if (!userRoles.includes('Admin')) {
    //   return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
    // }

    const documentId = parseInt(params.id, 10);

    if (isNaN(documentId) || documentId <= 0) {
        return NextResponse.json({ message: 'ID de documento inválido.' }, { status: 400 });
    }

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Realiza la eliminación lógica actualizando el campo 'deleted_at'
        const [result] = await connection.query<ResultSetHeader>(
            "UPDATE documents SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL",
            [documentId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return NextResponse.json({ message: 'Documento no encontrado o ya ha sido eliminado.' }, { status: 404 });
        }

        await connection.commit();
        return NextResponse.json({ message: 'Documento eliminado correctamente.' }, { status: 200 });

    } catch (error: any) {
        if (connection) await connection.rollback();
        console.error(`API Error DELETE /api/documents/${documentId}:`, error);
        return NextResponse.json({ message: 'Error interno del servidor al eliminar el documento.' }, { status: 500 });
    } finally {
        if (connection) connection.release();
    }
}