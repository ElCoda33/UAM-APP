// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { fetchUserById, UserDetailsFromDB } from '@/lib/data/users'; // fetchUserById ya obtiene roles y section_name
import { updateUserSchema } from '@/lib/schema'; // Usaremos el nuevo schema de actualización
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

interface ParamsContext {
  params: { id: string };
}

// GET: Obtener un usuario específico por ID
export async function GET(request: NextRequest, context: ParamsContext) {
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
    // fetchUserById ya devuelve los datos en el formato que necesitamos, incluyendo nombres de roles y sección.
    const user = await fetchUserById(userId);
    if (!user) {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    }
    // fetchUserById ya formatea las fechas a ISOString donde corresponde
    return NextResponse.json(user, { status: 200 });
  } catch (error: any) {
    console.error(`API Error GET /api/users/${userId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener el usuario', errorDetails: error.message }, { status: 500 });
  }
}


// PUT: Actualizar un usuario existente
export async function PUT(request: NextRequest, context: ParamsContext) {
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
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ message: 'ID de usuario inválido' }, { status: 400 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const body = await request.json();
    const validation = updateUserSchema.safeParse(body); // Usar el nuevo schema

    if (!validation.success) {
      await connection.release();
      return NextResponse.json({
        message: 'Datos de usuario inválidos.',
        errors: validation.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const fieldsToUpdate = validation.data;
    if (Object.keys(fieldsToUpdate).length === 0) {
      await connection.release();
      return NextResponse.json({ message: 'No se proporcionaron campos para actualizar.' }, { status: 400 });
    }

    await connection.beginTransaction();

    // Verificar unicidad de email si se está cambiando
    if (fieldsToUpdate.email) {
      const [existingEmail] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM users WHERE email = ? AND id != ? AND deleted_at IS NULL",
        [fieldsToUpdate.email, userId]
      );
      if (existingEmail.length > 0) {
        await connection.rollback();
        await connection.release();
        return NextResponse.json({ message: `El email '${fieldsToUpdate.email}' ya está en uso.`, field: 'email' }, { status: 409 });
      }
    }
    // Verificar unicidad de national_id si se está cambiando
    if (fieldsToUpdate.national_id) {
      const [existingNationalId] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM users WHERE national_id = ? AND id != ? AND deleted_at IS NULL",
        [fieldsToUpdate.national_id, userId]
      );
      if (existingNationalId.length > 0) {
        await connection.rollback();
        await connection.release();
        return NextResponse.json({ message: `El ID Nacional '${fieldsToUpdate.national_id}' ya está en uso.`, field: 'national_id' }, { status: 409 });
      }
    }
    // Opcional: Verificar que los role_ids y section_id sean válidos si se actualizan
    if (fieldsToUpdate.section_id !== undefined) { // Puede ser null
      if (fieldsToUpdate.section_id !== null) {
        const [secExists] = await connection.query<RowDataPacket[]>("SELECT id FROM sections WHERE id = ? AND deleted_at IS NULL", [fieldsToUpdate.section_id]);
        if (secExists.length === 0) {
          await connection.rollback(); await connection.release();
          return NextResponse.json({ message: `La sección con ID ${fieldsToUpdate.section_id} no existe o no está activa.`, field: 'section_id' }, { status: 400 });
        }
      }
    }
    if (fieldsToUpdate.role_ids && fieldsToUpdate.role_ids.length > 0) {
      for (const roleId of fieldsToUpdate.role_ids) {
        const [roleExists] = await connection.query<RowDataPacket[]>("SELECT id FROM roles WHERE id = ? AND deleted_at IS NULL", [roleId]);
        if (roleExists.length === 0) {
          await connection.rollback(); await connection.release();
          return NextResponse.json({ message: `El rol con ID ${roleId} no existe o no está activo.`, field: 'role_ids' }, { status: 400 });
        }
      }
    }

    const { role_ids, ...userDataToUpdate } = fieldsToUpdate; // Separar role_ids del resto

    const userSetClauses: string[] = [];
    const userParams: any[] = [];

    Object.entries(userDataToUpdate).forEach(([key, value]) => {
      if (value !== undefined) { // Solo incluir campos que realmente se quieren actualizar
        userSetClauses.push(`${key} = ?`);
        userParams.push(value === '' ? null : value); // Convertir string vacío a NULL si aplica
      }
    });

    if (userSetClauses.length > 0) {
      userSetClauses.push("updated_at = NOW()");
      userParams.push(userId);
      const userUpdateQuery = `UPDATE users SET ${userSetClauses.join(", ")} WHERE id = ? AND deleted_at IS NULL`;
      const [userUpdateResult] = await connection.query<ResultSetHeader>(userUpdateQuery, userParams);
      if (userUpdateResult.affectedRows === 0 && userUpdateResult.changedRows === 0) {
        // Podría ser que el usuario no exista, o que los datos enviados sean iguales a los existentes.
        // Considerar si es un error o no. Si el usuario no existe (y no es por soft delete), sería 404.
      }
    }

    // Actualizar roles en 'user_roles' si se proporcionó 'role_ids'
    if (role_ids !== undefined) { // Si se envía role_ids (incluso array vacío), se gestionan los roles.
      await connection.query("DELETE FROM user_roles WHERE user_id = ?", [userId]);
      if (role_ids.length > 0) {
        const userRolesValues = role_ids.map((roleId: number) => [userId, roleId, new Date()]);
        await connection.query("INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES ?", [userRolesValues]);
      }
    }

    await connection.commit();

    // Devolver el usuario actualizado
    const updatedUser = await fetchUserById(userId);
    return NextResponse.json({ message: 'Usuario actualizado correctamente.', user: updatedUser }, { status: 200 });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error(`API Error PUT /api/users/${userId}:`, error);
    return NextResponse.json({ message: error.message || 'Error interno al actualizar el usuario.' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}


// DELETE: Marcar un usuario como eliminado (soft delete)
export async function DELETE(request: NextRequest, context: ParamsContext) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado para eliminar' }, { status: 401 });
  }
  // Opcional: Chequeo de rol
  // if (!session.user.roles?.includes('Admin')) {
  //   return NextResponse.json({ message: 'Acceso denegado para eliminar usuarios' }, { status: 403 });
  // }

  const { id } = context.params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ message: 'ID de usuario inválido' }, { status: 400 });
  }
  // Impedir que un usuario se elimine a sí mismo
  if (session.user.id === String(userId)) {
    return NextResponse.json({ message: 'No puedes eliminar tu propia cuenta.' }, { status: 403 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    // Actualizar a 'disabled' y marcar 'deleted_at'.
    // También podrías querer anonimizar el email o national_id si es una política,
    // ej. email = CONCAT(email, '_deleted_', UNIX_TIMESTAMP())
    const [result] = await connection.query<ResultSetHeader>(
      "UPDATE users SET status = 'disabled', deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND deleted_at IS NULL",
      [userId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json({ message: 'Usuario no encontrado o ya eliminado' }, { status: 404 });
    }

    // Opcional: desvincular roles, etc., aunque con soft delete podrían mantenerse.
    // Por ahora, solo se marca como eliminado.

    await connection.commit();
    return NextResponse.json({ message: 'Usuario marcado como eliminado (deshabilitado).' }, { status: 200 });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error(`API Error DELETE /api/users/${userId}:`, error);
    return NextResponse.json({ message: error.message || 'Error interno al eliminar el usuario.' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}