'use client'

import React, { useEffect, useState, Key, useCallback } from 'react';
import {
    Button, Chip, User as NextUIUser, ChipProps, SortDescriptor, Tooltip
} from "@heroui/react";
import { DateValue } from "@internationalized/date";
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

// Icons
import { EditIcon } from '@/components/icons/EditIcon';
import { EyeIcon } from '@/components/icons/EyeIcon';
import { DeleteIcon } from '@/components/icons/DeleteIcon';
import MoveUpRoundedIcon from '@mui/icons-material/MoveUpRounded';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';

import GenericTable, { BulkAction } from '../../components/GenericTable';
import { columns as columnDefinitions, statusOptions } from '../../../../components/assetList/data';
import { IAssetAPI } from '@/lib/schema';
import BulkMovementModal from './BulkMovementModal';

const statusColorMap: Record<string, ChipProps['color']> = {
    in_use: 'success',
    in_storage: 'warning',
    under_repair: 'secondary',
    disposed: 'danger',
    lost: 'default',
};

function parseApiDateStringToDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === "") return null;
    const simpleDateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (simpleDateMatch) {
        const year = parseInt(simpleDateMatch[1], 10);
        const month = parseInt(simpleDateMatch[2], 10) - 1;
        const day = parseInt(simpleDateMatch[3], 10);
        const dateObj = new Date(Date.UTC(year, month, day));
        if (!isNaN(dateObj.getTime())) return dateObj;
    }
    const fallbackDate = new Date(dateStr);
    if (!isNaN(fallbackDate.getTime())) return fallbackDate;
    return null;
}

const INITIAL_DEFAULT_VISIBLE_COLUMNS = [
    'product_name', 'serial_number', 'current_section_name', "description", 'status', 'actions',
];

