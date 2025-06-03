// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import bcrypt from 'bcrypt';
import type { UserDetailsFromDB } from '@/lib/data/users';

// GET: Obtener todos los usuarios (activos y con datos relacionados)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const query = `
      SELECT
          u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.status,
          u.national_id, DATE_FORMAT(u.birth_date, '%Y-%m-%d') AS birth_date,
          u.email_verified_at, u.created_at, u.updated_at,
          s.id AS section_id, s.name AS section_name,
          (SELECT GROUP_CONCAT(r.id SEPARATOR ',') 
           FROM user_roles ur_ids JOIN roles r ON ur_ids.role_id = r.id 
           WHERE ur_ids.user_id = u.id) AS role_ids, -- Devolver IDs de roles
          (SELECT GROUP_CONCAT(r_names.name SEPARATOR ', ')  -- <<< CORRECCIÓN AQUÍ
           FROM user_roles ur_names JOIN roles r_names ON ur_names.role_id = r_names.id 
           WHERE ur_names.user_id = u.id) AS roles -- Devolver Nombres de roles
      FROM users u
      LEFT JOIN sections s ON u.section_id = s.id
      WHERE u.deleted_at IS NULL -- Solo usuarios activos
      ORDER BY u.last_name ASC, u.first_name ASC;
    `;

    const [userRows] = await connection.query<UserDetailsFromDB[]>(query);

    const users = userRows.map(user => ({
      ...user,
      birth_date: user.birth_date,
      email_verified_at: user.email_verified_at ? new Date(user.email_verified_at).toISOString() : null,
      created_at: new Date(user.created_at).toISOString(),
      updated_at: new Date(user.updated_at).toISOString(),
    }));

    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error('API Error GET /api/users:', error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener usuarios' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// POST: Crear un nuevo usuario
// (El código de la función POST no necesita cambios por este error específico,
// se mantiene como lo tenías o como lo ajustamos en el Bloque 2 para Usuarios)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'No autorizado para crear usuarios' }, { status: 401 });
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const body = await request.json();
    // Asegúrate de que createUserSchema esté importado desde '@/lib/schema'
    const { createUserSchema } = await import('@/lib/schema');
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

    await connection.beginTransaction();

    const [existingEmail] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? AND deleted_at IS NULL", [email]
    );
    if (existingEmail.length > 0) {
      await connection.rollback();
      await connection.release();
      return NextResponse.json({ message: `El email '${email}' ya está registrado.`, field: 'email' }, { status: 409 });
    }

    if (national_id) {
      const [existingNationalId] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM users WHERE national_id = ? AND deleted_at IS NULL", [national_id]
      );
      if (existingNationalId.length > 0) {
        await connection.rollback();
        await connection.release();
        return NextResponse.json({ message: `El ID Nacional '${national_id}' ya está registrado.`, field: 'national_id' }, { status: 409 });
      }
    }
    if (section_id) {
      const [secExists] = await connection.query<RowDataPacket[]>("SELECT id FROM sections WHERE id = ? AND deleted_at IS NULL", [section_id]);
      if (secExists.length === 0) {
        await connection.rollback();
        await connection.release();
        return NextResponse.json({ message: `La sección con ID ${section_id} no existe o no está activa.`, field: 'section_id' }, { status: 400 });
      }
    }
    if (role_ids && role_ids.length > 0) {
      for (const roleId of role_ids) {
        const [roleExists] = await connection.query<RowDataPacket[]>("SELECT id FROM roles WHERE id = ? AND deleted_at IS NULL", [roleId]);
        if (roleExists.length === 0) {
          await connection.rollback(); await connection.release();
          return NextResponse.json({ message: `El rol con ID ${roleId} no existe o no está activo.`, field: 'role_ids' }, { status: 400 });
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userInsertQuery = `
      INSERT INTO users (
        email, password_hash, first_name, last_name, national_id, status, 
        birth_date, section_id, avatar_url, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL);
    `;
    const userParams = [
      email, hashedPassword, first_name || null, last_name || null, national_id || null,
      status, birth_date || null, section_id || null, avatar_url || null,
    ];

    const [result] = await connection.query<ResultSetHeader>(userInsertQuery, userParams);
    const newUserId = result.insertId;

    if (!newUserId) {
      await connection.rollback();
      throw new Error('Fallo al crear el usuario en la tabla users.');
    }

    if (role_ids && role_ids.length > 0) {
      const userRolesValues = role_ids.map(roleId => [newUserId, roleId, new Date()]);
      await connection.query("INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES ?", [userRolesValues]);
    }

    await connection.commit();

    const queryUser = `
        SELECT
            u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.status,
            u.national_id, DATE_FORMAT(u.birth_date, '%Y-%m-%d') AS birth_date,
            u.email_verified_at, u.created_at, u.updated_at,
            s.id AS section_id, s.name AS section_name,
            (SELECT GROUP_CONCAT(r.id SEPARATOR ',') FROM user_roles ur_ids JOIN roles r ON ur_ids.role_id = r.id WHERE ur_ids.user_id = u.id) AS role_ids,
            (SELECT GROUP_CONCAT(r_names.name SEPARATOR ', ') FROM user_roles ur_names JOIN roles r_names ON ur_names.role_id = r_names.id WHERE ur_names.user_id = u.id) AS roles
        FROM users u
        LEFT JOIN sections s ON u.section_id = s.id
        WHERE u.id = ? AND u.deleted_at IS NULL;
    `;
    const [newUserRows] = await connection.query<UserDetailsFromDB[]>(queryUser, [newUserId]);

    if (newUserRows.length > 0) {
      const createdUser = {
        ...newUserRows[0],
        email_verified_at: newUserRows[0].email_verified_at ? new Date(newUserRows[0].email_verified_at).toISOString() : null,
        created_at: new Date(newUserRows[0].created_at).toISOString(),
        updated_at: new Date(newUserRows[0].updated_at).toISOString(),
      };
      return NextResponse.json({ message: 'Usuario creado correctamente.', user: createdUser }, { status: 201 });
    }
    return NextResponse.json({ message: 'Usuario creado, pero error al recuperarlo.' }, { status: 207 });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('API Error POST /api/users:', error);
    return NextResponse.json({ message: error.message || 'Error interno al crear el usuario.' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}