// app/providers.tsx (versión corregida)
'use client'
import { HeroUIProvider } from "@heroui/react";
import { useRouter } from 'next/navigation';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ThemeProviderProps } from 'next-themes/dist/types';
import NextAuthProvider from "./providers/nextAuthProvider"; // Contiene SessionProvider y Toaster

export function Providers({ children, themeProps }: { children: React.ReactNode, themeProps?: ThemeProviderProps }) {
    const router = useRouter();
    return (
        <HeroUIProvider locale="es-ES" navigate={router.push}>
            <NextThemesProvider {...themeProps}>
                <NextAuthProvider>
                    {children}
                </NextAuthProvider>
            </NextThemesProvider>
        </HeroUIProvider>
    );
}