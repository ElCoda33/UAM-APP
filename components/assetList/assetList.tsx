// components/assetList/assetList.tsx
'use client'

import React, { useEffect, useState, useMemo, Key, useCallback } from 'react';
import {
    Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
    Input, Button, DropdownTrigger, Dropdown, DropdownMenu, DropdownItem,
    Chip, User, Pagination, Selection, ChipProps, Spinner, Modal, ModalContent,
    ModalHeader, ModalBody, useDisclosure, SortDescriptor, Select, SelectItem,
    DatePicker // Importar DatePicker
} from '@nextui-org/react';
import { DateValue } from "@internationalized/date"; // Importar DateValue
import { useRouter } from 'next/navigation';
import MoveUpRoundedIcon from '@mui/icons-material/MoveUpRounded';
import BorderColorRoundedIcon from '@mui/icons-material/BorderColorRounded';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';

import { PlusIcon } from '../icons/PlusIcon';
import { VerticalDotsIcon } from '../icons/VerticalDotsIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { ChevronDownIcon } from '../icons/ChevronDownlcon';

import { columns, statusOptions } from './data';
import { capitalize } from './utils';

// Interfaces y helpers (sin cambios IAssetFromAPI, statusColorMap, parseDateStringAsUTC)
interface IAssetFromAPI { /* ... (definición como antes) ... */
    id: number; serial_number: string | null; inventory_code: string; description: string | null; product_name: string; warranty_expiry_date: string | null; current_section_id: number | null; current_section_name: string | null; current_location_id: number | null; current_location_name: string | null; supplier_company_id: number | null; supplier_company_name: string | null; supplier_company_tax_id: string | null; purchase_date: string | null; invoice_number: string | null; acquisition_procedure: string | null; status: 'in_use' | 'in_storage' | 'under_repair' | 'disposed' | 'lost' | null; image_url: string | null; created_at: string; updated_at: string;
}
const statusColorMap: Record<string, ChipProps['color']> = { /* ... (como antes) ... */
    in_use: 'success', in_storage: 'warning', under_repair: 'secondary', disposed: 'danger', lost: 'default',
};
function parseDateStringAsUTC(dateStr: string | null | undefined): Date | null { /* ... (como antes) ... */
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
    console.warn(`No se pudo parsear la cadena de fecha: '${dateStr}'`);
    return null;
}


const INITIAL_VISIBLE_COLUMNS = [
    'product_name', 'serial_number', 'inventory_code', 'current_section_name', 'status',
    // 'acquisition_procedure', // Descomenta si quieres que sea visible por defecto
    'actions',
];

