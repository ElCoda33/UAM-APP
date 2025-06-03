// UAM-APP/components/assetList/assetList.tsx
'use client'

import React, { useEffect, useState, useMemo, Key, useCallback } from 'react';
import {
    Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
    Input, Button, DropdownTrigger, Dropdown, DropdownMenu, DropdownItem,
    Chip, User as NextUIUser, Pagination, Selection, ChipProps, Spinner, // Renombrado User a NextUIUser para claridad
    SortDescriptor, Select, SelectItem,
    DatePicker, Tooltip
} from "@heroui/react";
import { DateValue } from "@internationalized/date";
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

// Icons (asumiendo que existen en estas rutas o equivalentes)
import { PlusIcon } from '@/components/icons/PlusIcon';
import { SearchIcon } from '@/components/icons/SearchIcon';
import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';
import { DownloadIcon } from '@/components/icons/DownloadIcon';
import { EditIcon } from '@/components/icons/EditIcon';
import { EyeIcon } from '@/components/icons/EyeIcon'; // Asumiendo que quieres un ícono de "ver" para el historial
import MoveUpRoundedIcon from '@mui/icons-material/MoveUpRounded';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';


import { columns as columnDefinitions, statusOptions } from '../../../../components/assetList/data';
import { capitalize } from '../../../../components/assetList/utils';
import { IAssetAPI } from '@/lib/schema';

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
    console.warn(`No se pudo parsear la cadena de fecha desde la API: '${dateStr}'`);
    return null;
}

