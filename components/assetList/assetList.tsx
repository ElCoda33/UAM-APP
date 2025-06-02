// components/assetList/assetList.tsx
'use client'

import React, { useEffect, useState, useMemo, Key, useCallback } from 'react';
import {
    Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
    Input, Button, DropdownTrigger, Dropdown, DropdownMenu, DropdownItem,
    Chip, User, Pagination, Selection, ChipProps, Spinner,
    SortDescriptor, Select, SelectItem,
    DatePicker
} from "@heroui/react";
import { DateValue, parseDate } from "@internationalized/date"; // Import parseDate
import { useRouter } from 'next/navigation';
import MoveUpRoundedIcon from '@mui/icons-material/MoveUpRounded';
import BorderColorRoundedIcon from '@mui/icons-material/BorderColorRounded';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import { toast } from 'react-hot-toast';

import { PlusIcon } from '../icons/PlusIcon';
import { VerticalDotsIcon } from '../icons/VerticalDotsIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { ChevronDownIcon } from '../icons/ChevronDownlcon';
import { DownloadIcon } from '@/components/icons/DownloadIcon'; // Asegúrate que este ícono exista o créalo

import { columns as columnDefinitions, statusOptions } from './data'; // Renombrado para claridad
import { capitalize } from './utils';

// Interfaz del activo como viene de la API (asegúrate que coincida con tu API)
interface IAssetFromAPI {
    id: number; serial_number: string | null; inventory_code: string; description: string | null; product_name: string; warranty_expiry_date: string | null; current_section_id: number | null; current_section_name: string | null; current_location_id: number | null; current_location_name: string | null; supplier_company_id: number | null; supplier_company_name: string | null; supplier_company_tax_id: string | null; purchase_date: string | null; invoice_number: string | null; acquisition_procedure: string | null; status: 'in_use' | 'in_storage' | 'under_repair' | 'disposed' | 'lost' | null; image_url: string | null; created_at: string; updated_at: string;
}
const statusColorMap: Record<string, ChipProps['color']> = {
    in_use: 'success', in_storage: 'warning', under_repair: 'secondary', disposed: 'danger', lost: 'default',
};

// Helper para convertir fechas, ajustado para aceptar string y retornar Date o null
function parseApiDateStringToDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === "") return null;
    // Primero intenta con el formato YYYY-MM-DD exacto para DatePicker
    const simpleDateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (simpleDateMatch) {
        const year = parseInt(simpleDateMatch[1], 10);
        const month = parseInt(simpleDateMatch[2], 10) - 1; // Meses en Date son 0-indexados
        const day = parseInt(simpleDateMatch[3], 10);
        // Crear como UTC para evitar problemas de timezone al convertir a local
        const dateObj = new Date(Date.UTC(year, month, day));
        if (!isNaN(dateObj.getTime())) return dateObj;
    }
    // Fallback para otros formatos que Date.parse pueda entender (ej. ISO string completo)
    const fallbackDate = new Date(dateStr);
    if (!isNaN(fallbackDate.getTime())) return fallbackDate;

    console.warn(`No se pudo parsear la cadena de fecha desde la API: '${dateStr}'`);
    return null;
}


const INITIAL_VISIBLE_COLUMNS = [
    'product_name', 'serial_number', 'inventory_code', 'current_section_name', 'status',
    'actions',
];

