// app/dashboard/softwareLicenses/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    Card, CardHeader, CardBody, CardFooter,
    Divider,
    Chip,
    Spinner,
    Button,
    Link as HeroUILink,
    Avatar,
    Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
    Tooltip
} from "@heroui/react";
import { toast } from "react-hot-toast";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import { EditIcon } from "@/components/icons/EditIcon";

// Iconos corregidos/alternativos
import SyncIcon from '@mui/icons-material/Sync';         // Para Renovar
import IosShareIcon from '@mui/icons-material/IosShare'; // Para Transferir
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'; // Para Revocar


import type { SoftwareLicenseDetailAPIRecord, AssignedAssetInfo } from "@/app/api/softwareLicenses/[id]/route";
import type { UserDetailsFromDB } from "@/lib/data/users";
import { getLicenseChipStatus, formatDate, formatLicenseType } from "../components/softwareLicenseList/utils";
import { EyeIcon } from "@/components/icons/EyeIcon";


const DetailItem = ({ label, value, children }: { label: string; value?: string | number | null; children?: React.ReactNode }) => {
    if (!children && (value === null || value === undefined || String(value).trim() === "")) return null;
    return (
        <div className="mb-3">
            <dt className="text-sm font-medium text-default-500">{label}</dt>
            {children ? <dd className="mt-1 text-sm text-foreground">{children}</dd> : <dd className="mt-1 text-sm text-foreground">{String(value)}</dd>}
        </div>
    );
};

