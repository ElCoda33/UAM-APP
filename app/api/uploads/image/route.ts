// UAM-APP/app/api/uploads/image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');
const PUBLIC_PATH_PREFIX = '/uploads/avatars/';

async function ensureUploadDirExists() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
        console.log(`Directorio de subida de avatares creado: ${UPLOAD_DIR}`);
      } catch (mkdirError) {
        console.error(`Error al crear el directorio de subida ${UPLOAD_DIR}:`, mkdirError);
        throw mkdirError;
      }
    } else {
      console.error(`Error al acceder al directorio de subida ${UPLOAD_DIR}:`, error);
      throw error;
    }
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    await ensureUploadDirExists();
  } catch (dirError) {
    console.error("Fallo crítico al asegurar el directorio de subida de avatares:", dirError);
    return NextResponse.json({ message: 'Error de configuración del servidor al preparar la subida.' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('imageFile') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No se proporcionó ningún archivo.' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ message: 'Tipo de archivo no permitido (solo JPG, PNG, WEBP, GIF).' }, { status: 400 });
    }
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeInBytes) {
      return NextResponse.json({ message: `El archivo es demasiado grande (máx ${maxSizeInBytes / (1024 * 1024)}MB).` }, { status: 400 });
    }

    const fileExtension = path.extname(file.name) || `.${file.type.split('/')[1]}`;
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);

    // ---- INICIO DE LA MODIFICACIÓN ----
    // Obtener la URL base de la solicitud actual o de una variable de entorno
    const protocol = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === "production" ? "https" : "http");
    const host = request.headers.get('host'); // Esto debería incluir el puerto si no es estándar
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL; // Intenta usar una variable de entorno primero

    if (!baseUrl && host) {
      baseUrl = `${protocol}://${host}`;
    } else if (!baseUrl) {
      // Fallback si no se puede determinar el host (ej. en entornos serverless sin 'host' header o variable de entorno)
      // ¡DEBES configurar NEXT_PUBLIC_APP_URL en tu entorno para producción!
      console.warn("Advertencia: No se pudo determinar la URL base completa. Usando ruta relativa. Configura NEXT_PUBLIC_APP_URL.");
      // Si no se puede determinar la URL base, devolvemos la ruta relativa como antes,
      // pero esto no es ideal y fallará la validación Zod de URL en el schema.
      const relativeImageUrl = `${PUBLIC_PATH_PREFIX}${uniqueFilename}`;
      await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));
      return NextResponse.json({ message: 'Imagen subida correctamente (URL relativa).', imageUrl: relativeImageUrl }, { status: 200 });
    }

    const absoluteImageUrl = `${baseUrl}${PUBLIC_PATH_PREFIX}${uniqueFilename}`;
    // ---- FIN DE LA MODIFICACIÓN ----

    await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ message: 'Imagen subida correctamente.', imageUrl: absoluteImageUrl }, { status: 200 });

  } catch (error: any) {
    console.error('Error subiendo imagen genérica:', error);
    return NextResponse.json({ message: 'Error interno del servidor al subir la imagen.', errorDetails: error.message }, { status: 500 });
  }
}