'use client';

import React, { useMemo, useState, useCallback, Key } from 'react';
import {
    Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
    Input, Button, DropdownTrigger, Dropdown, DropdownMenu, DropdownItem,
    Chip, Pagination, Selection, Spinner, SortDescriptor, Select, SelectItem,
    DatePicker, ChipProps
} from "@heroui/react";
import { DateValue } from "@internationalized/date";
import { SearchIcon } from '@/components/icons/SearchIcon';
import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';
import { PlusIcon } from '@/components/icons/PlusIcon';
import { DownloadIcon } from '@/components/icons/DownloadIcon';
import { capitalize } from '@/components/assetList/utils';

// Helper for date parsing
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

export interface ColumnDef {
    name: string;
    uid: string;
    sortable?: boolean;
    filterable?: boolean;
    type?: string; // 'date', 'string', etc.
}

export interface StatusOption {
    name: string;
    uid: string;
}

interface GenericTableProps<T> {
    data: T[];
    columns: ColumnDef[];
    isLoading: boolean;
    initialVisibleColumns: string[];
    entityName: string;
    renderCell: (item: T, columnKey: Key) => React.ReactNode;
    onAdd?: () => void;
    onExport?: (format: 'csv' | 'pdf', filters: any, sort: SortDescriptor, columns: ColumnDef[]) => void;
    statusOptions?: StatusOption[];
    enableDateFilter?: boolean;
    isExportingCsv?: boolean;
    isExportingPdf?: boolean;
    statusColorMap?: Record<string, ChipProps['color']>;
    title?: string;
    emptyContent?: string;
    parseApiDateStringToDate?: (dateStr: string | null | undefined) => Date | null;
    dateValueToYYYYMMDD?: (dateValue: DateValue | null) => string | null;
    getFilterValue?: (item: T, columnKey: Key) => string;
}

