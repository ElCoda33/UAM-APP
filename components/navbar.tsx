'use client'

import React from 'react' // No es necesario useContext si usamos useSession para el usuario
import {
    Navbar,
    NavbarBrand,
    NavbarMenuToggle,
    NavbarMenuItem,
    NavbarMenu,
    NavbarContent,
    NavbarItem,
    Link,
    Dropdown,
    DropdownTrigger,
    Avatar, // Usaremos este Avatar de NextUI
    DropdownMenu,
    DropdownItem,
    Spinner, // Para el estado de carga de la sesión
    Button
} from '@nextui-org/react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'

import { siteConfig } from '@/config/site'
// import { UserContext } from '@/app/providers' // Considera si aún lo necesitas si NextAuth maneja la sesión
// import { logout } from '@/lib/session/logout' // Usaremos signOut de NextAuth
import { ThemeSwitch } from '@/components/theme-switch'
import { signOut, useSession } from "next-auth/react"; // Importaciones clave de NextAuth

export default function NavBar() {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const menuItems = siteConfig.navItems

    // Usamos useSession para obtener los datos del usuario y el estado de la sesión
    const { data: session, status } = useSession();
    const isAuthenticated = status === "authenticated";
    const isLoadingSession = status === "loading";

    // Información del usuario de la sesión de NextAuth
    const userImage = session?.user?.image;
    const userName = session?.user?.name || 
                     (session?.user?.firstName && session?.user?.lastName ? `${session.user.firstName} ${session.user.lastName}` : 
                     session?.user?.email); // Fallback al email si no hay nombre

    const handleSignOut = async () => {
        await signOut({ callbackUrl: "/login" }); // Redirige a /login después de cerrar sesión
    };

    // Ya no necesitas el useContext(UserContext) para el avatar si usas session
    // const userFromUserContext: any = useContext(UserContext);

    return (
        <Navbar
            isMenuOpen={isMenuOpen}
            maxWidth="xl"
            onMenuOpenChange={setIsMenuOpen}
        >
            <NavbarContent className="sm:hidden" justify="start">
                <NavbarMenuToggle
                    aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
                />
            </NavbarContent>

            <NavbarContent className="sm:hidden pr-3" justify="center">
                <NavbarBrand>
                    <p className="font-bold text-inherit">UAM</p>
                </NavbarBrand>
            </NavbarContent>

            <NavbarContent className="hidden sm:flex gap-4" justify="center">
                <NavbarBrand>
                    <p className="font-bold text-inherit ">UAM</p>
                </NavbarBrand>
                {menuItems.map((item) => (
                    <NavbarItem key={item.href} isActive={item.href === pathname}> {/* Corregido: isActive dinámico */}
                        <Link
                            color={
                                item.href === pathname
                                    ? 'warning'
                                    : 'foreground'
                            }
                            href={item.href}
                        >
                            {item.label}
                        </Link>
                    </NavbarItem>
                ))}
            </NavbarContent>

            <NavbarContent justify="end">
                <ThemeSwitch />

                {isLoadingSession ? (
                    <Spinner size="sm" color="primary" />
                ) : isAuthenticated && session?.user ? (
                    <Dropdown placement="bottom-end">
                        <DropdownTrigger>
                            <Avatar
                                isBordered
                                as="button"
                                className="transition-transform"
                                color="secondary"
                                name={userName?.charAt(0) || 'U'} // Fallback para el avatar si no hay imagen ni nombre
                                size="sm"
                                src={userImage || undefined} // Usar imagen de la sesión de NextAuth
                            />
                        </DropdownTrigger>
                        <DropdownMenu aria-label="Acciones del Perfil" variant="flat">
                            <DropdownItem key="profile_info" className="h-14 gap-2" isReadOnly> {/* isReadOnly para que no parezca clickeable */}
                                <p className="font-semibold">Ingresado como</p>
                                <p className="font-semibold truncate"> 
                                    {/* Usar datos de la sesión de NextAuth */}
                                    {userName || session.user.email}
                                </p>
                            </DropdownItem>
                            <DropdownItem
                                key="settings"
                                onClick={() => router.push('/dashboard/profile')}
                            >
                                Mi configuración
                            </DropdownItem>
                            {/* <DropdownItem key="system" isDisabled>Sistema</DropdownItem>
                            <DropdownItem key="configurations" isDisabled>Configuraciones</DropdownItem> */}
                            <DropdownItem
                                key="logout"
                                color="danger"
                                onPress={handleSignOut} // Usar el handleSignOut con signOut de NextAuth
                            >
                                Salir
                            </DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                ) : (
                    // Opcional: Mostrar botón de Login si no está autenticado
                    <NavbarItem>
                        <Button as={Link} color="primary" href="/login" variant="flat">
                            Iniciar Sesión
                        </Button>
                    </NavbarItem>
                )}
            </NavbarContent>

            <NavbarMenu>
                {menuItems.map((item, index) => (
                    <NavbarMenuItem key={`${item.label}-${index}`}>
                        <Link
                            className="w-full"
                            color={
                                item.href === pathname
                                    ? 'warning'
                                    : 'foreground'
                            }
                            href={item.href}
                            size="lg"
                            onClick={() => {
                                setIsMenuOpen(false)
                            }}
                        >
                            {item.label}
                        </Link>
                    </NavbarMenuItem>
                ))}
                 {/* Opcional: Añadir item de logout al menú hamburguesa si está autenticado */}
                {isAuthenticated && (
                    <NavbarMenuItem key="logout-menu">
                         <Link
                            className="w-full"
                            color="danger"
                            href="#" // El onPress del botón se encargará
                            size="lg"
                            onClick={async () => {
                                setIsMenuOpen(false);
                                await handleSignOut();
                            }}
                        >
                            Salir
                        </Link>
                    </NavbarMenuItem>
                )}
            </NavbarMenu>
        </Navbar>
    )
}