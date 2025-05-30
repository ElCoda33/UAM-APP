// next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

// Extiende los tipos para incluir las propiedades que añadirás
declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    // Podrías añadir más campos que vengan de tu DB User
    // por ejemplo, roles si los cargas en el token
    roles?: string[]; // Ejemplo si decides cargar roles
  }

  interface Session extends DefaultSession {
    user: User & { // Asegura que session.user tenga tus campos personalizados
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      roles?: string[];
    };
    error?: string; // Para pasar errores de token a la sesión
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    // roles se usa para pasar información del usuario al token JWT
    // y luego a la sesión del cliente.
    roles?: string[];
    // `picture` se usa para la imagen, `image` en DefaultUser se mapea a `picture` en JWT
  }
}