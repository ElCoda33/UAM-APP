// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

type UserStatus = 'active' | 'disabled' | 'on_vacation' | 'pending_approval' | null;

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    // `name` y `image` son estándar de DefaultUser, nos aseguramos de poblarlos.
    // `email` también es estándar.
    // El campo `image` es el que usa NextAuth por defecto para la URL del avatar.
    // Ya lo tienes de DefaultUser, pero asegúrate que en authorize se mapee a `avatar_url`.

    national_id?: string | null;
    status?: UserStatus;
    section_id?: number | null;
    section_name?: string | null;
    birth_date?: string | null;
    email_verified_at?: string | null;
    created_at?: string;
    updated_at?: string;
    roles?: string[];
  }

  interface Session extends DefaultSession {
    user: User & {
      id: string;
      // `image` ya está en `DefaultSession['user']` y se extiende con tu `User`.
      // Los campos de DefaultUser (name, email, image) se heredan.
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
    // `picture` es el campo estándar JWT para la URL de la imagen del usuario.
    // `image` es un campo personalizado que también has añadido, puede ser útil si lo usas en otro lado.
    image?: string | null; // Mantenlo si lo usas, pero `picture` es el clave para la sesión.

    firstName?: string | null;
    lastName?: string | null;
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