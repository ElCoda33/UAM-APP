// app/api/users/[id]/avatar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');
const PUBLIC_PATH_PREFIX = '/uploads/avatars/'; // Esta será la parte de la URL pública

async function ensureUploadDirExists() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch (error: any) { // Tipado 'any' para acceder a 'code' de forma segura
    if (error.code === 'ENOENT') { // El directorio no existe
      try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
        console.log(`Directorio de subida creado: ${UPLOAD_DIR}`);
      } catch (mkdirError) {
        console.error(`Error al crear el directorio de subida ${UPLOAD_DIR}:`, mkdirError);
        throw mkdirError; // Relanzar el error de creación del directorio
      }
    } else {
      // Otro error al acceder al directorio (ej. permisos)
      console.error(`Error al acceder al directorio de subida ${UPLOAD_DIR}:`, error);
      throw error; // Relanzar otros errores de acceso
    }
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } } // El ID del usuario cuyo avatar se está cambiando
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'No autorizado para realizar esta acción.' }, { status: 401 });
  }

  const loggedInUserId = session.user.id; // ID del usuario que realiza la solicitud (string)
  const loggedInUserRoles = session.user.roles || []; // Roles del usuario logueado (esperado string[])

  const userIdFromParamsStr = context.params.id;
  let userIdFromParamsNum: number;

  try {
    userIdFromParamsNum = parseInt(userIdFromParamsStr, 10);
    if (isNaN(userIdFromParamsNum)) {
      // Esto ya debería ser manejado por la capa de ruta si el param no es un número, pero una doble verificación es buena.
      return NextResponse.json({ message: 'ID de usuario en parámetros no es un número válido.' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ message: 'ID de usuario en parámetros no es válido.' }, { status: 400 });
  }

  // --- LÓGICA DE PERMISOS MODIFICADA ---
  const isAdmin = loggedInUserRoles.includes('Admin'); // Asegúrate que 'Admin' sea el nombre exacto de tu rol
  const isOwnProfile = (loggedInUserId === userIdFromParamsStr);

  if (!isOwnProfile && !isAdmin) {
    // Si no es su propio perfil Y no es un administrador, entonces denegar.
    return NextResponse.json({ message: 'No tienes permiso para actualizar este avatar.' }, { status: 403 });
  }
  // Si es su propio perfil O es un administrador, se permite continuar.
  // --- FIN DE LA MODIFICACIÓN DE PERMISOS ---

  try {
    await ensureUploadDirExists(); // Asegurar que el directorio exista antes de intentar escribir
  } catch (dirError) {
    console.error("Fallo crítico al asegurar el directorio de subida:", dirError);
    return NextResponse.json({ message: 'Error de configuración del servidor al preparar la subida de archivos.' }, { status: 500 });
  }


  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

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

    const fileExtension = path.extname(file.name) || `.${file.type.split('/')[1]}`; // Obtener extensión
    const uniqueFilename = `${uuidv4()}${fileExtension}`; // Nombre de archivo único
    const filePath = path.join(UPLOAD_DIR, uniqueFilename); // Ruta completa en el servidor

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    await fs.writeFile(filePath, fileBuffer); // Guardar archivo en el sistema de archivos

    const avatarUrl = `${PUBLIC_PATH_PREFIX}${uniqueFilename}`; // URL pública relativa para la DB

    const pool = getPool();
    const [updateResult] = await pool.query(
      "UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?",
      [avatarUrl, userIdFromParamsNum] // Usar el ID numérico para la query
    );

    if ((updateResult as any).affectedRows === 0) {
      console.warn(`API /users/[id]/avatar - No se actualizó el avatar para el usuario ID: ${userIdFromParamsNum}. ¿Existe el usuario?`);
      // Podrías haber borrado al usuario mientras tanto, o ID incorrecto a pesar de los chequeos.
      // Considera eliminar el archivo subido si la actualización de DB falla.
      try { await fs.unlink(filePath); } catch (e) { console.error("Error eliminando archivo huérfano:", e); }
      return NextResponse.json({ message: 'No se pudo actualizar el avatar en la base de datos, usuario no afectado.' }, { status: 404 }); // O 500
    }

    return NextResponse.json({ message: 'Avatar subido y actualizado correctamente.', avatarUrl }, { status: 200 });

  } catch (error: any) {
    console.error(`Error subiendo avatar para usuario ${userIdFromParamsNum}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor al subir el avatar.', errorDetails: error.message }, { status: 500 });
  }
}