// app/api/users/[id]/avatar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Ya NO necesitas definir la interfaz RouteContext aquí si la usas solo para esto.
// interface RouteContext {
//   params: {
//     id: string;
//   };
//   // Si tuvieras req y res aquí, ese sería el problema.
// }

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');
const PUBLIC_PATH_PREFIX = '/uploads/avatars/';

async function ensureUploadDirExists() {
  // ... (código de ensureUploadDirExists sin cambios)
  try {
    await fs.access(UPLOAD_DIR);
  } catch (error) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    console.log(`Directorio de subida creado: ${UPLOAD_DIR}`);
  }
}

// Modifica la firma de la función POST aquí:
export async function POST(
  request: NextRequest,
  context: { params: { id: string } } // <--- CAMBIO AQUÍ: Tipado directo
) {
  const session = await getServerSession(authOptions);
  // Asegúrate de que `context.params.id` se use para obtener el ID
  const userIdFromParams = parseInt(context.params.id);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const loggedInUserId = session.user.id;

  if (String(userIdFromParams) !== loggedInUserId /* && !userRoles.includes('Admin') */) {
    return NextResponse.json({ message: 'No tienes permiso para actualizar este avatar' }, { status: 403 });
  }

  if (isNaN(userIdFromParams)) {
    return NextResponse.json({ message: 'ID de usuario inválido' }, { status: 400 });
  }

  await ensureUploadDirExists();

  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No se proporcionó ningún archivo.' }, { status: 400 });
    }

    // ... (resto del código de validación y guardado de archivo sin cambios) ...
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ message: 'Tipo de archivo no permitido. Solo JPG, PNG, WEBP, GIF.' }, { status: 400 });
    }
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeInBytes) {
      return NextResponse.json({ message: `El archivo es demasiado grande. Máximo permitido: ${maxSizeInBytes / (1024*1024)}MB.` }, { status: 400 });
    }
    const fileExtension = path.extname(file.name) || `.${file.type.split('/')[1]}`;
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, fileBuffer);
    const avatarUrl = `${PUBLIC_PATH_PREFIX}${uniqueFilename}`;
    const pool = getPool();
    await pool.query(
      "UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?",
      [avatarUrl, userIdFromParams]
    );

    return NextResponse.json({ message: 'Avatar subido y actualizado correctamente.', avatarUrl }, { status: 200 });

  } catch (error: any) {
    console.error(`Error subiendo avatar para usuario ${userIdFromParams}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor al subir el avatar.', errorDetails: error.message }, { status: 500 });
  }
}