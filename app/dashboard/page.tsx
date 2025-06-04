// app/dashboard/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardBody, Spinner, Button, Link as HeroUILink, Divider } from "@heroui/react";
import { title, subtitle } from "@/components/primitives";

// Importar iconos de MUI (actualizados con alternativas)
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'; // Se mantiene
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';    // Alternativa para Activos
import DeviceHubOutlinedIcon from '@mui/icons-material/DeviceHubOutlined';  // Alternativa para Secciones
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';  // Alternativa para Empresas
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';          // Alternativa para Ubicaciones
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';      // Se mantiene (para Licencias)
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';    // Se mantiene

// Importar los componentes de gráfico
import AssetsByStatusChart from "./components/charts/AssetsByStatusChart";
import UsersBySectionChart from "./components/charts/UsersBySectionChart";

interface SummaryStats {
    users: number;
    assets: number;
    sections: number;
    companies: number;
    locations: number;
    softwareLicenses: number;
}

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color?: "primary" | "secondary" | "success" | "warning" | "danger" | "default";
    description?: string;
    href?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = "default", description, href }) => {
    const routerForCardHook = useRouter(); // Hook de router
    const cardContent = (
        <CardBody className="flex flex-col items-center justify-center p-6">
            <div className={`p-3 rounded-full mb-3 bg-${color}-100 text-${color}-600 dark:bg-${color}-900 dark:text-${color}-300`}>
                {React.cloneElement(icon as React.ReactElement, { style: { fontSize: '2rem' } })}
            </div>
            <h4 className="text-3xl font-semibold text-foreground">{value}</h4>
            <p className="text-default-500 text-sm">{title}</p>
            {description && <p className="text-xs text-default-400 mt-1 text-center">{description}</p>}
        </CardBody>
    );

    if (href) {
        return (
            <Card
                isPressable
                onPress={() => routerForCardHook.push(href)}
                className={`shadow-lg hover:shadow-xl transition-shadow bg-background/60 dark:bg-default-100/50 border border-transparent hover:border-${color}-500/50`}
            >
                {cardContent}
            </Card>
        );
    }
    return (
        <Card className={`shadow-md bg-background/60 dark:bg-default-100/50`}>
            {cardContent}
        </Card>
    );
};

interface QuickLinkCardProps {
    title: string;
    href: string;
    icon: React.ReactNode;
    color?: "primary" | "secondary" | "success" | "warning" | "danger" | "default";
}

