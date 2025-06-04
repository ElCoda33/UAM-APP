// app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ResultSetHeader } from 'mysql2/promise';

// Directorio raíz para las subidas privadas (ajusta según tu Paso 1)
const PRIVATE_UPLOAD_ROOT = path.join(process.cwd(), 'private_uploads');
const INVOICES_SUBDIRECTORY = 'invoices'; // Subdirectorio específico para facturas

async function ensureUploadDirExists(subDir: string) {
  const fullDir = path.join(PRIVATE_UPLOAD_ROOT, subDir);
  try {
    await fs.access(fullDir);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      try {
        await fs.mkdir(fullDir, { recursive: true });
        console.log(`Directorio de subida creado: ${fullDir}`);
      } catch (mkdirError) {
        console.error(`Error al crear el directorio ${fullDir}:`, mkdirError);
        throw mkdirError; // Relanzar para que el manejador principal lo capture
      }
    } else {
      console.error(`Error al acceder al directorio ${fullDir}:`, error);
      throw error; // Relanzar
    }
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  const userId = parseInt(session.user.id, 10);

  try {
    await ensureUploadDirExists(INVOICES_SUBDIRECTORY);
  } catch (dirError) {
    console.error("Fallo crítico al asegurar el directorio de subida:", dirError);
    return NextResponse.json({ message: 'Error de configuración del servidor para la subida de archivos.' }, { status: 500 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const formData = await request.formData();
    const file = formData.get('invoiceFile') as File | null; // Espera un campo 'invoiceFile'
    
    // Obtener metadata adicional del formData
    const entityType = formData.get('entityType') as string | null; // ej: 'asset', 'software_license'
    const entityIdStr = formData.get('entityId') as string | null;
    const documentCategory = formData.get('documentCategory') as string | null; // ej: 'invoice_purchase'
    const description = formData.get('description') as string | null;

    const entityId = entityIdStr ? parseInt(entityIdStr, 10) : null;
    if (entityIdStr && isNaN(entityId as number)) {
        return NextResponse.json({ message: 'ID de entidad inválido.' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ message: 'No se proporcionó ningún archivo de factura.' }, { status: 400 });
    }

    // Validación del archivo
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ message: 'Tipo de archivo no permitido. Solo PDF, JPG, PNG, WEBP.' }, { status: 400 });
    }
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB (ajusta según necesidad)
    if (file.size > maxSizeInBytes) {
      return NextResponse.json({ message: `El archivo es demasiado grande. Máximo: ${maxSizeInBytes / (1024 * 1024)}MB.` }, { status: 400 });
    }

    const originalFilename = file.name;
    const fileExtension = path.extname(originalFilename) || `.${file.type.split('/')[1]}`;
    const storedFilename = `${uuidv4()}${fileExtension}`;
    const filePathOnServer = path.join(PRIVATE_UPLOAD_ROOT, INVOICES_SUBDIRECTORY, storedFilename);

    // Guardar archivo en el servidor
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePathOnServer, fileBuffer);

    // Guardar metadata en la base de datos
    await connection.beginTransaction();
    const [dbResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO documents (
         original_filename, stored_filename, mime_type, file_size_bytes, 
         storage_path, entity_type, entity_id, document_category, description, uploaded_by_user_id,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        originalFilename,
        storedFilename,
        file.type,
        file.size,
        INVOICES_SUBDIRECTORY, // Guardamos el subdirectorio para flexibilidad
        entityType || null,
        entityId || null,
        documentCategory || 'invoice_purchase', // Categoría por defecto o la que venga del form
        description || null,
        userId
      ]
    );
    const newDocumentId = dbResult.insertId;
    await connection.commit();

    return NextResponse.json({
      message: 'Factura subida y registrada correctamente.',
      documentId: newDocumentId,
      fileName: originalFilename,
      filePathInDB: path.join(INVOICES_SUBDIRECTORY, storedFilename) // Para referencia
    }, { status: 201 });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('Error en API de subida de factura:', error);
    // Considerar eliminar el archivo físico si la inserción en BBDD falla
    return NextResponse.json({ message: 'Error interno del servidor al subir la factura.', errorDetails: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}