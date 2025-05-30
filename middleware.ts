// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
        console.error("Error: NEXTAUTH_SECRET is not set. JWTs cannot be decrypted.");
        // Podrías redirigir a una página de error o simplemente permitir el acceso
        // si consideras que en desarrollo sin secret es un estado válido (no recomendado para prod).
        // Por ahora, simplemente retornamos para evitar un error fatal si el secret no está.
        // En producción, esto debería ser un error crítico.
        return NextResponse.next();
    }

    const token = await getToken({ req, secret, raw: false }); // raw: false para obtener el token decodificado

    const { pathname } = req.nextUrl;

    // Rutas de autenticación (públicas, pero con lógica especial si ya está logueado)
    const authRoutes = ['/login', '/register']; // Añade otras si las tienes (ej. /forgot-password)

    // Si el usuario está intentando acceder a una ruta de autenticación
    if (authRoutes.includes(pathname)) {
        if (token) {
            // Si está autenticado y trata de ir a /login, redirigir al dashboard
            // La URL por defecto a la que se redirige si ya está autenticado.
            const defaultDashboardPath = '/dashboard/usuarios';
            return NextResponse.redirect(new URL(defaultDashboardPath, req.url));
        }
        // Si no está autenticado y va a una ruta de auth, permitir
        return NextResponse.next();
    }

    // Proteger todas las rutas bajo /dashboard
    if (pathname.startsWith('/dashboard')) {
        if (!token) {
            // Si no hay token (no autenticado), redirigir a login
            // Guardar la URL original para redirigir después del login
            const loginUrl = new URL('/login', req.url);
            loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
            return NextResponse.redirect(loginUrl);
        }
        // Si hay token, verificar roles si es necesario (ejemplo básico)
        // Aquí es donde podrías añadir lógica de RBAC (Role-Based Access Control)
        // si tienes roles en tu token.
        // Por ejemplo, si el token tiene `token.roles` como un array de strings:
        // const userRoles = token.roles as string[] || [];
        // if (pathname.startsWith('/dashboard/admin') && !userRoles.includes('Admin')) {
        //   return NextResponse.redirect(new URL('/unauthorized', req.url)); // O una página de "acceso denegado"
        // }
    }

    // Si ninguna de las condiciones anteriores se cumple, permitir el acceso
    return NextResponse.next();
}

// Configuración del Matcher: Especifica en qué rutas se ejecutará este middleware
export const config = {
    matcher: [
        /*
         * Coincide con todas las rutas de petición excepto por las de archivos estáticos y rutas de API de NextAuth:
         * - api/auth (rutas de API de NextAuth para login, session, etc.)
         * - _next/static (archivos estáticos de Next.js)
         * - _next/image (optimización de imágenes de Next.js)
         * - favicon.ico (archivo de favicon)
         * Queremos que se ejecute en:
         * - /login, /register, etc. (rutas de autenticación)
         * - /dashboard/:path* (todas las rutas bajo dashboard)
         */
        '/login',
        '/register/:path*', // si tienes una ruta de registro
        '/dashboard/:path*',
        // Excluye explícitamente las rutas de API de NextAuth si es necesario, aunque el matcher anterior las cubre.
        // La lógica interna del middleware ya maneja no bloquear /api/auth/* de forma incorrecta.
        // '/((?!api/auth|_next/static|_next/image|favicon.ico).*)', // Un matcher más genérico si quieres que corra en casi todo.
    ],
};