const QuickLinkCard: React.FC<QuickLinkCardProps> = ({ title, href, icon, color = "primary" }) => {
    const router = useRouter();
    return (
        <Card
            isPressable
            onPress={() => router.push(href)}
            className={`shadow-lg hover:shadow-xl transition-shadow hover:border-${color}-500/80 border border-transparent`}
        >
            <CardBody className="flex flex-row items-center gap-4 p-5">
                <div className={`p-3 rounded-lg bg-${color}-100 text-${color}-600 dark:bg-${color}-800 dark:text-${color}-200`}>
                    {React.cloneElement(icon as React.ReactElement, { style: { fontSize: '2rem' } })}
                </div>
                <div>
                    <h5 className="text-lg font-semibold text-foreground">{title}</h5>
                </div>
            </CardBody>
        </Card>
    );
};

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState<SummaryStats | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    useEffect(() => {
        if (status === "authenticated") {
            const fetchStats = async () => {
                setIsLoadingStats(true);
                try {
                    const response = await fetch('/api/dashboard/summary-stats');
                    if (!response.ok) {
                        throw new Error('Error al cargar las estadísticas del dashboard');
                    }
                    const data: SummaryStats = await response.json();
                    setStats(data);
                } catch (error) {
                    console.error(error);
                } finally {
                    setIsLoadingStats(false);
                }
            };
            fetchStats();
        }
    }, [status]);

    const userDisplayName = useMemo(() => {
        if (!session?.user) return "Usuario";
        const { name, firstName, lastName, email } = session.user;
        if (name) return name;
        if (firstName && lastName) return `${firstName} ${lastName}`;
        if (firstName) return firstName;
        return email || "Usuario";
    }, [session?.user]);

    const quickLinks = [
        { title: "Gestionar Usuarios", href: "/dashboard/users", icon: <PeopleAltOutlinedIcon />, color: "primary" as const },
        { title: "Gestionar Activos", href: "/dashboard/assets", icon: <CategoryOutlinedIcon />, color: "success" as const }, // Icono cambiado
        { title: "Gestionar Secciones", href: "/dashboard/sections", icon: <DeviceHubOutlinedIcon />, color: "warning" as const }, // Icono cambiado
        { title: "Licencias de Software", href: "/dashboard/softwareLicenses", icon: <ArticleOutlinedIcon />, color: "secondary" as const },
        { title: "Gestionar Empresas", href: "/dashboard/companies", icon: <ApartmentOutlinedIcon />, color: "danger" as const }, // Icono cambiado
        { title: "Gestionar Ubicaciones", href: "/dashboard/locations", icon: <PlaceOutlinedIcon />, color: "default" as const }, // Icono cambiado
    ];


    if (status === "loading") {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-100px)]">
                <Spinner label="Cargando Dashboard..." size="lg" color="primary" />
            </div>
        );
    }

    if (status === "unauthenticated") {
        router.push('/login');
        return null;
    }


    return (
        <section className="flex flex-col items-center justify-center gap-6 py-8 md:py-10">
            <div className="text-center">
                <h1 className={title()}>Bienvenido al Dashboard,</h1>
                <h1 className={title({ color: "violet" })}>{userDisplayName}!</h1>
                <h2 className={subtitle({ class: "mt-4" })}>
                    Aquí puedes gestionar los recursos y la información de UAM.
                </h2>
            </div>

            <Divider className="my-6" />

            <div className="w-full max-w-6xl">
                <h3 className="text-2xl font-semibold text-foreground self-start mb-6">Resumen General</h3>
                {isLoadingStats ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <Card key={index} className="shadow-md bg-background/60 dark:bg-default-100/50 h-[180px]">
                                <CardBody className="flex justify-center items-center">
                                    <Spinner size="sm" />
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                ) : stats ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        <StatCard title="Usuarios Registrados" value={stats.users} icon={<PeopleAltOutlinedIcon />} color="primary" href="/dashboard/users" />
                        <StatCard title="Activos Totales" value={stats.assets} icon={<CategoryOutlinedIcon />} color="success" href="/dashboard/assets" /> {/* Icono cambiado */}
                        <StatCard title="Secciones Definidas" value={stats.sections} icon={<DeviceHubOutlinedIcon />} color="warning" href="/dashboard/sections" /> {/* Icono cambiado */}
                        <StatCard title="Licencias de Software" value={stats.softwareLicenses} icon={<ArticleOutlinedIcon />} color="secondary" href="/dashboard/softwareLicenses" />
                        <StatCard title="Empresas Registradas" value={stats.companies} icon={<ApartmentOutlinedIcon />} color="danger" href="/dashboard/companies" /> {/* Icono cambiado */}
                        <StatCard title="Ubicaciones Físicas" value={stats.locations} icon={<PlaceOutlinedIcon />} color="default" href="/dashboard/locations" /> {/* Icono cambiado */}
                    </div>
                ) : (
                    <p className="text-default-500">No se pudieron cargar las estadísticas.</p>
                )}

                <Divider className="my-8" />
                <h3 className="text-2xl font-semibold text-foreground self-start mb-6">Visualizaciones</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <AssetsByStatusChart />
                    <UsersBySectionChart />
                </div>
            </div>

            <Divider className="my-8" />

            <h3 className="text-2xl font-semibold text-foreground self-start mb-4">Accesos Rápidos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-5xl">
                {quickLinks.map(link => (
                    <QuickLinkCard
                        key={link.href}
                        title={link.title}
                        href={link.href}
                        icon={link.icon}
                        color={link.color}
                    />
                ))}
            </div>

            <Divider className="my-8" />
            <Button
                variant="ghost"
                color="primary"
                startContent={<SettingsOutlinedIcon />}
                onPress={() => router.push('/dashboard/profile')}
                size="lg"
            >
                Ir a Mi Perfil
            </Button>
        </section>
    );
}