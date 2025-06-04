// app/api/documents/[documentId]/route.ts
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
    storage_path: string; // e.g., 'invoices'
    entity_type: string | null;
    entity_id: number | null;
    uploaded_by_user_id: number | null;
    // ...otros campos que necesites para la autorización
}

const PRIVATE_UPLOAD_ROOT = path.join(process.cwd(), 'private_uploads');

// Helper de autorización (debes adaptarlo a tus reglas de negocio)
async function userHasPermissionToAccessDocument(userId: number, userRoles: string[], document: DocumentRecord): Promise<boolean> {
    // Ejemplo: Solo el que subió o un admin pueden ver todos los documentos.
    // O si el documento está vinculado a una entidad a la que el usuario tiene acceso.
    if (userRoles.includes('Admin')) { // Asumiendo que tienes 'Admin' en tus roles de NextAuth
        return true;
    }
    if (document.uploaded_by_user_id === userId) {
        return true;
    }
    // Ejemplo más complejo: si el documento es una factura de un activo,
    // y el usuario tiene permiso para ver ese activo.
    // if (document.entity_type === 'asset' && document.entity_id) {
    //   const hasAssetPermission = await checkUserAssetPermission(userId, document.entity_id);
    //   return hasAssetPermission;
    // }
    return false; // Por defecto, denegar si no hay regla explícita
}

export async function GET(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const currentUserId = parseInt(session.user.id, 10);
    const currentUserRoles = session.user.roles || [];

    const documentId = parseInt(params.documentId, 10);
    if (isNaN(documentId)) {
        return NextResponse.json({ message: 'ID de documento inválido.' }, { status: 400 });
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

        // Lógica de Autorización
        const canAccess = await userHasPermissionToAccessDocument(currentUserId, currentUserRoles, doc);
        if (!canAccess) {
            connection.release();
            return NextResponse.json({ message: 'Acceso denegado a este documento.' }, { status: 403 });
        }
        
        // Construir la ruta completa al archivo en el servidor
        const filePathOnServer = path.join(PRIVATE_UPLOAD_ROOT, doc.storage_path, doc.stored_filename);

        try {
            const fileBuffer = await fs.readFile(filePathOnServer);
            
            const headers = new Headers();
            headers.set('Content-Type', doc.mime_type);
            // Usar encodeURIComponent para nombres de archivo con caracteres especiales
            headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.original_filename)}"`);

            connection.release();
            return new NextResponse(fileBuffer, { status: 200, headers });

        } catch (fileError: any) {
            console.error(`Error al leer el archivo físico ${filePathOnServer}:`, fileError);
            // Distinguir si el archivo no existe físicamente de otros errores
            if (fileError.code === 'ENOENT') {
                connection.release();
                // Esto podría indicar una inconsistencia: registro en DB pero archivo faltante.
                return NextResponse.json({ message: 'El archivo asociado al documento no fue encontrado en el servidor.' }, { status: 404 });
            }
            connection.release();
            return NextResponse.json({ message: 'Error al acceder al archivo en el servidor.' }, { status: 500 });
        }

    } catch (error) {
        if (connection) connection.release();
        console.error('Error API GET /api/documents/[documentId]:', error);
        return NextResponse.json({ message: 'Error interno del servidor al procesar la solicitud del documento.' }, { status: 500 });
    }
}