// Helper para convertir DateValue a string YYYY-MM-DD
const dateValueToYYYYMMDD = (dateValue: DateValue | null): string | null => {
    if (!dateValue) return null;
    return `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
};


export default function AssetList() {
    const [assets, setAssets] = useState<IAssetFromAPI[]>([]);
    const [filterValue, setFilterValue] = useState('');
    const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
    const [visibleColumns, setVisibleColumns] = useState<Selection>(new Set(INITIAL_VISIBLE_COLUMNS));
    const [statusFilter, setStatusFilter] = useState<Selection>('all');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'product_name', direction: 'ascending' });
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const [isExportingCsv, setIsExportingCsv] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const filterableColumns = useMemo(() => columnDefinitions.filter(col => col.filterable), []);
    const [selectedFilterAttribute, setSelectedFilterAttribute] = useState<Key>(
        filterableColumns.find(col => col.uid === 'product_name')?.uid ||
        (filterableColumns.length > 0 ? filterableColumns[0].uid : "")
    );

    const [dateRangeFilter, setDateRangeFilter] = useState<{ from: DateValue | null; to: DateValue | null }>({
        from: null,
        to: null,
    });

    const selectedColumnMeta = useMemo(() => {
        return columnDefinitions.find(col => col.uid === selectedFilterAttribute);
    }, [selectedFilterAttribute]);

    useEffect(() => {
        const fetchAssetsFromAPI = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/assets');
                if (!response.ok) throw new Error('Error al obtener los activos');
                const data: IAssetFromAPI[] = await response.json();
                setAssets(data);
            } catch (err) { console.error(err); toast.error((err as Error).message || "Error cargando activos.") }
            finally { setIsLoading(false); }
        };
        fetchAssetsFromAPI();
    }, []);

    const hasSearchTextFilter = Boolean(filterValue.trim());
    const hasDateRangeFilter = Boolean(dateRangeFilter.from || dateRangeFilter.to);

    const headerColumns = useMemo(() => {
        if (visibleColumns === 'all') return columnDefinitions;
        return columnDefinitions.filter((column) => Array.from(visibleColumns).includes(column.uid));
    }, [visibleColumns]);

    const filteredItems = useMemo(() => {
        let filteredAssets = [...assets];
        if (selectedFilterAttribute) {
            const columnType = columnDefinitions.find(col => col.uid === selectedFilterAttribute)?.type;
            if (columnType === 'date' && hasDateRangeFilter) {
                filteredAssets = filteredAssets.filter(asset => {
                    const assetDateStr = asset[selectedFilterAttribute as keyof IAssetFromAPI] as string | null;
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
            } else if (columnType !== 'date' && hasSearchTextFilter) {
                const searchTerm = filterValue.toLowerCase();
                filteredAssets = filteredAssets.filter((asset) => {
                    let attributeValue: any = asset[selectedFilterAttribute as keyof IAssetFromAPI];
                    if (selectedFilterAttribute === 'status') {
                        const statusDisplay = asset.status ? asset.status.replace(/_/g, " ") : "";
                        const rawStatus = asset.status || "";
                        return statusDisplay.toLowerCase().includes(searchTerm) || rawStatus.toLowerCase().includes(searchTerm);
                    }
                    return String(attributeValue ?? "").toLowerCase().includes(searchTerm);
                });
            }
        }
        if (statusFilter !== 'all' && Array.from(statusFilter).length !== statusOptions.length) {
            filteredAssets = filteredAssets.filter((asset) =>
                Array.from(statusFilter).includes(asset.status!)
            );
        }
        return filteredAssets;
    }, [assets, filterValue, selectedFilterAttribute, statusFilter, hasSearchTextFilter, dateRangeFilter, hasDateRangeFilter]);

    const pages = Math.ceil(filteredItems.length / rowsPerPage);
    const itemsToDisplay = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return filteredItems.slice(start, end);
    }, [page, filteredItems, rowsPerPage]);

    const sortedItems = useMemo(() => {
        return [...itemsToDisplay].sort((a, b) => {
            let firstValue: any, secondValue: any;
            const col = sortDescriptor.column as keyof IAssetFromAPI;
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

    const renderCell = useCallback((asset: IAssetFromAPI, columnKey: Key): React.ReactNode => {
        const cellValue = asset[columnKey as keyof IAssetFromAPI];
        const handleUpdate = () => router.push(`/dashboard/assets/${asset.id}/edit`);
        const handleMove = () => router.push(`/dashboard/assets/${asset.id}/move`);
        const handleMovements = () => router.push(`/dashboard/assets/${asset.id}/history`);

        switch (columnKey) {
            case 'product_name':
                return <User avatarProps={{ radius: 'sm', src: asset.image_url || undefined }} description={asset.serial_number || asset.inventory_code} name={cellValue as string}>{asset.product_name}</User>;
            case 'status':
                return <Chip className="capitalize" color={statusColorMap[asset.status!] || 'default'} size="sm" variant="flat">{asset.status ? asset.status.replace(/_/g, " ") : "N/A"}</Chip>;
            case 'purchase_date': case 'warranty_expiry_date':
                const date = parseApiDateStringToDate(cellValue as string | null);
                return date ? date.toLocaleDateString('es-UY', { timeZone: 'UTC' }) : "N/A"; // es-UY para formato DD/MM/YYYY
            case 'actions':
                return (
                    <div className="relative flex justify-end items-center gap-2">
                        <Dropdown><DropdownTrigger><Button isIconOnly size="sm" variant="light"><VerticalDotsIcon className="text-default-300" /></Button></DropdownTrigger>
                            <DropdownMenu aria-label={`Acciones para ${asset.product_name}`}>
                                <DropdownItem startContent={<BorderColorRoundedIcon fontSize="small" />} onPress={handleUpdate}>Editar</DropdownItem>
                                <DropdownItem startContent={<MoveUpRoundedIcon fontSize="small" />} onPress={handleMove}>Mover</DropdownItem>
                                <DropdownItem startContent={<FormatListBulletedIcon fontSize="small" />} onPress={handleMovements}>Movimientos</DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                );
            default:
                return cellValue !== null && cellValue !== undefined ? String(cellValue) : "N/A";
        }
    }, [router]);

    const onNextPage = useCallback(() => { if (page < pages) setPage(page + 1); }, [page, pages]);
    const onPreviousPage = useCallback(() => { if (page > 1) setPage(page - 1); }, [page]);
    const onRowsPerPageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => { setRowsPerPage(Number(e.target.value)); setPage(1); }, []);
    const onSearchChange = useCallback((value?: string) => { setFilterValue(value || ""); setPage(1); }, []);
    const onClearSearchOrDate = useCallback(() => { setFilterValue(""); setDateRangeFilter({ from: null, to: null }); setPage(1); }, []);

    const handleExport = async (format: 'csv' | 'pdf') => {
        const exportToastId = toast.loading(`Exportando a ${format.toUpperCase()}...`);
        if (format === 'csv') setIsExportingCsv(true);
        if (format === 'pdf') setIsExportingPdf(true);

        const columnsToExportDetails = headerColumns.filter(col => col.uid !== 'actions');

        const payload = {
            filters: {
                searchText: filterValue,
                searchAttribute: selectedFilterAttribute,
                status: statusFilter === 'all' ? null : Array.from(statusFilter),
                purchaseDateFrom: dateValueToYYYYMMDD(dateRangeFilter.from),
                purchaseDateTo: dateValueToYYYYMMDD(dateRangeFilter.to),
                // Podrías añadir más filtros si el backend los soporta
            },
            sort: {
                column: sortDescriptor.column,
                direction: sortDescriptor.direction,
            },
            columns: columnsToExportDetails.map(col => ({ uid: col.uid, name: col.name }))
        };

        try {
            const response = await fetch(`/api/assets/export/${format}`, {
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
                <div className="flex flex-col sm:flex-row justify-between gap-3 items-end">
                    <div className="flex flex-col xs:flex-row gap-3 w-full xs:w-auto items-end flex-grow md:flex-grow-0">
                        <Select
                            aria-label="Filtrar por atributo" placeholder="Buscar por..."
                            className="w-full xs:w-auto xs:min-w-[200px] md:max-w-xs"
                            selectedKeys={selectedFilterAttribute ? [selectedFilterAttribute] : []}
                            onSelectionChange={(keys) => {
                                const newKey = Array.from(keys as Set<Key>)[0];
                                setSelectedFilterAttribute(newKey || (filterableColumns.length > 0 ? filterableColumns[0].uid : ""));
                                const newColumn = columnDefinitions.find(col => col.uid === newKey);
                                if (newColumn?.type === 'date') setFilterValue(""); else setDateRangeFilter({ from: null, to: null });
                                setPage(1);
                            }}
                            size="md"
                        >
                            {filterableColumns.map(col => (
                                <SelectItem key={col.uid} value={col.uid} textValue={col.name}>{col.name}</SelectItem>
                            ))}
                        </Select>
                        {selectedColumnMeta?.type === 'date' ? (
                            <div className="flex flex-col xs:flex-row gap-3 w-full xs:w-auto">
                                <DatePicker label="Desde" value={dateRangeFilter.from} onChange={(date) => setDateRangeFilter(prev => ({ ...prev, from: date }))} maxValue={dateRangeFilter.to || undefined} className="w-full xs:w-auto" size="sm" granularity="day" showMonthAndYearPickers />
                                <DatePicker label="Hasta" value={dateRangeFilter.to} onChange={(date) => setDateRangeFilter(prev => ({ ...prev, to: date }))} minValue={dateRangeFilter.from || undefined} className="w-full xs:w-auto" size="sm" granularity="day" showMonthAndYearPickers />
                            </div>
                        ) : (
                            <Input isClearable className="w-full xs:w-auto xs:flex-grow" placeholder={`Buscar en "${selectedColumnMeta?.name || 'atributo'}"...`} startContent={<SearchIcon />} value={filterValue} onClear={onClearSearchOrDate} onValueChange={onSearchChange} disabled={!selectedFilterAttribute} size="md" />
                        )}
                    </div>
                    <div className="flex gap-3 flex-wrap justify-end sm:justify-start w-full sm:w-auto">
                        <Dropdown>
                            <DropdownTrigger><Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">Estado</Button></DropdownTrigger>
                            <DropdownMenu disallowEmptySelection aria-label="Filtrar por Estado" closeOnSelect={false} selectedKeys={statusFilter} selectionMode="multiple" onSelectionChange={setStatusFilter}>
                                {statusOptions.map((status) => <DropdownItem key={status.uid} className="capitalize">{capitalize(status.name)}</DropdownItem>)}
                            </DropdownMenu>
                        </Dropdown>
                        <Dropdown>
                            <DropdownTrigger><Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">Columnas</Button></DropdownTrigger>
                            <DropdownMenu disallowEmptySelection aria-label="Seleccionar Columnas Visibles" closeOnSelect={false} selectedKeys={visibleColumns} selectionMode="multiple" onSelectionChange={setVisibleColumns}>
                                {columnDefinitions.map((column) => <DropdownItem key={column.uid} className="capitalize">{capitalize(column.name)}</DropdownItem>)}
                            </DropdownMenu>
                        </Dropdown>
                        <Button color="primary" endContent={<PlusIcon />} onClick={() => router.push('/dashboard/assets/add')}>Agregar Activo</Button>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-2">
                    <span className="text-default-400 text-small">Total {assets.length} activos. {filteredItems.length !== assets.length ? `${filteredItems.length} coinciden.` : ''}</span>
                    <div className="flex gap-2 items-center">
                        <Button size="sm" variant="flat" onPress={() => handleExport('csv')} isLoading={isExportingCsv} startContent={!isExportingCsv ? <DownloadIcon /> : null}>
                            Exportar CSV
                        </Button>
                        <Button size="sm" variant="flat" onPress={() => handleExport('pdf')} isLoading={isExportingPdf} startContent={!isExportingPdf ? <DownloadIcon /> : null}>
                            Exportar PDF
                        </Button>
                        <label className="flex items-center text-default-400 text-small">Filas:
                            <select className="bg-transparent outline-none text-default-400 text-small" onChange={onRowsPerPageChange} value={rowsPerPage}>
                                <option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="25">25</option>
                            </select>
                        </label>
                    </div>
                </div>
            </div>
        );
    }, [
        filterValue, statusFilter, visibleColumns, onSearchChange, onRowsPerPageChange, assets.length, router,
        onClearSearchOrDate, filteredItems.length, rowsPerPage, selectedFilterAttribute, filterableColumns,
        dateRangeFilter, selectedColumnMeta, isExportingCsv, isExportingPdf, headerColumns
    ]);

    const bottomContent = useMemo(() => {
        return (
            <div className="py-2 px-2 flex justify-between items-center">
                <span className="w-[30%] text-small text-default-400">{selectedKeys === 'all' ? 'Todos seleccionados' : `${selectedKeys.size} de ${filteredItems.length} seleccionados`}</span>
                <Pagination isCompact showControls showShadow color="primary" page={page} total={pages} onChange={setPage} />
                <div className="hidden sm:flex w-[30%] justify-end gap-2">
                    <Button isDisabled={page <= 1} size="sm" variant="flat" onPress={onPreviousPage}>Anterior</Button>
                    <Button isDisabled={page >= pages} size="sm" variant="flat" onPress={onNextPage}>Siguiente</Button>
                </div>
            </div>
        );
    }, [selectedKeys, page, pages, filteredItems.length, onPreviousPage, onNextPage]);

    return (
        <div className="flex flex-col gap-4">
            {topContent}
            <div className="overflow-x-auto w-full shadow-md sm:rounded-lg border border-default-200">
                <Table
                    isHeaderSticky aria-label="Tabla de Activos"
                    bottomContent={bottomContent} bottomContentPlacement="outside"
                    selectedKeys={selectedKeys} selectionMode="multiple"
                    sortDescriptor={sortDescriptor} onSelectionChange={setSelectedKeys} onSortChange={setSortDescriptor}
                    classNames={{ table: "min-w-[700px]" }}
                >
                    <TableHeader columns={headerColumns}>
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
                        items={sortedItems} isLoading={isLoading}
                        loadingContent={<Spinner label="Cargando activos..." />}
                        emptyContent={assets.length === 0 && !isLoading ? "No hay activos para mostrar." : "Ningún activo coincide con los filtros."}
                    >
                        {(item) => (
                            <TableRow key={item.id} className="hover:bg-default-50 transition-colors">
                                {(columnKey) => (<TableCell className="py-3 px-4 whitespace-nowrap text-sm">{renderCell(item, columnKey)}</TableCell>)}
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}