export default function AssetList() {
    const [assets, setAssets] = useState<IAssetFromAPI[]>([]);
    const [filterValue, setFilterValue] = useState(''); // Para búsqueda de texto
    const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
    const [visibleColumns, setVisibleColumns] = useState<Selection>(new Set(INITIAL_VISIBLE_COLUMNS));
    const [statusFilter, setStatusFilter] = useState<Selection>('all');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'product_name', direction: 'ascending' });
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { isOpen, onOpen, onOpenChange, onClose: closeModal } = useDisclosure();
    const [itemToUpdate, setItemToUpdate] = useState<IAssetFromAPI | undefined>();
    const [itemToMove, setItemToMove] = useState<IAssetFromAPI | undefined>();

    const filterableColumns = useMemo(() => columns.filter(col => col.filterable), []);
    const [selectedFilterAttribute, setSelectedFilterAttribute] = useState<Key>(
        filterableColumns.find(col => col.uid === 'product_name')?.uid ||
        (filterableColumns.length > 0 ? filterableColumns[0].uid : "")
    );

    // --- NUEVO: Estado para el filtro de rango de fechas ---
    const [dateRangeFilter, setDateRangeFilter] = useState<{ from: DateValue | null; to: DateValue | null }>({
        from: null,
        to: null,
    });

    // Determinar el tipo de la columna de filtro seleccionada
    const selectedColumnMeta = useMemo(() => {
        return columns.find(col => col.uid === selectedFilterAttribute);
    }, [selectedFilterAttribute]);

    useEffect(() => { /* ... (fetchAssetsFromAPI sin cambios) ... */
        const fetchAssetsFromAPI = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/assets');
                if (!response.ok) throw new Error('Error al obtener los activos');
                const data: IAssetFromAPI[] = await response.json();
                setAssets(data);
            } catch (err) { console.error(err); }
            finally { setIsLoading(false); }
        };
        fetchAssetsFromAPI();
    }, []);

    const hasSearchTextFilter = Boolean(filterValue.trim());
    const hasDateRangeFilter = Boolean(dateRangeFilter.from || dateRangeFilter.to);

    const headerColumns = useMemo(() => { /* ... (sin cambios) ... */
        if (visibleColumns === 'all') return columns;
        return columns.filter((column) => Array.from(visibleColumns).includes(column.uid));
    }, [visibleColumns]);

    // --- LÓGICA DE FILTRADO ACTUALIZADA ---
    const filteredItems = useMemo(() => {
        let filteredAssets = [...assets];

        // Filtrado por Atributo de Texto o Fecha
        if (selectedFilterAttribute) {
            const columnType = columns.find(col => col.uid === selectedFilterAttribute)?.type;

            if (columnType === 'date' && hasDateRangeFilter) {
                // Filtrado por Rango de Fechas
                filteredAssets = filteredAssets.filter(asset => {
                    const assetDateStr = asset[selectedFilterAttribute as keyof IAssetFromAPI] as string | null;
                    if (!assetDateStr) return false;
                    const assetDate = parseDateStringAsUTC(assetDateStr);
                    if (!assetDate) return false;

                    let inRange = true;
                    if (dateRangeFilter.from) {
                        const fromDate = new Date(Date.UTC(dateRangeFilter.from.year, dateRangeFilter.from.month - 1, dateRangeFilter.from.day));
                        if (assetDate.getTime() < fromDate.getTime()) {
                            inRange = false;
                        }
                    }
                    if (dateRangeFilter.to && inRange) {
                        // Para que 'to' sea inclusivo, comparamos con el inicio del día siguiente
                        const nextDayAfterTo = new Date(Date.UTC(dateRangeFilter.to.year, dateRangeFilter.to.month - 1, dateRangeFilter.to.day + 1));
                        if (assetDate.getTime() >= nextDayAfterTo.getTime()) {
                            inRange = false;
                        }
                    }
                    return inRange;
                });
            } else if (columnType !== 'date' && hasSearchTextFilter) {
                // Filtrado por Texto
                const searchTerm = filterValue.toLowerCase();
                filteredAssets = filteredAssets.filter((asset) => {
                    let attributeValue: any;
                    switch (selectedFilterAttribute) {
                        case 'product_name': attributeValue = asset.product_name; break;
                        case 'serial_number': attributeValue = asset.serial_number; break;
                        case 'inventory_code': attributeValue = asset.inventory_code; break;
                        case 'description': attributeValue = asset.description; break;
                        case 'current_section_name': attributeValue = asset.current_section_name; break;
                        case 'supplier_company_name': attributeValue = asset.supplier_company_name; break;
                        case 'invoice_number': attributeValue = asset.invoice_number; break;
                        case 'acquisition_procedure': attributeValue = asset.acquisition_procedure; break;
                        case 'status':
                            const statusDisplay = asset.status ? asset.status.replace(/_/g, " ") : "";
                            const rawStatus = asset.status || "";
                            return statusDisplay.toLowerCase().includes(searchTerm) || rawStatus.toLowerCase().includes(searchTerm);
                        default:
                            attributeValue = asset[selectedFilterAttribute as keyof IAssetFromAPI];
                    }
                    return String(attributeValue ?? "").toLowerCase().includes(searchTerm);
                });
            }
        }

        // Filtrado por estado (dropdown) - se aplica después del filtro anterior
        if (statusFilter !== 'all' && Array.from(statusFilter).length !== statusOptions.length) {
            filteredAssets = filteredAssets.filter((asset) =>
                Array.from(statusFilter).includes(asset.status!)
            );
        }
        return filteredAssets;
    }, [assets, filterValue, selectedFilterAttribute, statusFilter, hasSearchTextFilter, dateRangeFilter, hasDateRangeFilter]);

    const pages = Math.ceil(filteredItems.length / rowsPerPage);
    const itemsToDisplay = useMemo(() => { /* ... (sin cambios) ... */
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return filteredItems.slice(start, end);
    }, [page, filteredItems, rowsPerPage]);
    const sortedItems = useMemo(() => { /* ... (sin cambios) ... */
        return [...itemsToDisplay].sort((a, b) => {
            let firstValue: any, secondValue: any;
            const col = sortDescriptor.column as keyof IAssetFromAPI;
            switch (col) {
                case 'purchase_date': case 'warranty_expiry_date': case 'created_at': case 'updated_at':
                    firstValue = parseDateStringAsUTC(a[col] as string | null);
                    secondValue = parseDateStringAsUTC(b[col] as string | null);
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
    const renderCell = useCallback((asset: IAssetFromAPI, columnKey: Key): React.ReactNode => { /* ... (sin cambios, pero asegúrate que 'acquisition_procedure' se renderice bien si es visible) ... */
        const cellValue = asset[columnKey as keyof IAssetFromAPI];
        const handleUpdate = () => { setItemToMove(undefined); setItemToUpdate(asset); onOpen(); };
        const handleMove = () => { setItemToUpdate(undefined); setItemToMove(asset); onOpen(); };
        const handleMovements = () => { router.push(`/dashboard/assets/movements?q=${asset.serial_number || asset.inventory_code}`); };

        switch (columnKey) {
            case 'product_name':
                return <User avatarProps={{ radius: 'sm', src: asset.image_url || undefined }} description={asset.serial_number || asset.inventory_code} name={cellValue as string}>{asset.product_name}</User>;
            case 'status':
                return <Chip className="capitalize" color={statusColorMap[asset.status!] || 'default'} size="sm" variant="flat">{asset.status ? asset.status.replace(/_/g, " ") : "N/A"}</Chip>;
            case 'purchase_date':
            case 'warranty_expiry_date':
                const date = parseDateStringAsUTC(cellValue as string | null);
                return date ? date.toLocaleDateString(undefined, { timeZone: 'UTC' }) : "N/A";
            case 'actions':
                return ( /* ... (acciones sin cambios) ... */
                    <div className="relative flex justify-end items-center gap-2">
                        <Dropdown><DropdownTrigger><Button isIconOnly size="sm" variant="light"><VerticalDotsIcon className="text-default-300" /></Button></DropdownTrigger>
                            <DropdownMenu aria-label={`Acciones para ${asset.product_name}`}>
                                <DropdownItem startContent={<BorderColorRoundedIcon fontSize="small" />} onClick={handleUpdate}>Editar</DropdownItem>
                                <DropdownItem startContent={<MoveUpRoundedIcon fontSize="small" />} onClick={handleMove}>Mover</DropdownItem>
                                <DropdownItem startContent={<FormatListBulletedIcon fontSize="small" />} onClick={handleMovements}>Movimientos</DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                );
            default:
                return cellValue !== null && cellValue !== undefined ? String(cellValue) : "N/A";
        }
    }, [router, onOpen]);
    const onNextPage = useCallback(() => { if (page < pages) setPage(page + 1); }, [page, pages]);
    const onPreviousPage = useCallback(() => { if (page > 1) setPage(page - 1); }, [page]);
    const onRowsPerPageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => { setRowsPerPage(Number(e.target.value)); setPage(1); }, []);
    const onSearchChange = useCallback((value?: string) => { setFilterValue(value || ""); setPage(1); }, []);

    const onClearSearchOrDate = useCallback(() => {
        setFilterValue("");
        setDateRangeFilter({ from: null, to: null });
        setPage(1);
    }, []);

    const topContent = useMemo(() => {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between gap-3 items-end">
                    {/* --- FILTROS DE BÚSQUEDA Y ATRIBUTO --- */}
                    <div className="flex flex-col xs:flex-row gap-3 w-full xs:w-auto items-end flex-grow md:flex-grow-0">
                        <Select
                            aria-label="Filtrar por atributo"
                            placeholder="Buscar por..."
                            className="w-full xs:w-auto xs:min-w-[200px] md:max-w-xs"
                            selectedKeys={selectedFilterAttribute ? [selectedFilterAttribute] : []}
                            onSelectionChange={(keys) => {
                                const newKey = Array.from(keys as Set<Key>)[0];
                                const newSelectedAttribute = newKey || (filterableColumns.length > 0 ? filterableColumns[0].uid : "");
                                setSelectedFilterAttribute(newSelectedAttribute);
                                // Limpiar el otro tipo de filtro al cambiar atributo
                                const newColumn = columns.find(col => col.uid === newSelectedAttribute);
                                if (newColumn?.type === 'date') {
                                    setFilterValue("");
                                } else {
                                    setDateRangeFilter({ from: null, to: null });
                                }
                                setPage(1);
                            }}
                            size="md"
                        >
                            {filterableColumns.map(col => (
                                <SelectItem key={col.uid} value={col.uid} textValue={col.name}>
                                    {col.name}
                                </SelectItem>
                            ))}
                        </Select>

                        {/* Renderizado condicional del input de texto o los DatePickers */}
                        {selectedColumnMeta?.type === 'date' ? (
                            <div className="flex flex-col xs:flex-row gap-3 w-full xs:w-auto">
                                <DatePicker
                                    label="Desde"
                                    value={dateRangeFilter.from}
                                    onChange={(date) => setDateRangeFilter(prev => ({ ...prev, from: date }))}
                                    maxValue={dateRangeFilter.to || undefined}
                                    className="w-full xs:w-auto"
                                    size="sm" // Un poco más pequeño para que quepan mejor
                                    granularity="day"
                                    showMonthAndYearPickers
                                />
                                <DatePicker
                                    label="Hasta"
                                    value={dateRangeFilter.to}
                                    onChange={(date) => setDateRangeFilter(prev => ({ ...prev, to: date }))}
                                    minValue={dateRangeFilter.from || undefined}
                                    className="w-full xs:w-auto"
                                    size="sm"
                                    granularity="day"
                                    showMonthAndYearPickers
                                />
                            </div>
                        ) : (
                            <Input
                                isClearable
                                className="w-full xs:w-auto xs:flex-grow"
                                placeholder={`Buscar en "${selectedColumnMeta?.name || 'atributo'}"...`}
                                startContent={<SearchIcon />}
                                value={filterValue}
                                onClear={onClearSearchOrDate}
                                onValueChange={onSearchChange}
                                disabled={!selectedFilterAttribute}
                                size="md"
                            />
                        )}
                    </div>

                    <div className="flex gap-3 flex-wrap justify-end sm:justify-start w-full sm:w-auto">
                        {/* ... (Dropdowns de Estado y Columnas, y Botón Agregar sin cambios) ... */}
                        <Dropdown>
                            <DropdownTrigger><Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">Estado</Button></DropdownTrigger>
                            <DropdownMenu disallowEmptySelection aria-label="Filtrar por Estado" closeOnSelect={false} selectedKeys={statusFilter} selectionMode="multiple" onSelectionChange={setStatusFilter}>
                                {statusOptions.map((status) => <DropdownItem key={status.uid} className="capitalize">{capitalize(status.name)}</DropdownItem>)}
                            </DropdownMenu>
                        </Dropdown>
                        <Dropdown>
                            <DropdownTrigger><Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">Columnas</Button></DropdownTrigger>
                            <DropdownMenu disallowEmptySelection aria-label="Seleccionar Columnas Visibles" closeOnSelect={false} selectedKeys={visibleColumns} selectionMode="multiple" onSelectionChange={setVisibleColumns}>
                                {columns.map((column) => <DropdownItem key={column.uid} className="capitalize">{capitalize(column.name)}</DropdownItem>)}
                            </DropdownMenu>
                        </Dropdown>
                        <Button color="primary" endContent={<PlusIcon />} onClick={() => router.push('/dashboard/assets/add')}>Agregar Activo</Button>
                    </div>
                </div>
                {/* ... (contador de items y selector de filas por página sin cambios) ... */}
                <div className="flex justify-between items-center">
                    <span className="text-default-400 text-small">Total {assets.length} activos. {filteredItems.length !== assets.length ? `${filteredItems.length} coinciden.` : ''}</span>
                    <label className="flex items-center text-default-400 text-small">Filas por página:
                        <select className="bg-transparent outline-none text-default-400 text-small" onChange={onRowsPerPageChange} value={rowsPerPage}>
                            <option value="5">5</option><option value="10">10</option><option value="15">15</option><option value="25">25</option>
                        </select>
                    </label>
                </div>
            </div>
        );
    }, [
        filterValue, statusFilter, visibleColumns, onSearchChange, onRowsPerPageChange, assets.length, router,
        onClearSearchOrDate, filteredItems.length, rowsPerPage, selectedFilterAttribute, filterableColumns,
        dateRangeFilter, selectedColumnMeta // Añadir dependencias nuevas
    ]);

    const bottomContent = useMemo(() => { /* ... (sin cambios) ... */
        return (
            <div className="py-2 px-2 flex justify-between items-center">
                <span className="w-[30%] text-small text-default-400">
                    {selectedKeys === 'all' ? 'Todos seleccionados' : `${selectedKeys.size} de ${filteredItems.length} seleccionados`}
                </span>
                <Pagination isCompact showControls showShadow color="primary" page={page} total={pages} onChange={setPage} />
                <div className="hidden sm:flex w-[30%] justify-end gap-2">
                    <Button isDisabled={page <= 1} size="sm" variant="flat" onPress={onPreviousPage}>Anterior</Button>
                    <Button isDisabled={page >= pages} size="sm" variant="flat" onPress={onNextPage}>Siguiente</Button>
                </div>
            </div>
        );
    }, [selectedKeys, page, pages, filteredItems.length, onPreviousPage, onNextPage]);
    const ModalContentComponent = useMemo(() => { /* ... (sin cambios) ... */
        if (itemToUpdate) { return (<> <ModalHeader className="flex flex-col">Actualizar Activo</ModalHeader> <ModalBody> <p>Formulario para actualizar activo ID: {itemToUpdate.id} (PENDIENTE)</p> </ModalBody> </>); }
        if (itemToMove) { return (<> <ModalHeader className="flex flex-col">Mover Activo</ModalHeader> <ModalBody> <p>Formulario para mover activo ID: {itemToMove.id} (PENDIENTE)</p> </ModalBody> </>); }
        return null;
    }, [itemToUpdate, itemToMove]);

    return (
        <div className="flex flex-col gap-4">
            {topContent}
            <div className="overflow-x-auto w-full shadow-md sm:rounded-lg border border-default-200">
                <Table
                    isHeaderSticky
                    aria-label="Tabla de Activos"
                    bottomContent={bottomContent}
                    bottomContentPlacement="outside"
                    selectedKeys={selectedKeys}
                    selectionMode="multiple"
                    sortDescriptor={sortDescriptor}
                    onSelectionChange={setSelectedKeys}
                    onSortChange={setSortDescriptor}
                    classNames={{
                        table: "min-w-[700px]",
                        // Eliminada la clase wrapper max-h-[...]
                    }}
                >
                    <TableHeader columns={headerColumns}>
                        {(column) => (
                            <TableColumn
                                key={column.uid}
                                align={column.uid === 'actions' ? 'center' : 'start'}
                                allowsSorting={column.sortable}
                                className="py-3 px-4 bg-default-100 text-left text-xs font-medium text-default-600 uppercase tracking-wider whitespace-nowrap"
                            >
                                {column.name}
                            </TableColumn>
                        )}
                    </TableHeader>
                    <TableBody
                        items={sortedItems}
                        isLoading={isLoading}
                        loadingContent={<Spinner label="Cargando activos..." />}
                        emptyContent={assets.length === 0 && !isLoading ? "No hay activos para mostrar." : "Ningún activo coincide con los filtros."}
                    >
                        {(item) => (
                            <TableRow key={item.id} className="hover:bg-default-50 transition-colors">
                                {(columnKey) => (
                                    <TableCell className="py-3 px-4 whitespace-nowrap text-sm">
                                        {renderCell(item, columnKey)}
                                    </TableCell>
                                )}
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            {(itemToUpdate || itemToMove) && (
                <Modal backdrop="blur" isOpen={isOpen} placement="top-center" scrollBehavior="outside" onOpenChange={onOpenChange} onClose={closeModal}>
                    <ModalContent>{ModalContentComponent}</ModalContent>
                </Modal>
            )}
        </div>
    );
}