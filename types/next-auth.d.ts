// next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

// Define los tipos para los valores literales de 'status' si aún no lo has hecho globalmente
type UserStatus = 'active' | 'disabled' | 'on_vacation' | 'pending_approval' | null;

declare module "next-auth" {
  /**
   * El objeto User que devuelve `authorize` y se usa en el callback `jwt`.
   * Incluye todos los campos que quieres pasar desde la base de datos.
   */
  interface User extends DefaultUser {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    // `name` y `image` son estándar de DefaultUser, nos aseguramos de poblarlos.
    // `email` también es estándar.

    // Campos adicionales de tu tabla `users` y relacionados
    national_id?: string | null;
    status?: UserStatus;
    section_id?: number | null;
    section_name?: string | null;
    birth_date?: string | null; // Formato YYYY-MM-DD
    email_verified_at?: string | null; // Formato ISO string
    created_at?: string; // Formato ISO string
    updated_at?: string; // Formato ISO string
    roles?: string[]; // Array de nombres de roles
  }

  /**
   * El objeto Session que usa el cliente.
   * `session.user` debe reflejar la estructura de tu `User` extendido.
   */
  interface Session extends DefaultSession {
    user: User & { // Combina tu User extendido con las propiedades base de DefaultSession['user']
      id: string; // Asegura que id esté aquí y sea string
      // Los campos de DefaultUser (name, email, image) se heredan.
      // Añade explícitamente los campos personalizados para asegurar el tipado correcto.
      firstName?: string | null;
      lastName?: string | null;
      national_id?: string | null;
      status?: UserStatus;
      section_id?: number | null;
      section_name?: string | null;
      birth_date?: string | null;
      email_verified_at?: string | null;
      created_at?: string;
      updated_at?: string;
      roles?: string[];
    };
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT { // DefaultJWT ya tiene name, email, picture
    id: string;
    // `picture` es el campo estándar  JWT para la URL de la imagen del usuario.
    // Los demás campos personalizados que queremos en el token:
    firstName?: string | null;
    lastName?: string | null;
    image?: string | null;
    roles?: string[];
    national_id?: string | null;
    status?: UserStatus;
    section_id?: number | null;
    section_name?: string | null;
    birth_date?: string | null;
    email_verified_at?: string | null;
    created_at?: string;
    updated_at?: string;
  }
}