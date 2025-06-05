// app/dashboard/assets/[id]/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    Card, CardHeader, CardBody, Divider, Chip, Spinner, Button,
    Link as HeroUILink, Avatar, Image as HeroUIImage, Tooltip
} from "@heroui/react";
import { toast } from "react-hot-toast";

import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import { EditIcon } from "@/components/icons/EditIcon";
import AssetMovementsHistoryList from "@/app/dashboard/assets/components/AssetMovementsHistoryList";
import LinkedSoftwareList from "../components/LinkedSoftwareList";
// Importa el componente genérico de documentos desde su nueva ubicación (si lo moviste)
// o desde la ubicación anterior si solo modificaste el archivo existente.
// Asumiré que lo moviste a una carpeta de componentes más general.
import AssociatedDocumentsList from "@/app/dashboard/components/AssociatedDocumentsList"; // RUTA ACTUALIZADA

import { IAssetAPI } from "@/lib/schema";
import { formatCustomDate } from "@/lib/utils";

interface AssetUserAssignmentInfo {
    user_id: number;
    user_name: string;
    user_email?: string | null;
    user_section_name?: string | null;
    assignment_date: string;
}

const statusColorMap: Record<string, "success" | "danger" | "warning" | "primary" | "secondary" | "default"> = {
    in_use: "success",
    in_storage: "warning",
    under_repair: "secondary",
    disposed: "danger",
    lost: "default",
};

const DetailItem = ({ label, value, children }: { label: string; value?: string | number | null; children?: React.ReactNode }) => {
    if (!children && (value === null || value === undefined || String(value).trim() === "")) return null;
    return (
        <div className="mb-3">
            <dt className="text-sm font-medium text-default-500">{label}</dt>
            {children ? <dd className="mt-1 text-sm text-foreground break-words">{children}</dd> : <dd className="mt-1 text-sm text-foreground break-words">{String(value)}</dd>}
        </div>
    );
};