const dateValueToYYYYMMDD = (dateValue: DateValue | null): string | null => {
    if (!dateValue) return null;
    return `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
};

const INITIAL_DEFAULT_VISIBLE_COLUMNS = [
    'product_name', 'serial_number', 'inventory_code', 'current_section_name', 'status', 'actions',
];

export default function AssetList() {
    const [assets, setAssets] = useState<IAssetAPI[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const [filterSearchText, setFilterSearchText] = useState('');
    const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
    const [statusFilter, setStatusFilter] = useState<Selection>('all');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'product_name', direction: 'ascending' });
    const [page, setPage] = useState(1);

    const [isExportingCsv, setIsExportingCsv] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const filterableAttributes = useMemo(() => columnDefinitions.filter(col => col.filterable), []);
    const [selectedFilterAttribute, setSelectedFilterAttribute] = useState<Key>(
        filterableAttributes.find(col => col.uid === 'product_name')?.uid ||
        (filterableAttributes.length > 0 ? filterableAttributes[0].uid : "")
    );
    const selectedColumnMeta = useMemo(() => {
        return columnDefinitions.find(col => col.uid === selectedFilterAttribute);
    }, [selectedFilterAttribute]);

    const [dateRangeFilter, setDateRangeFilter] = useState<{ from: DateValue | null; to: DateValue | null }>({
        from: null, to: null,
    });

    const ALWAYS_VISIBLE_COL_UIDS = useMemo(() =>
        columnDefinitions
            .filter(col => col.uid === 'actions') // 'actions' es la única siempre visible por definición en users/page
            .map(col => col.uid as Key)
        , []);

    const TOGGLEABLE_COLUMNS = useMemo(() =>
        columnDefinitions.filter(col => !ALWAYS_VISIBLE_COL_UIDS.includes(col.uid as Key))
        , [ALWAYS_VISIBLE_COL_UIDS, columnDefinitions]);

    const [selectedToggleableUIDs, setSelectedToggleableUIDs] = useState<Set<Key>>(
        new Set(TOGGLEABLE_COLUMNS.filter(col => INITIAL_DEFAULT_VISIBLE_COLUMNS.includes(col.uid)).map(col => col.uid as Key))
    );

    const finalVisibleColumnUIDs = useMemo(() => {
        const visible = new Set(selectedToggleableUIDs);
        ALWAYS_VISIBLE_COL_UIDS.forEach(uid => visible.add(uid));
        return visible;
    }, [selectedToggleableUIDs, ALWAYS_VISIBLE_COL_UIDS]);

    const currentTableColumns = useMemo(() => {
        return columnDefinitions.filter(col => finalVisibleColumnUIDs.has(col.uid as Key));
    }, [finalVisibleColumnUIDs, columnDefinitions]);


    useEffect(() => {
        const fetchAssetsFromAPI = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/assets'); //
                if (!response.ok) throw new Error('Error al obtener los activos');
                const data: IAssetAPI[] = await response.json();
                setAssets(data);
            } catch (err) { console.error(err); toast.error((err as Error).message || "Error cargando activos.") }
            finally { setIsLoading(false); }
        };
        fetchAssetsFromAPI();
    }, []);

    const hasSearchTextFilter = Boolean(filterSearchText.trim());
    const hasDateRangeFilter = Boolean(dateRangeFilter.from || dateRangeFilter.to);

    const filteredItems = useMemo(() => {
        let filteredAssets = [...assets];
        const attributeKey = selectedFilterAttribute as keyof IAssetAPI;

        if (selectedFilterAttribute) {
            if (selectedColumnMeta?.type === 'date' && hasDateRangeFilter) {
                filteredAssets = filteredAssets.filter(asset => {
                    const assetDateStr = asset[attributeKey] as string | null;
                    if (!assetDateStr) return false;
                    const assetDate = parseApiDateStringToDate(assetDateStr);
                    if (!assetDate) return false;
                    let inRange = true;
                    if (dateRangeFilter.from) {
                        const fromDate = new Date(Date.UTC(dateRangeFilter.from.year, dateRangeFilter.from.month - 1, dateRangeFilter.from.day));
                        if (assetDate.getTime() < fromDate.getTime()) inRange = false;
                    }
                    if (dateRangeFilter.to && inRange) {
                        const nextDayAfterTo = new Date(Date.UTC(dateRangeFilter.to.year, dateRangeFilter.to.month - 1, dateRangeFilter.to.day + 1));
                        if (assetDate.getTime() >= nextDayAfterTo.getTime()) inRange = false;
                    }
                    return inRange;
                });
            } else if (selectedColumnMeta?.type !== 'date' && hasSearchTextFilter) {
                const searchTerm = filterSearchText.toLowerCase();
                filteredAssets = filteredAssets.filter((asset) => {
                    if (attributeKey === 'status') {
                        const statusDisplay = asset.status ? asset.status.replace(/_/g, " ") : "";
                        const rawStatus = asset.status || "";
                        return statusDisplay.toLowerCase().includes(searchTerm) || rawStatus.toLowerCase().includes(searchTerm);
                    }
                    return String(asset[attributeKey] ?? "").toLowerCase().includes(searchTerm);
                });
            }
        }

        if (statusFilter !== 'all' && Array.from(statusFilter).length !== statusOptions.length) {
            const selectedStatuses = Array.from(statusFilter);
            filteredAssets = filteredAssets.filter((asset) =>
                asset.status && selectedStatuses.includes(asset.status)
            );
        }
        return filteredAssets;
    }, [assets, filterSearchText, selectedFilterAttribute, selectedColumnMeta, statusFilter, hasSearchTextFilter, dateRangeFilter, hasDateRangeFilter]);

    const pages = Math.ceil(filteredItems.length / rowsPerPage);

    const itemsToDisplay = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return filteredItems.slice(start, end);
    }, [page, filteredItems, rowsPerPage]);

    const sortedItems = useMemo(() => {
        return [...itemsToDisplay].sort((a, b) => {
            let firstValue: any, secondValue: any;
            const col = sortDescriptor.column as keyof IAssetAPI;
            switch (col) {
                case 'purchase_date': case 'warranty_expiry_date': case 'created_at': case 'updated_at':
                    firstValue = parseApiDateStringToDate(a[col] as string | null);
                    secondValue = parseApiDateStringToDate(b[col] as string | null);
                    break;
                default: firstValue = a[col]; secondValue = b[col];
            }
            let cmp: number;
            if (firstValue === null || firstValue === undefined) cmp = -1;
            else if (secondValue === null || secondValue === undefined) cmp = 1;
            else if (firstValue instanceof Date && secondValue instanceof Date) cmp = firstValue.getTime() - secondValue.getTime();
            else if (typeof firstValue === 'number' && typeof secondValue === 'number') cmp = firstValue - secondValue;
            else cmp = String(firstValue).toLowerCase().localeCompare(String(secondValue).toLowerCase());
            return sortDescriptor.direction === 'descending' ? -cmp : cmp;
        });
    }, [sortDescriptor, itemsToDisplay]);

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
                    <div className="relative flex items-center gap-1.5 sm:gap-2"> {/* Ajustado gap */}
                        <Tooltip content="Editar Activo">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/assets/${asset.id}/edit`)}>
                                <EditIcon className="text-lg text-default-400" /> {/* Ajustado clase de color */}
                            </Button>
                        </Tooltip>
                        <Tooltip content="Mover Activo">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/assets/${asset.id}/move`)}>
                                <MoveUpRoundedIcon fontSize="small" className="text-lg text-default-400" /> {/* Ajustado clase de color */}
                            </Button>
                        </Tooltip>
                        <Tooltip content="Historial de Movimientos">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/assets/${asset.id}/history`)}>
                                <FormatListBulletedIcon fontSize="small" className="text-lg text-default-400" /> {/* Ajustado clase de color */}
                            </Button>
                        </Tooltip>
                    </div>
                );
            default:
                return cellValue !== null && cellValue !== undefined ? String(cellValue) : "N/A";
        }
    }, [router]);

    const onPageChange = useCallback((page: number) => setPage(page), []);
    const onRowsPerPageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => { setRowsPerPage(Number(e.target.value)); setPage(1); }, []);
    const onSearchTextChange = useCallback((value?: string) => { setFilterSearchText(value || ""); setPage(1); }, []);
    const onClearSearchOrDate = useCallback(() => {
        setFilterSearchText("");
        setDateRangeFilter({ from: null, to: null });
        setPage(1);
    }, []);

    const handleExport = async (format: 'csv' | 'pdf') => {
        const exportToastId = toast.loading(`Exportando a ${format.toUpperCase()}...`);
        if (format === 'csv') setIsExportingCsv(true);
        if (format === 'pdf') setIsExportingPdf(true);

        const columnsToExportDetails = currentTableColumns.filter(col => col.uid !== 'actions');
        const payload = {
            filters: {
                searchText: selectedColumnMeta?.type === 'date' ? undefined : filterSearchText,
                searchAttribute: selectedFilterAttribute,
                status: statusFilter === 'all' ? null : Array.from(statusFilter),
                purchaseDateFrom: selectedColumnMeta?.type === 'date' && selectedFilterAttribute === 'purchase_date' ? dateValueToYYYYMMDD(dateRangeFilter.from) : undefined,
                purchaseDateTo: selectedColumnMeta?.type === 'date' && selectedFilterAttribute === 'purchase_date' ? dateValueToYYYYMMDD(dateRangeFilter.to) : undefined,
                warrantyExpiryDateFrom: selectedColumnMeta?.type === 'date' && selectedFilterAttribute === 'warranty_expiry_date' ? dateValueToYYYYMMDD(dateRangeFilter.from) : undefined,
                warrantyExpiryDateTo: selectedColumnMeta?.type === 'date' && selectedFilterAttribute === 'warranty_expiry_date' ? dateValueToYYYYMMDD(dateRangeFilter.to) : undefined,
            },
            sort: { column: sortDescriptor.column, direction: sortDescriptor.direction, },
            columns: columnsToExportDetails.map(col => ({ uid: col.uid, name: col.name }))
        };

        try {
            const response = await fetch(`/api/assets/export/${format}`, { //
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Error al exportar a ${format.toUpperCase()}` }));
                throw new Error(errorData.message);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `activos_exportados_${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success(`Exportación a ${format.toUpperCase()} completada.`, { id: exportToastId });
        } catch (error: any) {
            toast.error(error.message || `No se pudo exportar a ${format.toUpperCase()}.`, { id: exportToastId });
            console.error(`Error exporting to ${format}:`, error);
        } finally {
            if (format === 'csv') setIsExportingCsv(false);
            if (format === 'pdf') setIsExportingPdf(false);
        }
    };

    const topContent = useMemo(() => {
        return (
            <div className="flex flex-col gap-4">
                {/* Primera fila de controles: Filtro principal y botones de acción */}
                <div className="flex flex-col sm:flex-row justify-between items-end gap-3">
                    <div className="flex flex-col xs:flex-row items-end gap-3 w-full sm:w-auto flex-grow-[2] sm:flex-grow-0"> {/* Flex-grow para que ocupen espacio */}
                        <Select
                            aria-label="Filtrar por atributo"
                            placeholder="Buscar por..."
                            className="w-full xs:w-auto xs:min-w-[180px] md:max-w-xs"
                            selectedKeys={selectedFilterAttribute ? [selectedFilterAttribute] : []}
                            onSelectionChange={(keys) => {
                                const newKey = Array.from(keys as Set<Key>)[0];
                                setSelectedFilterAttribute(newKey || (filterableAttributes.length > 0 ? filterableAttributes[0].uid : ""));
                                const newColumn = columnDefinitions.find(col => col.uid === newKey);
                                if (newColumn?.type === 'date') setFilterSearchText(""); else setDateRangeFilter({ from: null, to: null });
                                setPage(1);
                            }}
                            size="md"
                        >
                            {filterableAttributes.map(col => (
                                <SelectItem key={col.uid} value={col.uid} textValue={col.name}>{col.name}</SelectItem>
                            ))}
                        </Select>
                        {selectedColumnMeta?.type === 'date' ? (
                            <div className="flex flex-col xs:flex-row gap-3 w-full xs:w-auto">
                                <DatePicker label="Desde" aria-label="Fecha desde" value={dateRangeFilter.from} onChange={(date) => setDateRangeFilter(prev => ({ ...prev, from: date }))} maxValue={dateRangeFilter.to || undefined} className="w-full xs:w-auto" size="sm" granularity="day" showMonthAndYearPickers isClearable onClear={() => setDateRangeFilter(prev => ({ ...prev, from: null }))} />
                                <DatePicker label="Hasta" aria-label="Fecha hasta" value={dateRangeFilter.to} onChange={(date) => setDateRangeFilter(prev => ({ ...prev, to: date }))} minValue={dateRangeFilter.from || undefined} className="w-full xs:w-auto" size="sm" granularity="day" showMonthAndYearPickers isClearable onClear={() => setDateRangeFilter(prev => ({ ...prev, to: null }))} />
                            </div>
                        ) : (
                            <Input
                                isClearable
                                className="w-full xs:w-auto xs:flex-grow" // flex-grow para que tome espacio
                                placeholder={`Buscar en "${selectedColumnMeta?.name || 'atributo'}"...`}
                                startContent={<SearchIcon className="text-default-400 pointer-events-none flex-shrink-0" />}
                                value={filterSearchText}
                                onClear={onClearSearchOrDate}
                                onValueChange={onSearchTextChange}
                                disabled={!selectedFilterAttribute}
                                size="md"
                            />
                        )}
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto justify-end sm:justify-start"> {/* Botones de acción a la derecha */}
                        <Dropdown>
                            <DropdownTrigger>
                                <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">Estado</Button>
                            </DropdownTrigger>
                            <DropdownMenu disallowEmptySelection aria-label="Filtrar por Estado" closeOnSelect={false} selectedKeys={statusFilter} selectionMode="multiple" onSelectionChange={setStatusFilter}>
                                {statusOptions.map((status) => <DropdownItem key={status.uid} className="capitalize">{capitalize(status.name)}</DropdownItem>)}
                            </DropdownMenu>
                        </Dropdown>
                        <Dropdown>
                            <DropdownTrigger>
                                <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">Columnas</Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                disallowEmptySelection aria-label="Seleccionar Columnas Visibles" closeOnSelect={false}
                                selectedKeys={selectedToggleableUIDs} selectionMode="multiple"
                                onSelectionChange={(keys) => setSelectedToggleableUIDs(new Set(keys as Set<Key>))}
                            >
                                {TOGGLEABLE_COLUMNS.map((column) => <DropdownItem key={column.uid} className="capitalize">{capitalize(column.name)}</DropdownItem>)}
                            </DropdownMenu>
                        </Dropdown>
                        <Button color="primary" endContent={<PlusIcon />} onClick={() => router.push('/dashboard/assets/add')}>Agregar Activo</Button>
                    </div>
                </div>
                {/* Segunda fila de controles: Información y controles menores */}
                <div className="flex flex-col sm:flex-row justify-between items-center mt-2 gap-3">
                    <span className="text-default-500 text-small self-start sm:self-center">
                        Total {assets.length} activos. {filteredItems.length !== assets.length ? `${filteredItems.length} coinciden con el filtro.` : ''}
                    </span>
                    <div className="flex gap-2 items-center flex-wrap justify-end sm:justify-start w-full sm:w-auto">
                        <Button size="sm" variant="flat" onPress={() => handleExport('csv')} isLoading={isExportingCsv} startContent={!isExportingCsv ? <DownloadIcon /> : null} className="min-w-max">
                            Exportar CSV
                        </Button>
                        <Button size="sm" variant="flat" onPress={() => handleExport('pdf')} isLoading={isExportingPdf} startContent={!isExportingPdf ? <DownloadIcon /> : null} className="min-w-max">
                            Exportar PDF
                        </Button>
                        <label className="flex items-center text-default-500 text-small whitespace-nowrap">
                            Filas por página:
                            <select className="bg-transparent outline-none text-default-500 text-small ml-1" onChange={onRowsPerPageChange} value={rowsPerPage}>
                                {[10, 15, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}
                            </select>
                        </label>
                    </div>
                </div>
            </div>
        );
    }, [
        filterSearchText, statusFilter, selectedToggleableUIDs, TOGGLEABLE_COLUMNS, filterableAttributes,
        onSearchTextChange, onRowsPerPageChange, assets.length, router,
        onClearSearchOrDate, filteredItems.length, rowsPerPage, selectedFilterAttribute,
        dateRangeFilter, selectedColumnMeta, isExportingCsv, isExportingPdf, currentTableColumns
    ]);

    const bottomContent = useMemo(() => {
        return (
            <div className="py-2 px-2 flex justify-between items-center">
                <span className="w-[30%] text-small text-default-400 hidden sm:block">
                    {selectedKeys === "all"
                        ? "Todos los items seleccionados"
                        : `${selectedKeys.size} de ${itemsToDisplay.length > 0 ? filteredItems.length : 0} seleccionados`}
                </span>
                <Pagination
                    isCompact showControls showShadow color="primary"
                    page={page} total={pages} onChange={onPageChange}
                    className={itemsToDisplay.length === 0 ? 'invisible' : ''}
                />
                <div className="hidden sm:flex w-[30%] justify-end gap-2">
                    <Button isDisabled={pages === 1 || page <= 1} size="sm" variant="flat" onPress={() => onPageChange(page - 1)}>Anterior</Button>
                    <Button isDisabled={pages === 1 || page >= pages} size="sm" variant="flat" onPress={() => onPageChange(page + 1)}>Siguiente</Button>
                </div>
            </div>
        );
    }, [selectedKeys, itemsToDisplay.length, page, pages, filteredItems.length, onPageChange]);

    if (isLoading && assets.length === 0) {
        return (<div className="flex justify-center items-center h-[calc(100vh-200px)]"> <Spinner label="Cargando activos..." color="primary" labelColor="primary" size="lg" /> </div>);
    }

    return (
        <div className="space-y-4 p-4 md:p-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestión de Activos</h1>
            {topContent}
            <div className="overflow-x-auto w-full shadow-md sm:rounded-lg">
                <Table
                    isHeaderSticky aria-label="Tabla de Activos"
                    bottomContent={pages > 0 && itemsToDisplay.length > 0 ? bottomContent : null}

                    selectedKeys={selectedKeys} selectionMode="multiple"
                    sortDescriptor={sortDescriptor} onSelectionChange={setSelectedKeys} onSortChange={setSortDescriptor}
                // Ajusta min-w según tus columnas
                >
                    <TableHeader columns={currentTableColumns}>
                        {(column) => (
                            <TableColumn
                                key={column.uid}
                                align={column.uid === 'actions' ? 'center' : 'start'}
                                allowsSorting={column.sortable}
                                className="py-3 px-4 bg-default-100 text-left text-xs font-medium text-default-600 uppercase tracking-wider whitespace-nowrap"
                            >{column.name}</TableColumn>
                        )}
                    </TableHeader>
                    <TableBody
                        items={sortedItems}
                        isLoading={isLoading && itemsToDisplay.length > 0}
                        loadingContent={<Spinner label="Actualizando..." />}
                        emptyContent={assets.length === 0 && !isLoading ? "No hay activos para mostrar." : "Ningún activo coincide con los filtros."}
                    >
                        {(item) => (
                            <TableRow key={item.id} className="hover:bg-default-50 transition-colors">
                                {(columnKey) => (<TableCell className="py-2 px-4 whitespace-nowrap text-sm">{renderCell(item, columnKey)}</TableCell>)}
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}