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
              image: userFromDb.avatar_url, // Este es el que se usa para el avatar
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
    async jwt({ token, user, trigger, session }) { // `session` está disponible si pasas datos con `update(data)`
      // `user` es el objeto devuelto por `authorize` (en login inicial)
      // O el objeto que pasaste a `useSession().update(data)` si `trigger` es "update"

      // IMPORTANTE: Verifica estos logs en la consola de tu servidor Next.js cuando actualices el avatar.
      console.log("JWT Callback --- Trigger:", trigger);
      if (trigger === "update" && session) { // `session` contiene los datos pasados a `updateSession`
        console.log("JWT Callback: Trigger='update'. Datos recibidos en `session` para actualizar token:", session);

        // Los datos pasados a updateSession() están en el argumento `session` aquí.
        // Si llamaste a updateSession({ image: 'nueva_url' }), entonces session será { image: 'nueva_url' }.
        const dataToUpdate = session as Partial<NextAuthUser & { image?: string }>;


        // VERIFICAR: ¿`dataToUpdate.image` tiene la nueva URL del avatar?
        if (dataToUpdate.image !== undefined) {
          token.picture = dataToUpdate.image; // `picture` es el campo estándar para la imagen en JWT
          token.image = dataToUpdate.image;   // Mantén tu campo `image` si lo usas directamente en otros lugares
          console.log("AUTH.TS JWT --- token.picture actualizado a:", token.picture);
        }

        // Actualiza otros campos si es necesario
        if (dataToUpdate.name !== undefined) token.name = dataToUpdate.name;
        if (dataToUpdate.email !== undefined) token.email = dataToUpdate.email;
        if (dataToUpdate.firstName !== undefined) token.firstName = dataToUpdate.firstName;
        if (dataToUpdate.lastName !== undefined) token.lastName = dataToUpdate.lastName;
        
        // ... otros campos personalizados ...

      } else if (user) { // Flujo de login inicial
        console.log("JWT Callback: Login inicial. Poblando token con datos del usuario:", (user as NextAuthUser).email);
        const u = user as NextAuthUser;

        token.id = u.id;
        token.name = u.name;
        token.email = u.email;
        token.picture = u.image; // `image` del User object va a `picture` en JWT
        token.image = u.image;   // También guarda en `image` por consistencia si lo usas

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
      console.log("JWT Callback --- Token final:", token);
      return token;
    },
    async session({ session, token }) {
      console.log("Session Callback --- Token recibido:", token);
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture as string | null | undefined; // `picture` del token es `image` para la sesión cliente

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
      console.log("Session Callback --- Sesión final:", session);
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  // debug: process.env.NODE_ENV === 'development', // Descomenta para más logs de NextAuth
};