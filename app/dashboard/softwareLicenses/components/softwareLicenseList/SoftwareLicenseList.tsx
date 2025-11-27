"use client";

import React, { useEffect, useState, Key, useCallback } from "react";
import {
    Chip, User as HeroUIUser, Tooltip, Button, Link as HeroUILink, SortDescriptor
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { EditIcon } from "@/components/icons/EditIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { EyeIcon } from "@/components/icons/EyeIcon";

import { SoftwareLicenseListAPIRecord } from "@/app/api/softwareLicenses/route";
import { COLUMNS_SOFTWARE_LICENSES, INITIAL_VISIBLE_LICENSE_COLUMNS } from "./data";
import { formatDate, formatLicenseType, getLicenseChipStatus } from "./utils";
import GenericTable, { BulkAction } from "../../../components/GenericTable";

export default function SoftwareLicenseList() {
    const router = useRouter();
    const [licenses, setLicenses] = useState<SoftwareLicenseListAPIRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLicenses = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/softwareLicenses');
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || "Error al cargar licencias");
            }
            const data: SoftwareLicenseListAPIRecord[] = await response.json();
            setLicenses(data);
        } catch (err: any) {
            toast.error(err.message || "No se pudieron cargar las licencias.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLicenses();
    }, [fetchLicenses]);

    const handleDeleteLicense = async (licenseId: number, licenseName: string) => {
        const confirmDelete = window.confirm(`¿Estás seguro de que quieres eliminar la licencia para "${licenseName}" (ID: ${licenseId})?`);
        if (!confirmDelete) return;

        const toastId = toast.loading("Eliminando licencia...");
        try {
            const response = await fetch(`/api/softwareLicenses/${licenseId}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Error al eliminar la licencia");

            toast.success(result.message || "Licencia eliminada.", { id: toastId });
            fetchLicenses();
        } catch (err: any) {
            toast.error(err.message || "No se pudo eliminar la licencia.", { id: toastId });
        }
    };

    const handleBulkDelete = async (selectedKeys: Key[]) => {
        const confirmDelete = window.confirm(`¿Estás seguro de que quieres eliminar ${selectedKeys.length} licencias seleccionadas?`);
        if (!confirmDelete) return;

        const toastId = toast.loading(`Eliminando ${selectedKeys.length} licencias...`);
        try {
            const promises = selectedKeys.map(key =>
                fetch(`/api/softwareLicenses/${key}`, { method: 'DELETE' })
                    .then(res => {
                        if (!res.ok) throw new Error(`Falló al eliminar licencia ${key}`);
                        return res.json();
                    })
            );

            await Promise.all(promises);

            toast.success("Licencias eliminadas correctamente.", { id: toastId });
            fetchLicenses();
        } catch (err: any) {
            console.error(err);
            toast.error("Hubo errores al eliminar algunas licencias.", { id: toastId });
            fetchLicenses();
        }
    };

    const renderCell = useCallback((license: SoftwareLicenseListAPIRecord, columnKey: Key): React.ReactNode => {
        const cellValue = license[columnKey as keyof SoftwareLicenseListAPIRecord];

        switch (columnKey) {
            case "software_name":
                return (
                    <HeroUIUser
                        name={license.software_name}
                        description={license.software_version || "Versión no especificada"}
                        avatarProps={{ name: license.software_name.charAt(0).toUpperCase(), size: "sm" }}
                    />
                );
            case "license_type":
                return <Chip size="sm" variant="flat">{formatLicenseType(cellValue as string)}</Chip>;
            case "seats":
            case "assigned_assets_count":
                return <div className="text-right pr-2">{cellValue ?? 0}</div>;
            case "purchase_date":
            case "expiry_date":
                return formatDate(cellValue as string);
            case "created_at":
                return formatDate(cellValue as string, true);
            case "status_derived":
                const statusInfo = getLicenseChipStatus(license);
                return <Chip size="sm" variant="flat" color={statusInfo.color}>{statusInfo.label}</Chip>;
            case "actions":
                return (
                    <div className="relative flex items-center justify-end gap-1">
                        <Tooltip content="Ver Detalles y Asignaciones">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/softwareLicenses/${license.id}`)} >
                                <EyeIcon className="text-lg text-default-500" />
                            </Button>
                        </Tooltip>
                        <Tooltip content="Editar Licencia">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/softwareLicenses/${license.id}/edit`)}>
                                <EditIcon className="text-lg text-default-500" />
                            </Button>
                        </Tooltip>
                        <Tooltip color="danger" content="Eliminar Licencia">
                            <Button isIconOnly size="sm" variant="light" onPress={() => handleDeleteLicense(license.id, license.software_name)}>
                                <DeleteIcon className="text-lg text-danger" />
                            </Button>
                        </Tooltip>
                    </div>
                );
            default:
                return cellValue !== null && cellValue !== undefined ? String(cellValue) : <span className="text-default-400">N/A</span>;
        }
    }, [router, fetchLicenses]);

    const getFilterValue = useCallback((license: SoftwareLicenseListAPIRecord, columnKey: Key): string => {
        switch (columnKey) {
            case "software_name": return license.software_name || "";
            case "software_version": return license.software_version || "";
            case "license_type": return formatLicenseType(license.license_type);
            case "supplier_name": return license.supplier_name || "";
            case "assigned_user_name": return license.assigned_user_name || "";
            case "status_derived": return getLicenseChipStatus(license).label;
            default: return String(license[columnKey as keyof SoftwareLicenseListAPIRecord] || "");
        }
    }, []);

    const handleExport = async (format: 'csv' | 'pdf', filters: any, sort: SortDescriptor, columns: any[]) => {
        const toastId = toast.loading(`Generando exportación ${format.toUpperCase()}...`);
        try {
            const apiFilters: any = {
                searchText: filters.searchText,
                searchAttribute: filters.searchAttribute,
            };

            const payload = {
                filters: apiFilters,
                sort: {
                    column: sort.column,
                    direction: sort.direction
                },
                columns: columns.map(c => ({ uid: c.uid, name: c.name }))
            };

            const response = await fetch(`/api/softwareLicenses/export/${format}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const resJson = await response.json().catch(() => ({}));
                throw new Error(resJson.message || `Error al exportar a ${format.toUpperCase()}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `licencias_software_exportadas.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success(`Exportación ${format.toUpperCase()} completada`, { id: toastId });

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al exportar", { id: toastId });
        }
    };

    const bulkActions: BulkAction[] = [
        {
            key: "delete",
            label: "Eliminar",
            color: "danger",
            icon: <DeleteIcon />,
            onClick: handleBulkDelete,
        }
    ];

    return (
        <div className="space-y-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestión de Licencias de Software</h1>
            <GenericTable<SoftwareLicenseListAPIRecord>
                data={licenses}
                columns={COLUMNS_SOFTWARE_LICENSES}
                renderCell={renderCell}
                isLoading={isLoading}
                initialVisibleColumns={INITIAL_VISIBLE_LICENSE_COLUMNS}
                entityName="Licencias"
                onAdd={() => router.push('/dashboard/softwareLicenses/add')}
                onExport={handleExport}
                getFilterValue={getFilterValue}
                emptyContent={licenses.length === 0 && !isLoading ? "No hay licencias registradas." : "Ninguna licencia coincide con los filtros."}
                bulkActions={bulkActions}
            />
        </div>
    );
}