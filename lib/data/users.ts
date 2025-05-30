// lib/data/users.ts
import { getPool } from '@/lib/db'; // Asegúrate que la ruta a db.ts sea correcta

// Define un tipo para los detalles del usuario que devuelve esta función
// Puede ser similar o igual a tu UserDetails en la página
export interface UserDetailsFromDB {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  status: 'active' | 'disabled' | 'on_vacation' | 'pending_approval' | null;
  national_id: string | null;
  birth_date: string | null; // Ya viene formateado como YYYY-MM-DD desde la query
  email_verified_at: string | null; // Vendrá como string ISO si se convierte abajo
  created_at: string; // Vendrá como string ISO
  updated_at: string; // Vendrá como string ISO
  section_id: number | null;
  section_name: string | null;
  role_ids: string | null; // IDs de roles concatenados
  roles: string | null;    // Nombres de roles concatenados
}

export async function fetchUserById(userId: number): Promise<UserDetailsFromDB | null> {
  const pool = getPool();
  console.log("LIB [fetchUserById]: Obteniendo usuario con ID:", userId); // Log para esta función

  try {
    const query = `
      SELECT
          u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.status,
          u.national_id, DATE_FORMAT(u.birth_date, '%Y-%m-%d') AS birth_date,
          u.email_verified_at, u.created_at, u.updated_at,
          s.id AS section_id, s.name AS section_name,
          (SELECT GROUP_CONCAT(r_ids.id SEPARATOR ',')
           FROM user_roles ur_ids JOIN roles r_ids ON ur_ids.role_id = r_ids.id
           WHERE ur_ids.user_id = u.id) AS role_ids,
          (SELECT GROUP_CONCAT(r_names.name SEPARATOR ', ')
           FROM user_roles ur_names JOIN roles r_names ON ur_names.role_id = r_names.id
           WHERE ur_names.user_id = u.id) AS roles
      FROM users u
      LEFT JOIN sections s ON u.section_id = s.id
      WHERE u.id = ?;
    `;
    const [userRows] = await pool.query<any[]>(query, [userId]);
    console.log("LIB [fetchUserById]: Query ejecutada. Filas encontradas:", userRows.length);

    if (userRows.length === 0) {
      return null;
    }

    const rawUser = userRows[0];
    // Asegurar que los timestamps sean strings ISO para consistencia con lo que esperaría la UI
    const user: UserDetailsFromDB = {
      ...rawUser,
      // birth_date ya está formateado por SQL
      email_verified_at: rawUser.email_verified_at ? new Date(rawUser.email_verified_at).toISOString() : null,
      created_at: new Date(rawUser.created_at).toISOString(),
      updated_at: new Date(rawUser.updated_at).toISOString(),
    };
    return user;
  } catch (error) {
    console.error(`LIB [fetchUserById]: Error al obtener usuario con ID ${userId}:`, error);
    throw error; // Relanzar el error para que el llamador (la página) lo maneje
  }
}