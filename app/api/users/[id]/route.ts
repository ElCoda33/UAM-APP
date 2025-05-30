// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { fetchUserById } from '@/lib/data/users'; // Asumimos que tienes esta función de antes

interface Params {
  id: string;
}

// GET handler (ya lo teníamos para ver detalles)
export async function GET(request: Request, context: { params: Params }) {
  // ... (código del GET handler como lo teníamos antes, usando fetchUserById)
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
    const user = await fetchUserById(userId);
    if (!user) {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    }
    return NextResponse.json(user, { status: 200 });
  } catch (error: any) {
    console.error(`API [GET /api/users/[id]]: Error llamando a fetchUserById para ID ${userId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener el usuario', errorDetails: error.message }, { status: 500 });
  }
}


// --- NUEVO MÉTODO PUT para actualizar usuario ---
export async function PUT(request: Request, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado para actualizar' }, { status: 401 });
  }
  // Opcional: Chequeo de rol para permitir la edición
  // const userRolesSession = session.user.roles || [];
  // if (!userRolesSession.includes('Admin')) {
  //   return NextResponse.json({ message: 'Acceso denegado: Se requiere rol de Administrador' }, { status: 403 });
  // }

  const { id } = context.params;
  if (!id || isNaN(parseInt(id))) {
    return NextResponse.json({ message: 'ID de usuario inválido' }, { status: 400 });
  }
  const userId = parseInt(id);

  let pool;
  try {
    const body = await request.json();
    // TODO: Validación de datos con Zod aquí antes de enviar a la DB
    const {
      first_name,
      last_name,
      email, // Considera si permitir cambio de email y cómo verificarlo
      national_id,
      status,
      birth_date, // Asegúrate que el formato sea YYYY-MM-DD o null
      section_id, // Debe ser un número (ID) o null
      role_ids,   // Array de números (IDs de roles)
      avatar_url
    } = body;

    pool = getPool();
    const connection = await pool.getConnection(); // Usar transacciones

    try {
      await connection.beginTransaction();

      // 1. Actualizar la tabla 'users'
      const userUpdateQuery = `
        UPDATE users SET
          first_name = ?,
          last_name = ?,
          email = ?,
          national_id = ?,
          status = ?,
          birth_date = ?,
          section_id = ?,
          avatar_url = ?,
          updated_at = NOW()
        WHERE id = ?;
      `;
      await connection.query(userUpdateQuery, [
        first_name || null,
        last_name || null,
        email || null,
        national_id || null,
        status || null,
        birth_date || null, // Asegúrate que sea YYYY-MM-DD o null
        section_id ? Number(section_id) : null,
        avatar_url || null,
        userId
      ]);

      // 2. Actualizar roles en 'user_roles'
      // Primero, eliminar roles existentes para este usuario
      await connection.query("DELETE FROM user_roles WHERE user_id = ?", [userId]);
      // Luego, insertar los nuevos roles seleccionados
      if (role_ids && Array.isArray(role_ids) && role_ids.length > 0) {
        const roleValues = role_ids.map((roleId: string | number) => [userId, Number(roleId)]);
        if (roleValues.length > 0) {
          await connection.query("INSERT INTO user_roles (user_id, role_id) VALUES ?", [roleValues]);
        }
      }

      await connection.commit();
      console.log(`Usuario ID ${userId} actualizado correctamente.`);

      // Opcional: Devolver el usuario actualizado
      const updatedUser = await fetchUserById(userId); // Usa la función que ya tenemos
      return NextResponse.json(updatedUser, { status: 200 });

    } catch (err) {
      await connection.rollback(); // Revertir cambios si algo falla
      console.error(`Error durante la transacción para actualizar usuario ID ${userId}:`, err);
      throw err; // Relanzar para que lo capture el catch principal
    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error(`Error en PUT /api/users/[id=${userId}]:`, error);
    // Podrías añadir un manejo más específico para errores de validación de Zod
    return NextResponse.json({ message: 'Error interno al actualizar el usuario', errorDetails: error.message }, { status: 500 });
  }
}

// En app/api/users/[id]/route.ts
export async function DELETE(request: Request, context: { params: Params }) {
  const session = await getServerSession(authOptions);
  // ... (verificaciones de sesión y rol) ...
  const { id } = context.params;
  const userId = parseInt(id);
  // ... (validar id) ...
  try {
    const pool = getPool();
    // Opcional: Verificar si el usuario existe antes de intentar "borrarlo"
    // await pool.query("UPDATE users SET status = 'disabled', updated_at = NOW() WHERE id = ?", [userId]);
    // O si tienes un estado 'disabled':
    await pool.query("UPDATE users SET status = 'disabled', updated_at = NOW() WHERE id = ?", [userId]);
    return NextResponse.json({ message: 'Usuario marcado como eliminado/deshabilitado' }, { status: 200 });
  } catch (error) {
    // ... (manejo de error) ...
    return NextResponse.json({ message: 'Error al eliminar usuario' }, { status: 500 });
  }
}