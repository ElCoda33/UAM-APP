// app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import { RowDataPacket } from 'mysql2/promise';

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
    // Implementa tu lógica de autorización detallada aquí
    // Ejemplo básico:
    if (userRoles.includes('Admin')) {
        return true;
    }
    if (document.uploaded_by_user_id === userId) {
        return true;
    }
    // Puedes añadir más reglas, por ejemplo, si el usuario tiene acceso a la entidad vinculada (doc.entity_type, doc.entity_id)
    return false;
}

export async function GET(
    request: NextRequest,
    // El nombre del parámetro aquí DEBE COINCIDIR con el nombre de tu carpeta dinámica.
    // Si tu carpeta es [id], entonces params tendrá una propiedad 'id'.
    { params }: { params: { id: string } } // Cambiado de documentId a id
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const currentUserId = parseInt(session.user.id, 10);
    const currentUserRoles = session.user.roles || [];

    const documentIdParam = params.id; // <--- USA params.id
    const documentId = parseInt(documentIdParam, 10);

    if (isNaN(documentId) || documentId <= 0) {
        // console.error("API Descarga - ID de documento inválido recibido en params:", documentIdParam);
        return NextResponse.json({ message: 'ID de documento inválido en la ruta.' }, { status: 400 });
    }

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        // console.log(`API Descarga - Buscando documento con ID: ${documentId}`);
        const [docRows] = await connection.query<DocumentRecord[]>(
            "SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL",
            [documentId]
        );

        if (docRows.length === 0) {
            connection.release();
            // console.warn(`API Descarga - Documento ID: ${documentId} no encontrado o eliminado.`);
            return NextResponse.json({ message: 'Documento no encontrado o ha sido eliminado.' }, { status: 404 });
        }
        const doc = docRows[0];
        // console.log(`API Descarga - Documento encontrado:`, doc.original_filename);

        const canAccess = await userHasPermissionToAccessDocument(currentUserId, currentUserRoles, doc);
        if (!canAccess) {
            connection.release();
            // console.warn(`API Descarga - Acceso denegado para usuario ID: ${currentUserId} a documento ID: ${documentId}`);
            return NextResponse.json({ message: 'Acceso denegado a este documento.' }, { status: 403 });
        }

        const filePathOnServer = path.join(PRIVATE_UPLOAD_ROOT, doc.storage_path, doc.stored_filename);
        // console.log(`API Descarga - Intentando leer archivo: ${filePathOnServer}`);

        try {
            const fileBuffer = await fs.readFile(filePathOnServer);

            const headers = new Headers();
            headers.set('Content-Type', doc.mime_type);
            headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.original_filename)}"`);

            connection.release();
            // console.log(`API Descarga - Enviando archivo: ${doc.original_filename}`);
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