import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; // Asegúrate que la ruta a authOptions es correcta
import { getPool } from '@/lib/db';     // Asegúrate que la ruta a tu db config es correcta

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