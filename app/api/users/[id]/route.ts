// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { fetchUserById } from '@/lib/data/users'; // Importa la nueva función

interface Params {
  id: string;
}

export async function GET(request: Request, context: { params: Params }) {
  console.log("API [GET /api/users/[id]]: Recibida petición (usando fetchUserById).");
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const { id } = context.params;
  if (!id || isNaN(parseInt(id))) {
    return NextResponse.json({ message: 'ID de usuario inválido' }, { status: 400 });
  }
  const userId = parseInt(id);

  try {
    const user = await fetchUserById(userId); // Llama a la función reutilizable
    if (!user) {
      return NextResponse.json({ message: 'Usuario no encontrado vía fetchUserById' }, { status: 404 });
    }
    return NextResponse.json(user, { status: 200 });
  } catch (error: any) {
    console.error(`API [GET /api/users/[id]]: Error llamando a fetchUserById para ID ${userId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener el usuario', errorDetails: error.message }, { status: 500 });
  }
}