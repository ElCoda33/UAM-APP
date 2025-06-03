// app/api/users/[id]/avatar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
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
        console.log(`Directorio de subida creado: ${UPLOAD_DIR}`);
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

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'No autorizado para realizar esta acción.' }, { status: 401 });
  }

  const loggedInUserId = session.user.id;
  const loggedInUserRoles = session.user.roles || [];
  const userIdFromParamsStr = context.params.id;
  let userIdFromParamsNum: number;

  try {
    userIdFromParamsNum = parseInt(userIdFromParamsStr, 10);
    if (isNaN(userIdFromParamsNum)) {
      return NextResponse.json({ message: 'ID de usuario en parámetros no es un número válido.' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ message: 'ID de usuario en parámetros no es válido.' }, { status: 400 });
  }

  const isAdmin = loggedInUserRoles.includes('Admin');
  const isOwnProfile = (loggedInUserId === userIdFromParamsStr);

  if (!isOwnProfile && !isAdmin) {
    return NextResponse.json({ message: 'No tienes permiso para actualizar este avatar.' }, { status: 403 });
  }

  try {
    await ensureUploadDirExists();
  } catch (dirError) {
    console.error("Fallo crítico al asegurar el directorio de subida:", dirError);
    return NextResponse.json({ message: 'Error de configuración del servidor al preparar la subida de archivos.' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null; // Clave "avatar" esperada por este endpoint

    if (!file) {
      return NextResponse.json({ message: 'No se proporcionó ningún archivo.' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ message: 'Tipo de archivo no permitido. Solo JPG, PNG, WEBP, GIF.' }, { status: 400 });
    }
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeInBytes) {
      return NextResponse.json({ message: `El archivo es demasiado grande. Máximo permitido: ${maxSizeInBytes / (1024 * 1024)}MB.` }, { status: 400 });
    }

    const fileExtension = path.extname(file.name) || `.${file.type.split('/')[1]}`;
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, fileBuffer);

    // ---- MODIFICACIÓN AQUÍ para URL absoluta ----
    const protocol = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === "production" ? "https" : "http");
    const host = request.headers.get('host');
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL; // Priorizar variable de entorno

    if (!baseUrl && host) {
      baseUrl = `${protocol}://${host}`;
    } else if (!baseUrl) {
      // Fallback MUY BÁSICO si todo lo demás falla (no ideal para producción)
      // ¡Es crucial configurar NEXT_PUBLIC_APP_URL en producción!
      console.warn("ADVERTENCIA: No se pudo determinar la URL base completa para el avatar. Usando ruta relativa. Configure NEXT_PUBLIC_APP_URL.");
      const relativeAvatarUrl = `${PUBLIC_PATH_PREFIX}${uniqueFilename}`;
      // Actualizar DB con la URL relativa
      const pool = getPool();
      const [updateResult] = await pool.query(
        "UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?",
        [relativeAvatarUrl, userIdFromParamsNum]
      );
      if ((updateResult as any).affectedRows === 0) {
        try { await fs.unlink(filePath); } catch (e) { console.error("Error eliminando archivo huérfano:", e); }
        return NextResponse.json({ message: 'No se pudo actualizar el avatar, usuario no afectado (URL relativa).' }, { status: 404 });
      }
      return NextResponse.json({ message: 'Avatar subido y actualizado (URL relativa).', avatarUrl: relativeAvatarUrl }, { status: 200 });
    }

    const absoluteAvatarUrl = `${baseUrl}${PUBLIC_PATH_PREFIX}${uniqueFilename}`;
    // ---- FIN DE LA MODIFICACIÓN ----

    const pool = getPool();
    const [updateResult] = await pool.query(
      "UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?",
      [absoluteAvatarUrl, userIdFromParamsNum] // Guardar URL absoluta
    );

    if ((updateResult as any).affectedRows === 0) {
      try { await fs.unlink(filePath); } catch (e) { console.error("Error eliminando archivo huérfano:", e); }
      return NextResponse.json({ message: 'No se pudo actualizar el avatar en la base de datos, usuario no afectado.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Avatar subido y actualizado correctamente.', avatarUrl: absoluteAvatarUrl }, { status: 200 });

  } catch (error: any) {
    console.error(`Error subiendo avatar para usuario ${userIdFromParamsNum}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor al subir el avatar.', errorDetails: error.message }, { status: 500 });
  }
}