export default function SoftwareLicenseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const licenseId = parseInt(id || "0", 10);

    const [license, setLicense] = useState<SoftwareLicenseDetailAPIRecord | null>(null);
    const [assignedUser, setAssignedUser] = useState<UserDetailsFromDB | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!licenseId) {
            setError("ID de licencia no válido.");
            setIsLoading(false);
            return;
        }

        const fetchLicenseDetails = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const licenseRes = await fetch(`/api/softwareLicenses/${licenseId}`);
                if (!licenseRes.ok) {
                    const errData = await licenseRes.json().catch(() => ({}));
                    throw new Error(errData.message || `Error al cargar la licencia: ${licenseRes.statusText}`);
                }
                const licenseData: SoftwareLicenseDetailAPIRecord = await licenseRes.json();
                setLicense(licenseData);

                if (licenseData.assigned_to_user_id) {
                    const userRes = await fetch(`/api/users/${licenseData.assigned_to_user_id}`);
                    if (userRes.ok) {
                        const userData: UserDetailsFromDB = await userRes.json();
                        setAssignedUser(userData);
                    } else {
                        console.warn(`No se pudieron cargar los detalles del usuario asignado ID: ${licenseData.assigned_to_user_id}`);
                    }
                }

            } catch (err: any) {
                setError(err.message);
                toast.error(err.message || "No se pudieron cargar los detalles de la licencia.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchLicenseDetails();
    }, [licenseId]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-120px)]">
                <Spinner label="Cargando detalles de la licencia..." color="primary" size="lg" />
            </div>
        );
    }

    if (error || !license) {
        return (
            <div className="container mx-auto p-8 text-center">
                <h1 className="text-2xl font-bold mb-4 text-danger-500">Error</h1>
                <p className="mb-6">{error || `Licencia con ID ${licenseId} no encontrada.`}</p>
                <Button as={HeroUILink} href="/dashboard/softwareLicenses" startContent={<ArrowLeftIcon />}>
                    Volver a Lista de Licencias
                </Button>
            </div>
        );
    }

    const licenseStatusInfo = getLicenseChipStatus(license);

    const assetColumns = [
        { uid: "asset_id", name: "ID Activo" },
        { uid: "asset_product_name", name: "Nombre Producto" },
        { uid: "asset_inventory_code", name: "Cód. Inventario" },
        { uid: "installation_date", name: "Fecha Instalación/Asignación" },
        { uid: "assignment_notes", name: "Notas Asignación" },
        { uid: "actions", name: "Ver Activo" },
    ];

    return (
        <div className="container mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex justify-between items-center">
                <Button as={HeroUILink} href="/dashboard/softwareLicenses" variant="light" startContent={<ArrowLeftIcon />}>
                    Volver a Licencias
                </Button>
                <div className="flex gap-2">
                    <Button
                        as={HeroUILink}
                        href={`/dashboard/softwareLicenses/${license.id}/edit`}
                        color="primary"
                        variant="flat"
                        startContent={<EditIcon />}
                    >
                        Editar Licencia
                    </Button>
                </div>
            </div>

            <Card className="shadow-lg">
                <CardHeader className="flex flex-col items-start sm:flex-row sm:justify-between sm:items-center">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{license.software_name}</h1>
                        {license.software_version && <p className="text-sm text-default-500">Versión: {license.software_version}</p>}
                    </div>
                    <Chip color={licenseStatusInfo.color} variant="flat" size="md">{licenseStatusInfo.label}</Chip>
                </CardHeader>
                <Divider />
                <CardBody>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                        <DetailItem label="Número de Licencia (Clave)" value={license.license_key || "No especificada"} />
                        <DetailItem label="Tipo de Licencia" value={formatLicenseType(license.license_type)} />
                        <DetailItem label="Puestos/Asientos Cubiertos" value={license.seats} />
                        <DetailItem label="Fecha de Adquisición" value={formatDate(license.purchase_date)} />
                        <DetailItem label="Costo de Adquisición" value={license.purchase_cost !== null ? `$${Number(license.purchase_cost).toFixed(2)}` : "No especificado"} />
                        <DetailItem label="Fecha de Vencimiento" value={formatDate(license.expiry_date) || "No aplica (Perpetua)"} />
                        <DetailItem label="Proveedor" value={license.supplier_name || "No especificado"} />
                        <DetailItem label="Número de Factura" value={license.invoice_number || "No especificado"} />
                        <DetailItem label="Creada el" value={formatDate(license.created_at, true)} />
                        <DetailItem label="Última Actualización" value={formatDate(license.updated_at, true)} />
                    </dl>
                    {license.notes && (
                        <div className="mt-4">
                            <DetailItem label="Notas Adicionales">
                                <p className="whitespace-pre-wrap text-sm text-default-700 bg-default-50 p-3 rounded-md">{license.notes}</p>
                            </DetailItem>
                        </div>
                    )}
                </CardBody>
                <CardFooter className="flex justify-end gap-2">
                    <Button variant="flat" color="warning" startContent={<SyncIcon />}>Renovar</Button>
                    <Button variant="flat" color="secondary" startContent={<IosShareIcon />}>Transferir</Button>
                    <Button variant="flat" color="danger" startContent={<ArchiveOutlinedIcon />}>Revocar</Button>
                </CardFooter>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <h2 className="text-xl font-semibold text-foreground">Bienes Asociados ({license.assigned_assets?.length || 0})</h2>
                </CardHeader>
                <Divider />
                <CardBody>
                    {license.assigned_assets && license.assigned_assets.length > 0 ? (
                        <Table aria-label="Tabla de Bienes Asociados" removeWrapper>
                            <TableHeader columns={assetColumns}>
                                {(column) => <TableColumn key={column.uid} className="bg-default-100">{column.name}</TableColumn>}
                            </TableHeader>
                            <TableBody items={license.assigned_assets} emptyContent="No hay bienes asignados a esta licencia.">
                                {(item: AssignedAssetInfo) => (
                                    <TableRow key={item.assignment_id}>
                                        {(columnKey) => {
                                            const key = columnKey as keyof AssignedAssetInfo | "actions";
                                            if (key === "actions") {
                                                return <TableCell>
                                                    <Button
                                                        as={HeroUILink}
                                                        href={`/dashboard/assets/${item.asset_id}`}
                                                        size="sm"
                                                        variant="light"
                                                        isIconOnly
                                                        aria-label="Ver detalles del activo"
                                                    >
                                                        <EyeIcon className="text-lg text-default-500" />
                                                    </Button>
                                                </TableCell>;
                                            }
                                            if (key === "installation_date") {
                                                return <TableCell>{formatDate(item.installation_date)}</TableCell>;
                                            }
                                            return <TableCell>{String(item[key as keyof AssignedAssetInfo] ?? "N/A")}</TableCell>;
                                        }}
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-default-500">No hay bienes asignados actualmente a esta licencia.</p>
                    )}
                </CardBody>
            </Card>

            {assignedUser && (
                <Card className="shadow-lg">
                    <CardHeader>
                        <h2 className="text-xl font-semibold text-foreground">Persona Vinculada a la Licencia</h2>
                    </CardHeader>
                    <Divider />
                    <CardBody className="flex flex-col sm:flex-row items-center gap-4">
                        <Avatar
                            src={assignedUser.avatar_url || undefined}
                            name={`${assignedUser.first_name || ''} ${assignedUser.last_name || ''}`.trim().charAt(0) || 'U'}
                            className="w-20 h-20 text-large"
                        />
                        <div className="text-center sm:text-left">
                            <p className="font-semibold text-lg">
                                {`${assignedUser.first_name || ''} ${assignedUser.last_name || ''}`.trim() || "Nombre no disponible"}
                            </p>
                            {assignedUser.email && <p className="text-sm text-default-600">{assignedUser.email}</p>}
                            {assignedUser.section_name && <p className="text-sm text-default-500">Sección: {assignedUser.section_name}</p>}
                        </div>
                    </CardBody>
                </Card>
            )}
        </div>
    );
}