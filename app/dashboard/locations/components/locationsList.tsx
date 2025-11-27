
"use client";

import React, { useEffect, useState, Key, useCallback } from "react";
import { Tooltip, Button, SortDescriptor } from "@heroui/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { EditIcon } from "@/components/icons/EditIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { EyeIcon } from "@/components/icons/EyeIcon";

import { LocationRecord } from "@/app/api/locations/route";
import GenericTable, { BulkAction } from "../../components/GenericTable";

const columns = [
    { uid: 'id', name: 'ID', sortable: true, filterable: false },
    { uid: 'name', name: 'Nombre', sortable: true, filterable: true },
    { uid: 'description', name: 'Descripción', sortable: true, filterable: true },
    { uid: 'section_name', name: 'Sección', sortable: true, filterable: true },
    { uid: 'created_at', name: 'Fecha Creación', sortable: true, filterable: false },
    { uid: 'actions', name: 'Acciones', sortable: false, filterable: false },
];

const INITIAL_VISIBLE_COLUMNS = ['name', 'description', 'section_name', 'actions'];

export default function LocationsList() {
    const router = useRouter();
    const [locations, setLocations] = useState<LocationRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLocations = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/locations');
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || "Error al cargar ubicaciones");
            }
            const data: LocationRecord[] = await response.json();
            setLocations(data);
        } catch (err: any) {
            toast.error(err.message || "No se pudieron cargar las ubicaciones.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLocations();
    }, [fetchLocations]);

    const handleDeleteLocation = async (locationId: number, locationName: string) => {
        const confirmDelete = window.confirm(`¿Estás seguro de eliminar la ubicación "${locationName}" (ID: ${locationId})?`);
        if (!confirmDelete) return;

        const toastId = toast.loading("Eliminando ubicación...");
        try {
            const response = await fetch(`/api/locations/${locationId}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Error al eliminar ubicación");
            toast.success(result.message || "Ubicación eliminada.", { id: toastId });
            fetchLocations();
        } catch (err: any) {
            toast.error(err.message || "No se pudo eliminar la ubicación.", { id: toastId });
        }
    };

    const handleBulkDelete = async (selectedKeys: Key[]) => {
        const confirmDelete = window.confirm(`¿Estás seguro de que quieres eliminar ${selectedKeys.length} ubicaciones seleccionadas?`);
        if (!confirmDelete) return;

        const toastId = toast.loading(`Eliminando ${selectedKeys.length} ubicaciones...`);
        try {
            const promises = selectedKeys.map(key =>
                fetch(`/api/locations/${key}`, { method: 'DELETE' })
                    .then(res => {
                        if (!res.ok) throw new Error(`Falló al eliminar ubicación ${key}`);
                        return res.json();
                    })
            );

            await Promise.all(promises);

            toast.success("Ubicaciones eliminadas correctamente.", { id: toastId });
            fetchLocations();
        } catch (err: any) {
            console.error(err);
            toast.error("Hubo errores al eliminar algunas ubicaciones.", { id: toastId });
            fetchLocations();
        }
    };

    const renderCell = useCallback((location: LocationRecord, columnKey: Key): React.ReactNode => {
        const cellValue = location[columnKey as keyof LocationRecord];

        switch (columnKey) {
            case "name":
                return <span className="font-medium">{location.name}</span>;
            case "description":
                return <span className="text-sm">{location.description || 'N/A'}</span>;
            case "section_name":
                return <span className="text-sm">{location.section_name || 'Sin sección'}</span>;
            case "created_at":
                return <span className="text-sm">{cellValue ? new Date(cellValue as string).toLocaleDateString('es-UY') : 'N/A'}</span>;
            case "actions":
                return (
                    <div className="relative flex items-center justify-end gap-1">
                        <Tooltip content="Ver Detalles">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/locations/${location.id}`)}>
                                <EyeIcon className="text-lg text-default-500" />
                            </Button>
                        </Tooltip>
                        <Tooltip content="Editar Ubicación">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/locations/${location.id}/edit`)}>
                                <EditIcon className="text-lg text-default-500" />
                            </Button>
                        </Tooltip>
                        <Tooltip color="danger" content="Eliminar Ubicación">
                            <Button isIconOnly size="sm" variant="light" onPress={() => handleDeleteLocation(location.id, location.name)}>
                                <DeleteIcon className="text-lg text-danger" />
                            </Button>
                        </Tooltip>
                    </div>
                );
            default:
                return cellValue !== null && cellValue !== undefined ? String(cellValue) : <span className="text-default-400">N/A</span>;
        }
    }, [router, fetchLocations]);

    const getFilterValue = useCallback((location: LocationRecord, columnKey: Key): string => {
        switch (columnKey) {
            case "name": return location.name || "";
            case "description": return location.description || "";
            case "section_name": return location.section_name || "";
            default: return String(location[columnKey as keyof LocationRecord] || "");
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

            const response = await fetch(`/api/locations/export/${format}`, {
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
            a.download = `ubicaciones_exportadas.${format}`;
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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestión de Ubicaciones Físicas</h1>
            <GenericTable<LocationRecord>
                data={locations}
                columns={columns}
                renderCell={renderCell}
                isLoading={isLoading}
                initialVisibleColumns={INITIAL_VISIBLE_COLUMNS}
                entityName="Ubicaciones"
                onAdd={() => router.push('/dashboard/locations/add')}
                onExport={handleExport}
                getFilterValue={getFilterValue}
                emptyContent={locations.length === 0 && !isLoading ? "No hay ubicaciones registradas." : "Ninguna ubicación coincide con los filtros."}
                bulkActions={bulkActions}
            />
        </div>
    );
}