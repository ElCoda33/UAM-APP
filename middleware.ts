// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
        console.error("Error: NEXTAUTH_SECRET is not set. JWTs cannot be decrypted.");
        // Considera un manejo de error más robusto en producción
        return NextResponse.next();
    }

    const token = await getToken({ req, secret, raw: false });
    const { pathname } = req.nextUrl;

    const dashboardPath = '/dashboard/users'; // Define tu ruta de dashboard principal
    const loginPath = '/login';

    // --- NUEVA LÓGICA PARA LA RUTA RAÍZ ---
    if (pathname === '/') {
        if (token) {
            // Si está autenticado y en la raíz, redirigir al dashboard
            return NextResponse.redirect(new URL(dashboardPath, req.url));
        } else {
            // Si no está autenticado y en la raíz, redirigir a login
            return NextResponse.redirect(new URL(loginPath, req.url));
        }
    }

    // --- LÓGICA EXISTENTE PARA RUTAS DE AUTENTICACIÓN ---
    const authRoutes = ['/login', '/register']; // Añade otras si las tienes
    if (authRoutes.includes(pathname)) {
        if (token) {
            // Si está autenticado y trata de ir a una ruta de autenticación, redirigir al dashboard
            return NextResponse.redirect(new URL(dashboardPath, req.url));
        }
        // Si no está autenticado y va a una ruta de auth, permitir
        return NextResponse.next();
    }

    // --- LÓGICA EXISTENTE PARA RUTAS PROTEGIDAS (/dashboard) ---
    if (pathname.startsWith('/dashboard')) {
        if (!token) {
            // Si no hay token (no autenticado), redirigir a login
            // Guardar la URL original para redirigir después del login
            const loginRedirectUrl = new URL(loginPath, req.url);
            loginRedirectUrl.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
            return NextResponse.redirect(loginRedirectUrl);
        }
        // Si hay token, el usuario está autenticado.
        // Aquí podrías añadir lógica de RBAC (Role-Based Access Control) si es necesario.
        // const userRoles = token.roles as string[] || [];
        // if (pathname.startsWith('/dashboard/admin') && !userRoles.includes('Admin')) {
        //   return NextResponse.redirect(new URL('/unauthorized', req.url));
        // }
    }

    // Si ninguna de las condiciones anteriores se cumple, permitir el acceso
    return NextResponse.next();
}

// Configuración del Matcher (ya modificado al inicio de esta explicación)
export const config = {
    matcher: [
        '/',
        '/login',
        '/register/:path*',
        '/dashboard/:path*',
    ],
};