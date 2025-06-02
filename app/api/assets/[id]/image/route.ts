// app/api/assets/[id]/image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; //
import { getPool } from '@/lib/db'; //
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Ajusta estas rutas según tu estructura y preferencias
const UPLOAD_ASSET_DIR = path.join(process.cwd(), 'public', 'uploads', 'asset_images');
const PUBLIC_ASSET_PATH_PREFIX = '/uploads/asset_images/';

async function ensureAssetUploadDirExists() {
  try {
    await fs.access(UPLOAD_ASSET_DIR);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await fs.mkdir(UPLOAD_ASSET_DIR, { recursive: true });
    } else {
      throw error;
    }
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  // Aquí podrías añadir lógica de roles si es necesario

  const assetIdStr = context.params.id;
  const assetId = parseInt(assetIdStr, 10);

  if (isNaN(assetId)) {
    return NextResponse.json({ message: 'ID de activo no válido.' }, { status: 400 });
  }

  try {
    await ensureAssetUploadDirExists();
  } catch (dirError) {
    console.error("Fallo al asegurar el directorio de subida de imágenes de activos:", dirError);
    return NextResponse.json({ message: 'Error de configuración del servidor.' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('assetImage') as File | null; // El nombre debe coincidir con el FormData del cliente

    if (!file) {
      return NextResponse.json({ message: 'No se proporcionó ningún archivo.' }, { status: 400 });
    }

    // Validaciones (tipo, tamaño)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ message: 'Tipo de archivo no permitido.' }, { status: 400 });
    }
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB (ajusta según necesidad)
    if (file.size > maxSizeInBytes) {
      return NextResponse.json({ message: `El archivo es demasiado grande (máx ${maxSizeInBytes / (1024 * 1024)}MB).` }, { status: 400 });
    }

    const fileExtension = path.extname(file.name) || `.${file.type.split('/')[1]}`;
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(UPLOAD_ASSET_DIR, uniqueFilename);
    const imageUrl = `${PUBLIC_ASSET_PATH_PREFIX}${uniqueFilename}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, fileBuffer);

    const pool = getPool();
    const [updateResult] = await pool.query(
      "UPDATE assets SET image_url = ?, updated_at = NOW() WHERE id = ?",
      [imageUrl, assetId]
    );

    if ((updateResult as any).affectedRows === 0) {
      // Si no se actualiza, el activo podría no existir. Considera eliminar el archivo subido.
      try { await fs.unlink(filePath); } catch (e) { console.error("Error eliminando archivo de imagen huérfano:", e); }
      return NextResponse.json({ message: 'No se pudo actualizar la imagen del activo, el activo no fue afectado.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Imagen del activo subida y actualizada correctamente.', imageUrl }, { status: 200 });

  } catch (error: any) {
    console.error(`Error subiendo imagen para activo ${assetId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor al subir la imagen.', errorDetails: error.message }, { status: 500 });
  }
}