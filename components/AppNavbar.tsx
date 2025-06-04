// components/navbar.tsx
"use client";

import React, { useState, useMemo } from 'react'; // Eliminado useEffect si no se usa directamente
import {
    Navbar,
    NavbarBrand,
    NavbarMenuToggle,
    NavbarMenuItem,
    NavbarMenu,
    NavbarContent,
    NavbarItem,
    Link as HeroUILink,
    Dropdown,
    DropdownTrigger,
    Avatar,
    DropdownMenu,
    DropdownItem,
    Spinner,
    Button
} from "@heroui/react";
import { useRouter, usePathname } from 'next/navigation';
import { signOut, useSession } from "next-auth/react";
import { siteConfig } from '@/config/site'; //
import { ThemeSwitch } from '@/components/theme-switch';

export default function AppNavbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    const { data: session, status: sessionStatus } = useSession();
    const isAuthenticated = sessionStatus === "authenticated";
    const isLoadingSession = sessionStatus === "loading";

    const dashboardHomePath = '/dashboard'
    const userDisplayName = useMemo(() => {
        if (!session?.user) return "Usuario";
        const { name, firstName, lastName, email } = session.user;
        if (name) return name;
        if (firstName && lastName) return `${firstName} ${lastName}`;
        if (firstName) return firstName;
        if (lastName) return lastName;
        return email || "Usuario";
    }, [session?.user]);

    const avatarInitial = useMemo(() => {
        if (!session?.user) return "U";
        const { firstName, lastName, name, email } = session.user;
        // Prioridad para iniciales de nombre y apellido si existen
        if (firstName) return firstName.charAt(0).toUpperCase();
        if (name) return name.charAt(0).toUpperCase(); // Si solo hay 'name' (de NextAuth por defecto)
        if (lastName) return lastName.charAt(0).toUpperCase(); // Si solo hay apellido (raro)
        if (email) return email.charAt(0).toUpperCase();
        return "U";
    }, [session?.user]);

    const handleSignOut = async () => {
        await signOut({ callbackUrl: "/login" });
    };

    const menuItems = siteConfig.navItems;

    // Función para determinar si un ítem del menú está activo
    const isNavItemActive = (itemHref: string) => {
        // Caso especial para la raíz si tuvieras un enlace a "/"
        if (itemHref === "/") {
            return pathname === "/";
        }
        // Para otras rutas, verifica si el pathname actual comienza con el href del ítem.
        // Esto asegura que /dashboard/users, /dashboard/users/add, /dashboard/users/123/edit
        // todos activen el ítem del menú para /dashboard/users.
        return pathname.startsWith(itemHref);
    };

    return (
        <Navbar
            isMenuOpen={isMenuOpen}
            maxWidth="xl"
            onMenuOpenChange={setIsMenuOpen}
            className="shadow-sm"
        >
            <NavbarContent className="sm:hidden" justify="start">
                <NavbarMenuToggle
                    aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                />
            </NavbarContent>

            <NavbarContent className="sm:hidden pr-3" justify="center">
                <NavbarBrand>
                    <HeroUILink href={dashboardHomePath} onClick={() => router.push(dashboardHomePath)} color="foreground" className="font-bold text-inherit">
                        UAM
                    </HeroUILink>
                </NavbarBrand>
            </NavbarContent>

            <NavbarContent className="hidden sm:flex gap-4" justify="start">
                <NavbarBrand className="mr-4">
                    <HeroUILink href={dashboardHomePath} onClick={() => router.push(dashboardHomePath)} color="foreground" className="font-bold text-inherit">
                        UAM
                    </HeroUILink>
                </NavbarBrand>
                {menuItems.map((item) => {
                    const isActive = isNavItemActive(item.href);
                    return (
                        <NavbarItem key={item.href} isActive={isActive}>
                            <HeroUILink
                                color={isActive ? 'secondary' : 'foreground'} // Cambio a 'secondary' para activo
                                href={item.href}
                                aria-current={isActive ? "page" : undefined}
                            >
                                {item.label}
                            </HeroUILink>
                        </NavbarItem>
                    );
                })}
            </NavbarContent>

            <NavbarContent justify="end">
                <ThemeSwitch />

                {isLoadingSession ? (
                    <Spinner size="sm" color="primary" aria-label="Cargando sesión" />
                ) : isAuthenticated && session?.user ? (
                    <Dropdown placement="bottom-end">
                        <DropdownTrigger aria-label="Menú de perfil de usuario">
                            <Avatar
                                isBordered
                                as="button"
                                className="transition-transform"
                                color="secondary"
                                size="sm"
                                src={session.user.image || undefined}
                                name={avatarInitial}
                            />
                        </DropdownTrigger>
                        <DropdownMenu aria-label="Acciones del Perfil" variant="flat">
                            <DropdownItem key="profile_info" className="h-14 gap-2 cursor-default" isReadOnly>
                                <p className="font-semibold">Ingresado como</p>
                                <p className="font-semibold truncate" title={userDisplayName}>
                                    {userDisplayName}
                                </p>
                            </DropdownItem>
                            <DropdownItem
                                key="settings"
                                onPress={() => router.push('/dashboard/profile')}
                            >
                                Mi Perfil
                            </DropdownItem>
                            <DropdownItem
                                key="logout"
                                color="danger"
                                className="text-danger"
                                onPress={handleSignOut}
                            >
                                Cerrar Sesión
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                ) : (
                    <NavbarItem>
                        <Button as={HeroUILink} color="primary" href="/login" variant="flat">
                            Iniciar Sesión
                        </Button>
                    </NavbarItem>
                )}
            </NavbarContent>

            {/* Menú Móvil */}
            <NavbarMenu>
                {menuItems.map((item, index) => {
                    const isActive = isNavItemActive(item.href);
                    return (
                        <NavbarMenuItem key={`${item.href}-${index}`}>
                            <HeroUILink
                                className="w-full"
                                color={isActive ? 'secondary' : 'foreground'} // Cambio a 'secondary' para activo
                                href={item.href}
                                size="lg"
                                onClick={() => setIsMenuOpen(false)}
                                aria-current={isActive ? "page" : undefined}
                            >
                                {item.label}
                            </HeroUILink>
                        </NavbarMenuItem>
                    );
                })}
                {isAuthenticated && (
                    <NavbarMenuItem key="logout-menu">
                        <HeroUILink
                            className="w-full"
                            color="danger"
                            href="#"
                            size="lg"
                            onClick={async () => {
                                setIsMenuOpen(false);
                                await handleSignOut();
                            }}
                        >
                            Cerrar Sesión
                        </HeroUILink>
                    </NavbarMenuItem>
                )}
            </NavbarMenu>
        </Navbar>
    );
}