export default function AssetList() {
    const [assets, setAssets] = useState<IAssetAPI[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
    const [selectedAssetIds, setSelectedAssetIds] = useState<(string | number)[]>([]);
    const router = useRouter();

    const fetchAssets = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/assets');
            if (!response.ok) throw new Error('Error al obtener los activos');
            const data: IAssetAPI[] = await response.json();
            setAssets(data);
        } catch (err) {
            console.error(err);
            toast.error((err as Error).message || "Error cargando activos.")
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    const handleBulkDelete = async (selectedKeys: Key[]) => {
        const confirmDelete = window.confirm(`¿Estás seguro de que quieres eliminar ${selectedKeys.length} activos seleccionados?`);
        if (!confirmDelete) return;

        const toastId = toast.loading(`Eliminando ${selectedKeys.length} activos...`);
        try {
            const promises = selectedKeys.map(key =>
                fetch(`/api/assets/${key}`, { method: 'DELETE' })
                    .then(res => {
                        if (!res.ok) throw new Error(`Falló al eliminar activo ${key}`);
                        return res.json();
                    })
            );

            await Promise.all(promises);

            toast.success("Activos eliminados correctamente.", { id: toastId });
            await fetchAssets();
        } catch (err: any) {
            console.error(err);
            toast.error("Hubo errores al eliminar algunos activos.", { id: toastId });
            await fetchAssets();
        }
    };

    const handleBulkMove = async (selectedKeys: Key[]) => {
        setSelectedAssetIds(selectedKeys.map(k => k.toString()));
        setIsBulkMoveModalOpen(true);
    };

    const handleBulkMoveSuccess = async () => {
        await fetchAssets();
        setSelectedAssetIds([]);
    };

    const renderCell = useCallback((asset: IAssetAPI, columnKey: Key): React.ReactNode => {
        const cellValue = asset[columnKey as keyof IAssetAPI];
        switch (columnKey) {
            case 'product_name':
                return (
                    <NextUIUser
                        avatarProps={{ radius: 'md', src: asset.image_url || undefined, size: "sm", name: (asset.product_name || "A").charAt(0).toUpperCase() }}
                        description={asset.serial_number || asset.inventory_code || "S/N o Inv. no disponible"}
                        name={<span className="font-medium">{cellValue as string || "Producto sin nombre"}</span>}
                    >
                        {asset.product_name || "Producto sin nombre"}
                    </NextUIUser>
                );
            case 'status':
                return <Chip className="capitalize" color={statusColorMap[asset.status!] || 'default'} size="sm" variant="flat">{asset.status ? asset.status.replace(/_/g, " ") : "N/A"}</Chip>;
            case 'purchase_date': case 'warranty_expiry_date':
                const date = parseApiDateStringToDate(cellValue as string | null);
                return date ? date.toLocaleDateString('es-UY', { timeZone: 'UTC' }) : "N/A";
            case 'actions':
                return (
                    <div className="relative flex items-center gap-1.5 sm:gap-2">
                        <Tooltip content="Ver en detalle">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/assets/${asset.id}`)}>
                                <EyeIcon className="text-lg text-default-400" />
                            </Button>
                        </Tooltip>
                        <Tooltip content="Editar Activo">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/assets/${asset.id}/edit`)}>
                                <EditIcon className="text-lg text-default-400" />
                            </Button>
                        </Tooltip>

                        <Tooltip content="Mover Activo">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/assets/${asset.id}/move`)}>
                                <MoveUpRoundedIcon fontSize="small" className="text-lg text-default-400" />
                            </Button>
                        </Tooltip>
                        <Tooltip content="Historial de Movimientos">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/assets/${asset.id}/history`)}>
                                <FormatListBulletedIcon fontSize="small" className="text-lg text-default-400" />
                            </Button>
                        </Tooltip>
                    </div>
                );
            default:
                return cellValue !== null && cellValue !== undefined ? String(cellValue) : "N/A";
        }
    }, [router]);

    const handleExport = async (format: 'csv' | 'pdf', filters: any, sort: SortDescriptor, columns: any[]) => {
        const toastId = toast.loading(`Generando exportación ${format.toUpperCase()}...`);
        try {
            // Map GenericTable filters to API ExportFilters
            const apiFilters: any = {
                searchText: filters.searchText,
                searchAttribute: filters.searchAttribute,
                status: filters.status,
            };

            // Handle Date Range
            if (filters.dateRange && filters.dateRange.from) {
                if (filters.searchAttribute === 'purchase_date') {
                    apiFilters.purchaseDateFrom = `${filters.dateRange.from.year}-${String(filters.dateRange.from.month).padStart(2, '0')}-${String(filters.dateRange.from.day).padStart(2, '0')}`;
                    if (filters.dateRange.to) {
                        apiFilters.purchaseDateTo = `${filters.dateRange.to.year}-${String(filters.dateRange.to.month).padStart(2, '0')}-${String(filters.dateRange.to.day).padStart(2, '0')}`;
                    }
                }
            }

            const payload = {
                filters: apiFilters,
                sort: {
                    column: sort.column,
                    direction: sort.direction
                },
                columns: columns.map(c => ({ uid: c.uid, name: c.name }))
            };

            const response = await fetch(`/api/assets/export/${format}`, {
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
            a.download = `activos_exportados.${format}`;
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
            key: "move",
            label: "Mover",
            color: "primary",
            icon: <MoveUpRoundedIcon fontSize="small" />,
            onClick: handleBulkMove,
        },
        {
            key: "delete",
            label: "Eliminar",
            color: "danger",
            icon: <DeleteIcon />,
            onClick: handleBulkDelete,
        }
    ];

    return (
        <div className="space-y-4 p-4 md:p-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestión de Activos</h1>
            <GenericTable<IAssetAPI>
                data={assets}
                columns={columnDefinitions}
                renderCell={renderCell}
                isLoading={isLoading}
                statusOptions={statusOptions}
                initialVisibleColumns={INITIAL_DEFAULT_VISIBLE_COLUMNS}
                entityName="Activos"
                onAdd={() => router.push('/dashboard/assets/add')}
                onExport={handleExport}
                enableDateFilter={true}
                statusColorMap={statusColorMap}
                bulkActions={bulkActions}
            />

            <BulkMovementModal
                isOpen={isBulkMoveModalOpen}
                onClose={() => setIsBulkMoveModalOpen(false)}
                assetIds={selectedAssetIds}
                onSuccess={handleBulkMoveSuccess}
            />
        </div>
    );
}