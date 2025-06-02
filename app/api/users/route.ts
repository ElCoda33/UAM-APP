import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; // Asegúrate que la ruta a authOptions es correcta
import { getPool } from '@/lib/db';     // Asegúrate que la ruta a tu db config es correcta
import { createUserSchema } from '@/lib/schema';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import bcrypt from 'bcrypt';
import type { UserDetailsFromDB } from '@/lib/data/users'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  // Proteger la ruta: Solo usuarios autenticados (y podrías añadir chequeo de rol)
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  // Opcional: Verificación de rol (ejemplo si tienes roles en la sesión)
  // const userRoles = session.user.roles || [];
  // if (!userRoles.includes('Admin') && !userRoles.includes('Manager')) {
  //   return NextResponse.json({ message: 'Acceso denegado: Se requiere rol de Administrador o Manager' }, { status: 403 });
  // }

  const pool = getPool();

  try {
    const query = `
        SELECT
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      u.avatar_url,
      u.status,
      u.national_id,     -- Ya lo teníamos
      u.birth_date,      -- Ya lo teníamos
      u.email_verified_at, -- <<--- NUEVO
      u.created_at,      -- Ya lo teníamos
      u.updated_at,      -- <<--- NUEVO
      s.name AS section_name,
      (SELECT GROUP_CONCAT(r.name SEPARATOR ', ')
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = u.id) AS roles
  FROM
      users u
  LEFT JOIN
      sections s ON u.section_id = s.id
  ORDER BY
      u.created_at DESC;
    `;
    // Para paginación, añadirías: LIMIT ? OFFSET ? a la query y tomarías los parámetros de la URL.

    const [userRows] = await pool.query(query);

    return NextResponse.json(userRows, { status: 200 });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener usuarios' }, { status: 500 });
  }
}


// NUEVO POST handler
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  // Opcional: Chequeo de rol para crear usuarios (ej. solo Admin)
  // if (!session.user.roles?.includes('Admin')) {
  //   return NextResponse.json({ message: 'Acceso denegado para crear usuarios' }, { status: 403 });
  // }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const body = await request.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      await connection.release();
      return NextResponse.json({
        message: 'Datos de usuario inválidos.',
        errors: validation.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const {
      email, password, first_name, last_name, national_id,
      status, birth_date, section_id, role_ids, avatar_url
    } = validation.data;

    // Verificar unicidad de email (entre usuarios no eliminados)
    const [existingEmail] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? AND deleted_at IS NULL", [email]
    );
    if (existingEmail.length > 0) {
      await connection.release();
      return NextResponse.json({ message: `El email '${email}' ya está registrado.`, field: 'email' }, { status: 409 });
    }

    // Verificar unicidad de national_id si se provee (entre usuarios no eliminados)
    if (national_id) {
      const [existingNationalId] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM users WHERE national_id = ? AND deleted_at IS NULL", [national_id]
      );
      if (existingNationalId.length > 0) {
        await connection.release();
        return NextResponse.json({ message: `El ID Nacional '${national_id}' ya está registrado.`, field: 'national_id' }, { status: 409 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await connection.beginTransaction();

    const userInsertQuery = `
      INSERT INTO users (
        email, password_hash, first_name, last_name, national_id, status, 
        birth_date, section_id, avatar_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW());
    `;
    const userParams = [
      email, hashedPassword, first_name || null, last_name || null, national_id || null,
      status, birth_date || null, section_id || null, avatar_url || null,
    ];

    const [result] = await connection.query<ResultSetHeader>(userInsertQuery, userParams);
    const newUserId = result.insertId;

    if (!newUserId) {
      throw new Error('Fallo al crear el usuario en la tabla users.');
    }

    // Insertar roles
    if (role_ids && role_ids.length > 0) {
      const userRolesValues = role_ids.map(roleId => [newUserId, roleId]);
      await connection.query("INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES ?", [userRolesValues]);
    }

    await connection.commit();

    // Opcional: Obtener y devolver el usuario recién creado (sin el hash de contraseña)
    // Podrías usar tu función fetchUserById(newUserId) si la tienes adaptada o una query similar.
    // Por ahora, devolvemos un mensaje de éxito con el ID.
    const [newUserRows] = await connection.query<UserDetailsFromDB[]>(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.status,
         u.national_id, DATE_FORMAT(u.birth_date, '%Y-%m-%d') AS birth_date,
         u.email_verified_at, u.created_at, u.updated_at,
         s.name AS section_name,
         (SELECT GROUP_CONCAT(r.name SEPARATOR ', ')
          FROM user_roles ur JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = u.id) AS roles
         FROM users u LEFT JOIN sections s ON u.section_id = s.id 
         WHERE u.id = ? AND u.deleted_at IS NULL`, [newUserId]
    );
    const createdUser = newUserRows[0];
    if (createdUser) {
      createdUser.created_at = new Date(createdUser.created_at).toISOString();
      createdUser.updated_at = new Date(createdUser.updated_at).toISOString();
      if (createdUser.email_verified_at) {
        createdUser.email_verified_at = new Date(createdUser.email_verified_at).toISOString();
      }
    }


    return NextResponse.json({ message: 'Usuario creado correctamente.', user: createdUser }, { status: 201 });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('API Error POST /api/users:', error);
    return NextResponse.json({ message: error.message || 'Error interno al crear el usuario.' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}