export default function GenericTable<T extends { id?: Key | number | string, status?: string | null, [key: string]: any }>({
    data,
    columns,
    isLoading,
    initialVisibleColumns,
    entityName,
    renderCell,
    onAdd,
    onExport,
    statusOptions,
    enableDateFilter = false,
    isExportingCsv = false,
    isExportingPdf = false,
    statusColorMap,
    title,
    emptyContent,
    parseApiDateStringToDate: customParseDate,
    getFilterValue
}: GenericTableProps<T>) {

    // --- State ---
    const [filterSearchText, setFilterSearchText] = useState('');
    const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
    const [statusFilter, setStatusFilter] = useState<Selection>('all');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: columns[0]?.uid || 'id', direction: 'ascending' });
    const [page, setPage] = useState(1);

    const filterableAttributes = useMemo(() => columns.filter(col => col.filterable), [columns]);
    const [selectedFilterAttribute, setSelectedFilterAttribute] = useState<Key>(
        filterableAttributes.length > 0 ? filterableAttributes[0].uid : ""
    );

    const [dateRangeFilter, setDateRangeFilter] = useState<{ from: DateValue | null; to: DateValue | null }>({
        from: null, to: null,
    });

    const [visibleColumns, setVisibleColumns] = useState<Selection>(new Set(initialVisibleColumns));

    // --- Derived State ---
    const selectedColumnMeta = useMemo(() => {
        return columns.find(col => col.uid === selectedFilterAttribute);
    }, [selectedFilterAttribute, columns]);

    const hasSearchTextFilter = Boolean(filterSearchText.trim());
    const hasDateRangeFilter = Boolean(dateRangeFilter.from || dateRangeFilter.to);

    const headerColumns = useMemo(() => {
        if (visibleColumns === "all") return columns;
        return columns.filter((column) => Array.from(visibleColumns).includes(column.uid));
    }, [visibleColumns, columns]);

    const filteredItems = useMemo(() => {
        let filteredData = [...data];
        const attributeKey = selectedFilterAttribute as string;

        if (selectedFilterAttribute) {
            if (selectedColumnMeta?.type === 'date' && enableDateFilter && hasDateRangeFilter) {
                filteredData = filteredData.filter(item => {
                    const itemDateStr = item[attributeKey] as string | null;
                    if (!itemDateStr) return false;
                    const itemDate = parseApiDateStringToDate(itemDateStr);
                    if (!itemDate) return false;
                    let inRange = true;
                    if (dateRangeFilter.from) {
                        const fromDate = new Date(Date.UTC(dateRangeFilter.from.year, dateRangeFilter.from.month - 1, dateRangeFilter.from.day));
                        if (itemDate.getTime() < fromDate.getTime()) inRange = false;
                    }
                    if (dateRangeFilter.to && inRange) {
                        const nextDayAfterTo = new Date(Date.UTC(dateRangeFilter.to.year, dateRangeFilter.to.month - 1, dateRangeFilter.to.day + 1));
                        if (itemDate.getTime() >= nextDayAfterTo.getTime()) inRange = false;
                    }
                    return inRange;
                });
            } else if (selectedColumnMeta?.type !== 'date' && hasSearchTextFilter) {
                const searchTerm = filterSearchText.toLowerCase();
                filteredData = filteredData.filter((item) => {
                    if (getFilterValue) {
                        const customValue = getFilterValue(item, attributeKey);
                        return customValue.toLowerCase().includes(searchTerm);
                    }
                    if (attributeKey === 'status') {
                        const statusDisplay = item.status ? item.status.replace(/_/g, " ") : "";
                        const rawStatus = item.status || "";
                        return statusDisplay.toLowerCase().includes(searchTerm) || rawStatus.toLowerCase().includes(searchTerm);
                    }
                    const val = item[attributeKey];
                    return String(val ?? "").toLowerCase().includes(searchTerm);
                });
            }
        }

        if (statusOptions && statusFilter !== 'all' && Array.from(statusFilter).length !== statusOptions.length) {
            const selectedStatuses = Array.from(statusFilter);
            filteredData = filteredData.filter((item) =>
                item.status && selectedStatuses.includes(item.status)
            );
        }
        return filteredData;
    }, [data, filterSearchText, selectedFilterAttribute, selectedColumnMeta, statusFilter, hasSearchTextFilter, dateRangeFilter, hasDateRangeFilter, enableDateFilter, statusOptions, getFilterValue]);

    const pages = Math.ceil(filteredItems.length / rowsPerPage);

    const sortedItems = useMemo(() => {
        return [...filteredItems].sort((a, b) => {
            let firstValue: any, secondValue: any;
            const colUid = sortDescriptor.column as string;
            const colDef = columns.find(c => c.uid === colUid);

            firstValue = a[colUid];
            secondValue = b[colUid];

            if (colDef?.type === 'date') {
                firstValue = parseApiDateStringToDate(firstValue as string | null);
                secondValue = parseApiDateStringToDate(secondValue as string | null);
            }

            let cmp: number;
            if (firstValue === null || firstValue === undefined) cmp = -1;
            else if (secondValue === null || secondValue === undefined) cmp = 1;
            else if (firstValue instanceof Date && secondValue instanceof Date) cmp = firstValue.getTime() - secondValue.getTime();
            else if (typeof firstValue === 'number' && typeof secondValue === 'number') cmp = firstValue - secondValue;
            else cmp = String(firstValue).toLowerCase().localeCompare(String(secondValue).toLowerCase());

            return sortDescriptor.direction === 'descending' ? -cmp : cmp;
        });
    }, [sortDescriptor, filteredItems, columns]);

    const itemsToDisplay = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return sortedItems.slice(start, end);
    }, [page, sortedItems, rowsPerPage]);

    // --- Callbacks ---
    const onRowsPerPageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setRowsPerPage(Number(e.target.value));
        setPage(1);
    }, []);

    const onSearchTextChange = useCallback((value?: string) => {
        setFilterSearchText(value || "");
        setPage(1);
    }, []);

    const onClearSearchOrDate = useCallback(() => {
        setFilterSearchText("");
        setDateRangeFilter({ from: null, to: null });
        setPage(1);
    }, []);

    const handleExport = (format: 'csv' | 'pdf') => {
        if (onExport) {
            const filters = {
                searchText: filterSearchText,
                searchAttribute: selectedFilterAttribute,
                status: statusFilter === 'all' ? null : Array.from(statusFilter),
                dateRange: dateRangeFilter
            };
            onExport(format, filters, sortDescriptor, headerColumns);
        }
    };

    // --- Content ---
    const topContent = useMemo(() => {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-end gap-3">
                    <div className="flex flex-col xs:flex-row items-end gap-3 w-full sm:w-auto flex-grow-[2] sm:flex-grow-0">
                        <Select
                            aria-label="Filtrar por atributo"
                            placeholder="Buscar por..."
                            className="w-full xs:w-auto xs:min-w-[180px] md:max-w-xs"
                            selectedKeys={selectedFilterAttribute ? [selectedFilterAttribute] as any : []}
                            onSelectionChange={(keys) => {
                                const newKey = Array.from(keys as Set<Key>)[0];
                                setSelectedFilterAttribute(newKey || (filterableAttributes.length > 0 ? filterableAttributes[0].uid : ""));
                                const newColumn = columns.find(col => col.uid === newKey);
                                if (newColumn?.type === 'date') setFilterSearchText(""); else setDateRangeFilter({ from: null, to: null });
                                setPage(1);
                            }}
                            size="md"
                        >
                            {filterableAttributes.map(col => (
                                <SelectItem key={col.uid} textValue={col.name}>{col.name}</SelectItem>
                            ))}
                        </Select>

                        {selectedColumnMeta?.type === 'date' && enableDateFilter ? (
                            <div className="flex flex-col xs:flex-row gap-3 w-full xs:w-auto">
                                <DatePicker label="Desde" aria-label="Fecha desde" value={dateRangeFilter.from as any} onChange={(date) => setDateRangeFilter(prev => ({ ...prev, from: date }))} maxValue={dateRangeFilter.to as any || undefined} className="w-full xs:w-auto" size="sm" granularity="day" showMonthAndYearPickers />
                                <DatePicker label="Hasta" aria-label="Fecha hasta" value={dateRangeFilter.to as any} onChange={(date) => setDateRangeFilter(prev => ({ ...prev, to: date }))} minValue={dateRangeFilter.from as any || undefined} className="w-full xs:w-auto" size="sm" granularity="day" showMonthAndYearPickers />
                            </div>
                        ) : (
                            <Input
                                isClearable
                                className="w-full xs:w-auto xs:flex-grow"
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
                    <div className="flex gap-3 w-full sm:w-auto justify-end sm:justify-start">
                        {statusOptions && (
                            <Dropdown>
                                <DropdownTrigger>
                                    <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">Estado</Button>
                                </DropdownTrigger>
                                <DropdownMenu disallowEmptySelection aria-label="Filtrar por Estado" closeOnSelect={false} selectedKeys={statusFilter} selectionMode="multiple" onSelectionChange={setStatusFilter}>
                                    {statusOptions.map((status) => <DropdownItem key={status.uid} className="capitalize">{capitalize(status.name)}</DropdownItem>)}
                                </DropdownMenu>
                            </Dropdown>
                        )}
                        <Dropdown>
                            <DropdownTrigger>
                                <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">Columnas</Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                disallowEmptySelection aria-label="Seleccionar Columnas Visibles" closeOnSelect={false}
                                selectedKeys={visibleColumns} selectionMode="multiple"
                                onSelectionChange={setVisibleColumns}
                            >
                                {columns.filter(col => col.uid !== 'actions').map((column) => <DropdownItem key={column.uid} className="capitalize">{capitalize(column.name)}</DropdownItem>)}
                            </DropdownMenu>
                        </Dropdown>
                        {onAdd && (
                            <Button color="primary" endContent={<PlusIcon />} onPress={onAdd}>
                                Agregar {entityName.slice(0, -1)}
                            </Button>
                        )}
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-center mt-2 gap-3">
                    <span className="text-default-500 text-small self-start sm:self-center">
                        Total {data.length} {entityName.toLowerCase()}. {filteredItems.length !== data.length ? `${filteredItems.length} coinciden con el filtro.` : ''}
                    </span>
                    <div className="flex gap-2 items-center flex-wrap justify-end sm:justify-start w-full sm:w-auto">
                        {onExport && (
                            <>
                                <Button size="sm" variant="flat" onPress={() => handleExport('csv')} isLoading={isExportingCsv} startContent={!isExportingCsv ? <DownloadIcon /> : null} className="min-w-max">
                                    Exportar CSV
                                </Button>
                                <Button size="sm" variant="flat" onPress={() => handleExport('pdf')} isLoading={isExportingPdf} startContent={!isExportingPdf ? <DownloadIcon /> : null} className="min-w-max">
                                    Exportar PDF
                                </Button>
                            </>
                        )}
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
        filterSearchText, statusFilter, visibleColumns, columns, filterableAttributes,
        onSearchTextChange, onRowsPerPageChange, data.length, onAdd, onExport,
        onClearSearchOrDate, filteredItems.length, rowsPerPage, selectedFilterAttribute,
        dateRangeFilter, selectedColumnMeta, isExportingCsv, isExportingPdf, entityName,
        statusOptions, enableDateFilter
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
                    page={page} total={pages} onChange={setPage}
                    className={itemsToDisplay.length === 0 ? 'invisible' : ''}
                />
                <div className="hidden sm:flex w-[30%] justify-end gap-2">
                    <Button isDisabled={pages === 1 || page <= 1} size="sm" variant="flat" onPress={() => setPage(p => p - 1)}>Anterior</Button>
                    <Button isDisabled={pages === 1 || page >= pages} size="sm" variant="flat" onPress={() => setPage(p => p + 1)}>Siguiente</Button>
                </div>
            </div>
        );
    }, [selectedKeys, itemsToDisplay.length, page, pages, filteredItems.length]);

    if (isLoading && data.length === 0) {
        return (<div className="flex justify-center items-center h-[calc(100vh-200px)]"> <Spinner label={`Cargando ${entityName.toLowerCase()}...`} color="primary" labelColor="primary" size="lg" /> </div>);
    }

    return (
        <div className="space-y-4 p-4 md:p-0">
            {title && <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>}
            {topContent}
            <div className="overflow-x-auto w-full shadow-md sm:rounded-lg">
                <Table
                    isHeaderSticky aria-label={`Tabla de ${entityName}`}
                    bottomContent={pages > 0 && itemsToDisplay.length > 0 ? bottomContent : null}
                    selectedKeys={selectedKeys} selectionMode="multiple"
                    sortDescriptor={sortDescriptor} onSelectionChange={setSelectedKeys} onSortChange={setSortDescriptor}
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
                        items={itemsToDisplay}
                        isLoading={isLoading && itemsToDisplay.length > 0}
                        loadingContent={<Spinner label="Actualizando..." />}
                        emptyContent={emptyContent || (data.length === 0 && !isLoading ? `No hay ${entityName.toLowerCase()} para mostrar.` : "Ningún elemento coincide con los filtros.")}
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
