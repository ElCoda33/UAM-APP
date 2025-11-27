'use client'

import React, { useEffect, useState, Key, useCallback } from 'react';
import { Chip, Tooltip, Button, SortDescriptor } from "@heroui/react";
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

import { EditIcon } from '@/components/icons/EditIcon';
import { DeleteIcon } from '@/components/icons/DeleteIcon';
import { EyeIcon } from '@/components/icons/EyeIcon';

import { SectionRecord } from '@/app/api/sections/route';
import GenericTable, { BulkAction } from '../../components/GenericTable';

const columns = [
    { uid: 'name', name: 'Nombre', sortable: true, filterable: true },
    { uid: 'management_level', name: 'Nivel Gerencial', sortable: true, filterable: false },
    { uid: 'email', name: 'Email', sortable: true, filterable: true },
    { uid: 'parent_section_name', name: 'Sección Padre', sortable: true, filterable: true },
    { uid: 'created_at', name: 'Fecha Creación', sortable: true, filterable: false },
    { uid: 'actions', name: 'Acciones', sortable: false, filterable: false },
];

const INITIAL_VISIBLE_COLUMNS = ['name', 'management_level', 'email', 'parent_section_name', 'actions'];

export default function SectionsTable() {
    const router = useRouter();
    const [sections, setSections] = useState<SectionRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSections = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/sections');
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || "Error al cargar secciones");
            }
            const data: SectionRecord[] = await response.json();
            setSections(data);
        } catch (err: any) {
            toast.error(err.message || "No se pudieron cargar las secciones.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSections();
    }, [fetchSections]);

    const handleDeleteSection = async (sectionId: number, sectionName: string) => {
        const confirmDelete = window.confirm(`¿Estás seguro de que quieres eliminar la sección "${sectionName}" (ID: ${sectionId})?`);
        if (!confirmDelete) return;

        const toastId = toast.loading("Eliminando sección...");
        try {
            const response = await fetch(`/api/sections/${sectionId}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Error al eliminar la sección");

            toast.success(result.message || "Sección eliminada.", { id: toastId });
            fetchSections();
        } catch (err: any) {
            toast.error(err.message || "No se pudo eliminar la sección.", { id: toastId });
        }
    };

    const handleBulkDelete = async (selectedKeys: Key[]) => {
        const confirmDelete = window.confirm(`¿Estás seguro de que quieres eliminar ${selectedKeys.length} secciones seleccionadas?`);
        if (!confirmDelete) return;

        const toastId = toast.loading(`Eliminando ${selectedKeys.length} secciones...`);
        try {
            const promises = selectedKeys.map(key =>
                fetch(`/api/sections/${key}`, { method: 'DELETE' })
                    .then(res => {
                        if (!res.ok) throw new Error(`Falló al eliminar sección ${key}`);
                        return res.json();
                    })
            );

            await Promise.all(promises);

            toast.success("Secciones eliminadas correctamente.", { id: toastId });
            fetchSections();
        } catch (err: any) {
            console.error(err);
            toast.error("Hubo errores al eliminar algunas secciones.", { id: toastId });
            fetchSections();
        }
    };

    const renderCell = useCallback((section: SectionRecord, columnKey: Key): React.ReactNode => {
        const cellValue = section[columnKey as keyof SectionRecord];

        switch (columnKey) {
            case "name":
                return <span className="font-medium">{section.name}</span>;
            case "management_level":
                return <Chip size="sm" variant="flat">{cellValue ?? 'N/A'}</Chip>;
            case "email":
                return <span className="text-sm">{section.email || 'N/A'}</span>;
            case "parent_section_name":
                return <span className="text-sm">{section.parent_section_name || 'Sin padre'}</span>;
            case "created_at":
                return <span className="text-sm">{cellValue ? new Date(cellValue as string).toLocaleDateString('es-UY') : 'N/A'}</span>;
            case "actions":
                return (
                    <div className="relative flex items-center justify-end gap-1">
                        <Tooltip content="Ver Detalles">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/sections/${section.id}`)}>
                                <EyeIcon className="text-lg text-default-500" />
                            </Button>
                        </Tooltip>
                        <Tooltip content="Editar Sección">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/sections/${section.id}/edit`)}>
                                <EditIcon className="text-lg text-default-500" />
                            </Button>
                        </Tooltip>
                        <Tooltip color="danger" content="Eliminar Sección">
                            <Button isIconOnly size="sm" variant="light" onPress={() => handleDeleteSection(section.id, section.name)}>
                                <DeleteIcon className="text-lg text-danger" />
                            </Button>
                        </Tooltip>
                    </div>
                );
            default:
                return cellValue !== null && cellValue !== undefined ? String(cellValue) : <span className="text-default-400">N/A</span>;
        }
    }, [router, fetchSections]);

    const getFilterValue = useCallback((section: SectionRecord, columnKey: Key): string => {
        switch (columnKey) {
            case "name": return section.name || "";
            case "email": return section.email || "";
            case "parent_section_name": return section.parent_section_name || "";
            default: return String(section[columnKey as keyof SectionRecord] || "");
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

            const response = await fetch(`/api/sections/export/${format}`, {
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
            a.download = `secciones_exportadas.${format}`;
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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestión de Secciones</h1>
            <GenericTable<SectionRecord>
                data={sections}
                columns={columns}
                renderCell={renderCell}
                isLoading={isLoading}
                initialVisibleColumns={INITIAL_VISIBLE_COLUMNS}
                entityName="Secciones"
                onAdd={() => router.push('/dashboard/sections/add')}
                onExport={handleExport}
                getFilterValue={getFilterValue}
                emptyContent={sections.length === 0 && !isLoading ? "No hay secciones registradas." : "Ninguna sección coincide con los filtros."}
                bulkActions={bulkActions}
            />
        </div>
    );
}
