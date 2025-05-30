// lib/auth.ts
import NextAuth, {
  type NextAuthOptions,
  type User as NextAuthUser // Este es el tipo User extendido de next-auth.d.ts
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { getPool } from "./db";

// Interfaz para el usuario recuperado de la base de datos
interface DBUser extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  national_id: string | null;
  status: 'active' | 'disabled' | 'on_vacation' | 'pending_approval' | null;
  section_id: number | null;
  birth_date: string | null; // Formato YYYY-MM-DD desde SQL
  email_verified_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  section_name?: string | null; // Del JOIN
}

// Interfaz para la fila de roles
interface RoleRow extends RowDataPacket {
  name: string;
}

// Función para obtener roles del usuario
async function getUserRoles(userId: number, pool: Pool): Promise<string[]> {
  try {
    const sql = `
      SELECT r.name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `;
    const [roleRows] = await pool.query<RoleRow[]>(sql, [userId]);
    return roleRows.map(row => row.name);
  } catch (error) {
    console.error("Error fetching user roles:", error);
    return [];
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "tu@email.com" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials): Promise<NextAuthUser | null> {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const currentPool = getPool();
        try {
          const userQuery = `
            SELECT 
              u.id, u.email, u.password_hash, u.first_name, u.last_name, 
              u.avatar_url, u.national_id, u.status, u.section_id,
              DATE_FORMAT(u.birth_date, '%Y-%m-%d') AS birth_date,
              u.email_verified_at, u.created_at, u.updated_at,
              s.name as section_name
            FROM users u 
            LEFT JOIN sections s ON u.section_id = s.id 
            WHERE u.email = ?
          `;
          const [rows] = await currentPool.query<DBUser[]>(userQuery, [credentials.email]);

          if (rows.length === 0) {
            console.log("Authorize: Usuario no encontrado -", credentials.email);
            return null;
          }
          const userFromDb = rows[0];

          if (!userFromDb.password_hash) {
            console.log("Authorize: Usuario sin hash de contraseña -", credentials.email);
            return null;
          }

          const isValidPassword = await bcrypt.compare(credentials.password, userFromDb.password_hash);

          if (isValidPassword) {
            const roles = await getUserRoles(userFromDb.id, currentPool);
            const userForNextAuth: NextAuthUser = {
              id: userFromDb.id.toString(),
              email: userFromDb.email,
              name: `${userFromDb.first_name || ''} ${userFromDb.last_name || ''}`.trim() || null,
              image: userFromDb.avatar_url,
              firstName: userFromDb.first_name,
              lastName: userFromDb.last_name,
              roles: roles,
              national_id: userFromDb.national_id,
              status: userFromDb.status,
              section_id: userFromDb.section_id,
              section_name: userFromDb.section_name,
              birth_date: userFromDb.birth_date,
              email_verified_at: userFromDb.email_verified_at ? new Date(userFromDb.email_verified_at).toISOString() : null,
              created_at: userFromDb.created_at ? new Date(userFromDb.created_at).toISOString() : undefined,
              updated_at: userFromDb.updated_at ? new Date(userFromDb.updated_at).toISOString() : undefined,
            };
            return userForNextAuth;
          }
          console.log("Authorize: Contraseña incorrecta para -", credentials.email);
          return null;
        } catch (error) {
          console.error("Error en callback authorize:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) { // `account` no es necesario aquí para la lógica de update
      // `user` es el objeto devuelto por `authorize` (en login inicial)
      // O el objeto que pasaste a `useSession().update(data)` si `trigger` es "update"

      if (trigger === "update" && user) {
        // `user` contiene los datos pasados a la función `update()` del cliente.
        // Por ejemplo, si llamaste `update({ image: 'nueva_url' })`, user será `{ image: 'nueva_url' }`.
        console.log("JWT Callback: Trigger='update'. Datos recibidos para actualizar token:", user);

        const dataToUpdate = user as Partial<NextAuthUser>; // Los datos que quieres actualizar en el token

        if (dataToUpdate.image !== undefined) {
          token.image = dataToUpdate.image; // Usamos token.image
          console.log("AUTH.TS JWT --- token.image actualizado a:", token.image);
          token.picture = dataToUpdate.image;
        }
        // Actualiza solo los campos del token que están presentes en `dataToUpdate`
        if (dataToUpdate.name !== undefined) token.name = dataToUpdate.name;
        if (dataToUpdate.email !== undefined) token.email = dataToUpdate.email; // Aunque el email rara vez se actualiza así
        if (dataToUpdate.image !== undefined) token.picture = dataToUpdate.image; // `image` en User/Session -> `picture` en JWT

        // Campos personalizados
        if (dataToUpdate.firstName !== undefined) token.firstName = dataToUpdate.firstName;
        if (dataToUpdate.lastName !== undefined) token.lastName = dataToUpdate.lastName;
        if (dataToUpdate.roles !== undefined) token.roles = dataToUpdate.roles; // Espera string[]
        if (dataToUpdate.national_id !== undefined) token.national_id = dataToUpdate.national_id;
        if (dataToUpdate.status !== undefined) token.status = dataToUpdate.status;
        if (dataToUpdate.section_id !== undefined) token.section_id = dataToUpdate.section_id;
        if (dataToUpdate.section_name !== undefined) token.section_name = dataToUpdate.section_name;
        if (dataToUpdate.birth_date !== undefined) token.birth_date = dataToUpdate.birth_date;
        if (dataToUpdate.email_verified_at !== undefined) token.email_verified_at = dataToUpdate.email_verified_at;
        // `created_at` no debería cambiar. `updated_at` sí, pero usualmente se refresca desde la DB.
        // Si la API de update de perfil devuelve el usuario completo, puedes pasar todo el objeto user actualizado a `update()`
        // y aquí todos estos `if` se cumplirían.

      } else if (user) { // Flujo de login inicial (trigger no es "update" y user está presente)
        console.log("JWT Callback: Login inicial. Poblando token con datos del usuario:", (user as NextAuthUser).email);
        const u = user as NextAuthUser;

        token.id = u.id; // `id` es crucial
        token.name = u.name;
        token.email = u.email;
        token.picture = u.image; // NextAuth usa 'picture' en JWT para 'image' de User
        // Campos personalizados
        token.firstName = u.firstName;
        token.lastName = u.lastName;
        token.roles = u.roles;
        token.national_id = u.national_id;
        token.status = u.status;
        token.section_id = u.section_id;
        token.section_name = u.section_name;
        token.birth_date = u.birth_date;
        token.email_verified_at = u.email_verified_at;
        token.created_at = u.created_at;
        token.updated_at = u.updated_at;
      }
      return token;
    },
    async session({ session, token }) {
      // `token` ya tiene todos los datos (actualizados o del login inicial)
      // Ahora los pasamos a `session.user` para el cliente
      if (session.user) {
        session.user.id = token.id as string; // `id` viene del token
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture; // `picture` del token es `image` para la sesión
        // Campos personalizados
        session.user.firstName = token.firstName as string | undefined | null;
        session.user.lastName = token.lastName as string | undefined | null;
        session.user.roles = token.roles as string[] | undefined;
        session.user.national_id = token.national_id as string | undefined | null;
        session.user.status = token.status as NextAuthUser['status'];
        session.user.section_id = token.section_id as number | undefined | null;
        session.user.section_name = token.section_name as string | undefined | null;
        session.user.birth_date = token.birth_date as string | undefined | null;
        session.user.email_verified_at = token.email_verified_at as string | undefined | null;
        session.user.created_at = token.created_at as string | undefined;
        session.user.updated_at = token.updated_at as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  // debug: process.env.NODE_ENV === 'development',
};