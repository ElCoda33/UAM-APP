// config/site.ts
export type SiteConfig = typeof siteConfig

export const siteConfig = {
    name: 'UAM',
    description:
        'Make beautiful websites regardless of your design experience.',
    navItems: [
        {
            label: 'Secciones',
            href: '/dashboard/sections',
        },
        {
            label: 'Bienes', // "Assets" en inglés
            href: '/dashboard/assets',
        },
        {
            label: 'Licencias de Software', // Nueva sección
            href: '/dashboard/softwareLicenses',
        },
        {
            label: 'Usuarios',
            href: '/dashboard/users',
        },
        {
            label: 'Empresas',
            href: '/dashboard/companies',
        },
        {
            label: 'Ubicaciones',
            href: '/dashboard/locations',
        },
    ],
    navMenuItems: [ // Generalmente es igual a navItems para el menú hamburguesa
        {
            label: 'Secciones',
            href: '/dashboard/sections',
        },
        {
            label: 'Bienes',
            href: '/dashboard/assets',
        },
        {
            label: 'Licencias de Software', // Nueva sección
            href: '/dashboard/softwareLicenses',
        },
        {
            label: 'Usuarios',
            href: '/dashboard/users',
        },
        {
            label: 'Empresas',
            href: '/dashboard/companies',
        },
        {
            label: 'Ubicaciones',
            href: '/dashboard/locations',
        },
    ],
    links: {
        github: 'https://github.com/nextui-org/nextui', // Puedes actualizar estos si son específicos de tu proyecto
        twitter: 'https://twitter.com/getnextui',
        docs: 'https://nextui.org',
        discord: 'https://discord.gg/9b6yyZKmH4',
        sponsor: 'https://patreon.com/jrgarciadev',
    },
}