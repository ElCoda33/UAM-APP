'use client'

import React, { useContext } from 'react'
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
    Avatar,
    DropdownMenu,
    DropdownItem,
} from '@nextui-org/react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'

import { siteConfig } from '@/config/site'
import { UserContext } from '@/app/providers'
import { logout } from '@/lib/session/logout'
import { ThemeSwitch } from '@/components/theme-switch'

export default function NavBar() {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false)
    const user: any = useContext(UserContext)
    const router = useRouter()
    const pathname = usePathname()
    const menuItems = siteConfig.navItems

    return (
        <Navbar
            isMenuOpen={isMenuOpen}
            maxWidth="xl"
            onMenuOpenChange={setIsMenuOpen}
        >
            <NavbarContent className="sm:hidden" justify="start">
                <NavbarMenuToggle
                    aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
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
                {siteConfig.navItems.map((item) => (
                    <NavbarItem key={item.href} isActive>
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

                <Dropdown placement="bottom-end">
                    <DropdownTrigger>
                        <Avatar
                            isBordered
                            as="button"
                            className="transition-transform"
                            color="secondary"
                            name="Jason Hughes"
                            size="sm"
                            src={user?.avatar}
                        />
                    </DropdownTrigger>
                    <DropdownMenu aria-label="Profile Actions" variant="flat">
                        <DropdownItem key="profile" className="h-14 gap-2">
                            <p className="font-semibold">Ingresado como</p>
                            <p className="font-semibold">
                                {user?.nombre} {user?.apellido}
                            </p>
                        </DropdownItem>
                        <DropdownItem key="settings" onClick={async () => {
                            router.push('profile')
                        }}>
                            Mi configuración
                        </DropdownItem>
                        <DropdownItem key="system" isDisabled>
                            Sistema
                        </DropdownItem>
                        <DropdownItem key="configurations" isDisabled>
                            Configuraciones
                        </DropdownItem>
                        <DropdownItem
                            key="logout"
                            color="danger"
                            onClick={async () => {
                                await logout()
                                router.push('/login')
                            }}
                        >
                            Salir
                        </DropdownItem>
                    </DropdownMenu>
                </Dropdown>
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
            </NavbarMenu>
        </Navbar>
    )
}