export default function AssetDetailPage() {
    const params = useParams();
    const router = useRouter();
    const assetIdFromParams = parseInt(params.id as string, 10);

    const [asset, setAsset] = useState<IAssetAPI | null>(null);
    const [currentUserAssignment, setCurrentUserAssignment] = useState<AssetUserAssignmentInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMainAssetData = useCallback(async () => {
        if (isNaN(assetIdFromParams) || assetIdFromParams <= 0) {
            setError("ID de activo no válido.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const assetRes = await fetch(`/api/assets/${assetIdFromParams}`);
            if (!assetRes.ok) {
                const errData = await assetRes.json().catch(() => ({}));
                throw new Error(errData.message || `Error al cargar el activo (ID: ${assetIdFromParams}): ${assetRes.statusText}`);
            }
            const assetData: IAssetAPI = await assetRes.json();
            setAsset(assetData);

            if (assetData) {
                const assignmentRes = await fetch(`/api/assets/${assetIdFromParams}/assignments`);
                if (assignmentRes.ok) {
                    const assignmentData = await assignmentRes.json();
                    if (Array.isArray(assignmentData) && assignmentData.length > 0) {
                        setCurrentUserAssignment(assignmentData[0] as AssetUserAssignmentInfo);
                    } else if (!Array.isArray(assignmentData) && assignmentData && Object.keys(assignmentData).length > 0) {
                        setCurrentUserAssignment(assignmentData as AssetUserAssignmentInfo);
                    } else {
                        setCurrentUserAssignment(null);
                    }
                } else {
                    console.warn(`No se pudo cargar la asignación de usuario para el activo ${assetIdFromParams}. Status: ${assignmentRes.status}`);
                    setCurrentUserAssignment(null);
                }
            }
        } catch (err: any) {
            setError(err.message);
            setAsset(null);
            setCurrentUserAssignment(null);
            toast.error(err.message || "No se pudieron cargar los detalles principales del activo.");
        } finally {
            setIsLoading(false);
        }
    }, [assetIdFromParams]);

    useEffect(() => {
        fetchMainAssetData();
    }, [fetchMainAssetData]);

    const formatDateForDisplay = (dateString: string | null | undefined, includeTime: boolean = false) => {
        return formatCustomDate(dateString, {
            locale: 'es-UY',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: includeTime ? '2-digit' : undefined,
            minute: includeTime ? '2-digit' : undefined,
            timeZone: 'UTC'
        });
    };

    if (isLoading && !asset) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-120px)]">
                <Spinner label="Cargando detalles del activo..." color="primary" size="lg" />
            </div>
        );
    }

    if (error || (!isLoading && !asset)) {
        return (
            <div className="container mx-auto p-8 text-center">
                <h1 className="text-xl font-bold mb-4 text-danger-500">Error</h1>
                <p className="mb-6">{error || `Activo con ID ${assetIdFromParams} no encontrado o inaccesible.`}</p>
                <Button as={HeroUILink} href="/dashboard/assets" startContent={<ArrowLeftIcon />}>
                    Volver a Lista de Activos
                </Button>
            </div>
        );
    }

    if (!asset) return null;

    const validEntityIdForChildren = !isNaN(assetIdFromParams) && assetIdFromParams > 0 ? assetIdFromParams : null;

    return (
        <div className="space-y-6 pb-8">
            <div className="flex justify-between items-center mb-6">
                <Button as={HeroUILink} href="/dashboard/assets" variant="flat" startContent={<ArrowLeftIcon />}>
                    Volver a Activos
                </Button>
                <Button as={HeroUILink} href={`/dashboard/assets/${asset.id}/edit`} color="primary" variant="flat" startContent={<EditIcon />}>
                    Editar Activo
                </Button>
            </div>

            <Card className="shadow-xl">
                <CardHeader className="gap-3 p-4 sm:p-5">
                    {asset.image_url ? (
                        <HeroUIImage
                            src={asset.image_url}
                            alt={asset.product_name || "Imagen del activo"}
                            width={80} height={80}
                            className="rounded-lg object-cover border border-default-200"
                            removeWrapper
                        />
                    ) : (
                        <Avatar name={(asset.product_name || "A").charAt(0)} className="w-20 h-20 text-3xl bg-primary-100 text-primary-600" />
                    )}
                    <div className="flex flex-col flex-grow">
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground">{asset.product_name}</h1>
                        <p className="text-xs sm:text-sm text-default-500">
                            ID: {asset.id} | Inventario: {asset.inventory_code}
                            {asset.serial_number && ` | S/N: ${asset.serial_number}`}
                        </p>
                    </div>
                    {asset.status && (
                        <Chip color={statusColorMap[asset.status] || "default"} variant="flat" className="ml-auto self-start capitalize">
                            {asset.status.replace(/_/g, " ")}
                        </Chip>
                    )}
                </CardHeader>
                <Divider />
                <CardBody className="p-4 sm:p-5">
                    <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                        <DetailItem label="Descripción">{asset.description || "N/A"}</DetailItem>
                        <DetailItem label="Sección Actual" value={asset.current_section_name} />
                        <DetailItem label="Ubicación Actual" value={asset.current_location_name} />
                        <DetailItem label="Proveedor" value={asset.supplier_company_name} />
                        <DetailItem label="Fecha de Compra" value={formatDateForDisplay(asset.purchase_date)} />
                        <DetailItem label="Nº Factura Compra" value={asset.invoice_number} />
                        <DetailItem label="Vencimiento Garantía" value={formatDateForDisplay(asset.warranty_expiry_date)} />
                        <DetailItem label="Procedimiento de Adquisición" value={asset.acquisition_procedure} />
                        <DetailItem label="Creado el" value={formatDateForDisplay(asset.created_at, true)} />
                        <DetailItem label="Última Actualización" value={formatDateForDisplay(asset.updated_at, true)} />
                    </dl>
                </CardBody>
            </Card>

            {currentUserAssignment && (
                <Card className="shadow-xl">
                    <CardHeader><h2 className="text-lg font-semibold text-foreground px-4 sm:px-5 pt-4 sm:pt-5">Persona Asignada Actualmente</h2></CardHeader>
                    <Divider />
                    <CardBody className="flex flex-col sm:flex-row items-center gap-4 p-4 sm:p-5">
                        <Avatar
                            name={(currentUserAssignment.user_name || "U").charAt(0)}
                            className="w-16 h-16 text-xl bg-secondary-100 text-secondary-700"
                        />
                        <div>
                            <p className="font-semibold text-md">{currentUserAssignment.user_name}</p>
                            {currentUserAssignment.user_email && <p className="text-sm text-default-600">{currentUserAssignment.user_email}</p>}
                            {currentUserAssignment.user_section_name && <p className="text-sm text-default-500">Sección: {currentUserAssignment.user_section_name}</p>}
                            <p className="text-xs text-default-500 mt-1">Asignado el: {formatDateForDisplay(currentUserAssignment.assignment_date)}</p>
                        </div>
                    </CardBody>
                </Card>
            )}

            <LinkedSoftwareList assetId={validEntityIdForChildren} />

            {/* --- Uso del componente genérico AssociatedDocumentsList --- */}
            <AssociatedDocumentsList
                entityId={validEntityIdForChildren}
                entityType="asset" // Especificamos que la entidad es un 'asset'
                entityNameFriendly={asset.product_name || `Activo ID ${asset.id}`}
            />

            <Card className="shadow-xl">
                <CardHeader><h2 className="text-xl font-semibold text-foreground px-4 sm:px-5 pt-4 sm:pt-5">Historial de Movimientos</h2></CardHeader>
                <Divider />
                <CardBody className="p-0 sm:p-0">
                    <AssetMovementsHistoryList assetId={assetIdFromParams} assetName={asset.product_name || undefined} />
                </CardBody>
            </Card>
        </div>
    );
}