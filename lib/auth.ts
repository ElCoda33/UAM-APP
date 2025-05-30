// lib/auth.ts
import NextAuth, { type NextAuthOptions, type User as NextAuthUserType } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt"; // bcrypt v5.1.1
import { getPool } from "./db"; // Tu configuración de pool de MySQL

// Interfaz para el usuario recuperado de la base de datos
interface DBUser {
  id: number; // El ID de la DB es numérico
  email: string;
  password_hash: string | null; // Puede ser null si el usuario usa OAuth
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  // Puedes añadir más campos de tu tabla users si los necesitas en el objeto User de NextAuth
  // por ejemplo: rol (si es un solo rol directo) o para obtener los roles de user_roles
}

// Función para obtener roles del usuario (ejemplo)
async function getUserRoles(userId: number): Promise<string[]> {
  const pool = getPool();
  try {
    const [roleRows] = await pool.query<any[]>(`
      SELECT r.name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `, [userId]);
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
      async authorize(credentials): Promise<NextAuthUserType | null> {
        if (!credentials?.email || !credentials?.password) {
          console.log("Credentials no proporcionados");
          return null;
        }

        const pool = getPool();
        try {
          const [rows] = await pool.query<any[]>(
            "SELECT id, email, password_hash, first_name, last_name, avatar_url FROM users WHERE email = ?",
            [credentials.email]
          );

          if (rows.length === 0) {
            console.log("Usuario no encontrado:", credentials.email);
            return null;
          }

          const userFromDb = rows[0] as DBUser;

          if (!userFromDb.password_hash) {
            console.log("Usuario no tiene contraseña configurada (podría ser OAuth):", credentials.email);
            return null; // O manejar de otra forma si permites login sin pass para ciertos casos
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password,
            userFromDb.password_hash
          );

          if (isValidPassword) {
            const userRoles = await getUserRoles(userFromDb.id);
            // El objeto devuelto aquí se pasa al callback `jwt`
            return {
              id: userFromDb.id.toString(), // NextAuth User ID debe ser string
              email: userFromDb.email,
              name: `${userFromDb.first_name || ''} ${userFromDb.last_name || ''}`.trim(),
              image: userFromDb.avatar_url,
              // Pasando campos personalizados (asegúrate que estén en `next-auth.d.ts` para `User`)
              firstName: userFromDb.first_name,
              lastName: userFromDb.last_name,
              roles: userRoles,
            };
          } else {
            console.log("Contraseña incorrecta para:", credentials.email);
            return null;
          }
        } catch (error) {
          console.error("Error en authorize:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // `user` solo está presente en el primer login/registro.
      if (user) {
        token.id = user.id; // user.id ya es string aquí desde authorize
        // `user.name` y `user.email` se toman por defecto.
        // `user.image` se mapea a `token.picture` por defecto.
        // Añadiendo campos personalizados al token JWT
        token.firstName = (user as any).firstName; // Cast si es necesario o usa los tipos de next-auth.d.ts
        token.lastName = (user as any).lastName;
        token.roles = (user as any).roles;
        if (user.image) { // Asegurar que picture (avatar) se propague
          token.picture = user.image;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // `token` es el JWT. `session.user` es lo que el cliente recibe.
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name; // Puede ser construido en authorize o tomar el default
        session.user.email = token.email;
        session.user.image = token.picture; // `token.picture` tiene la URL de la imagen
        // Añadiendo campos personalizados a la sesión del cliente
        session.user.firstName = token.firstName as string | undefined | null;
        session.user.lastName = token.lastName as string | undefined | null;
        session.user.roles = token.roles as string[] | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login", // Tu página de login
    // signOut: '/auth/signout',
    error: "/login", // Redirigir a login en caso de error de autenticación
  },
  // debug: process.env.NODE_ENV === 'development', // Útil para depurar
};