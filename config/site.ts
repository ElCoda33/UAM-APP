export type SiteConfig = typeof siteConfig

export const siteConfig = {
    name: 'UAM',
    description:
        'Make beautiful websites regardless of your design experience.',
    navItems: [
        {
            label: 'Secciónes',
            href: '/dashboard/sections',
        },
        {
            label: 'Bienes',
            href: '/dashboard/assets',
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
    navMenuItems: [
        {
            label: 'Secciónes',
            href: '/dashboard/sections',
        },
        {
            label: 'Bienes',
            href: '/dashboard/assets',
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
        github: 'https://github.com/nextui-org/nextui',
        twitter: 'https://twitter.com/getnextui',
        docs: 'https://nextui.org',
        discord: 'https://discord.gg/9b6yyZKmH4',
        sponsor: 'https://patreon.com/jrgarciadev',
    },
}
