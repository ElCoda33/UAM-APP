// UAM-APP/components/dataListTable/DataListTable.tsx
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Input, Button, DropdownTrigger, Dropdown, DropdownMenu, DropdownItem,
  Pagination, Spinner, SortDescriptor, Select, SelectItem,
  DatePicker,
  Selection, Key
} from "@heroui/react";
import { DateValue } from "@internationalized/date";

// Define las props necesarias
interface ColumnDefinition<T> {
  uid: string;
  name: string;
  sortable?: boolean;
  filterable?: boolean;
  type?: 'text' | 'date';
}

interface DataListTableProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  renderCell: (item: T, columnKey: Key) => React.ReactNode;
  isLoading: boolean;
  title: string;
  initialVisibleColumns?: Key[];
  rowsPerPageOptions?: number[];
  searchPlaceholder?: string;
  emptyContentMessage?: string;
  // Opciones de filtro
  filterableAttributes?: ColumnDefinition<T>[];
  // Opciones de exportación
  exportActions?: React.ReactNode;
  // Contenido adicional arriba y abajo
  topControls?: React.ReactNode;
  bottomControls?: React.ReactNode;
}

export function DataListTable<T extends { id: Key }>(props: DataListTableProps<T>) {
  const {
    data, columns, renderCell, isLoading, title,
    initialVisibleColumns = [], rowsPerPageOptions = [10, 15, 25, 50],
    searchPlaceholder = "Buscar...",
    emptyContentMessage = "No hay datos para mostrar.",
    filterableAttributes = [],
    exportActions,
    topControls,
    bottomControls,
  } = props;

  const [filterSearchText, setFilterSearchText] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: columns[0]?.uid, direction: 'ascending' });
  const [page, setPage] = useState(1);
  const [selectedFilterAttribute, setSelectedFilterAttribute] = useState<Key>(
    filterableAttributes.length > 0 ? filterableAttributes[0].uid : ""
  );
  const selectedColumnMeta = useMemo(() => {
    return columns.find(col => col.uid === selectedFilterAttribute);
  }, [selectedFilterAttribute, columns]);
  const [dateRangeFilter, setDateRangeFilter] = useState<{ from: DateValue | null; to: DateValue | null }>({ from: null, to: null });

  // Lógica de filtrado y ordenamiento
  const filteredItems = useMemo(() => {
    let filteredData = [...data];
    // Lógica de filtrado de texto o fecha
    if (selectedFilterAttribute) {
      if (selectedColumnMeta?.type === 'date' && (dateRangeFilter.from || dateRangeFilter.to)) {
        // ... (lógica de filtro de fecha, mover la función parseApiDateStringToDate a un archivo de utilidades)
      } else if (selectedColumnMeta?.type !== 'date' && filterSearchText) {
        const searchTerm = filterSearchText.toLowerCase();
        filteredData = filteredData.filter(item => String(item[selectedFilterAttribute as keyof T] ?? "").toLowerCase().includes(searchTerm));
      }
    }
    // Lógica de filtros adicionales (por ej. por estado)
    // Se podrían pasar como props con su propia lógica
    return filteredData;
  }, [data, filterSearchText, selectedFilterAttribute, dateRangeFilter, selectedColumnMeta]);

  const pages = Math.ceil(filteredItems.length / rowsPerPage);

  const itemsToDisplay = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredItems.slice(start, end);
  }, [page, filteredItems, rowsPerPage]);

  const sortedItems = useMemo(() => {
    // ... (Lógica de ordenamiento)
    return [...itemsToDisplay].sort((a, b) => {
      // Tu lógica de ordenamiento actual...
      return 0; // Placeholder
    });
  }, [sortDescriptor, itemsToDisplay]);

  // Lógica para manejar cambios de estado
  const onPageChange = useCallback((newPage: number) => setPage(newPage), []);
  const onRowsPerPageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => { setRowsPerPage(Number(e.target.value)); setPage(1); }, []);
  const onSearchTextChange = useCallback((value?: string) => { setFilterSearchText(value || ""); setPage(1); }, []);
  const onClearSearchOrDate = useCallback(() => {
    setFilterSearchText("");
    setDateRangeFilter({ from: null, to: null });
    setPage(1);
  }, []);

  const TOGGLEABLE_COLUMNS = useMemo(() => columns.filter(col => col.uid !== 'actions'), [columns]);
  const [selectedToggleableUIDs, setSelectedToggleableUIDs] = useState<Set<Key>>(
    new Set(TOGGLEABLE_COLUMNS.filter(col => initialVisibleColumns.includes(col.uid)).map(col => col.uid as Key))
  );

  const finalVisibleColumnUIDs = useMemo(() => {
    const visible = new Set(selectedToggleableUIDs);
    columns.filter(c => c.uid === 'actions').forEach(c => visible.add(c.uid));
    return visible;
  }, [selectedToggleableUIDs, columns]);

  const currentTableColumns = useMemo(() => {
    return columns.filter(col => finalVisibleColumnUIDs.has(col.uid as Key));
  }, [finalVisibleColumnUIDs, columns]);

  // Renderizado del contenido superior
  const defaultTopContent = useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-end gap-3">
          <div className="flex flex-col xs:flex-row items-end gap-3 w-full sm:w-auto flex-grow-[2] sm:flex-grow-0">
            {/* Controles de búsqueda y filtro */}
            <Select
              aria-label="Filtrar por atributo"
              placeholder="Buscar por..."
              className="w-full xs:w-auto xs:min-w-[180px] md:max-w-xs"
              selectedKeys={selectedFilterAttribute ? [selectedFilterAttribute] : []}
              onSelectionChange={(keys) => {
                const newKey = Array.from(keys as Set<Key>)[0];
                setSelectedFilterAttribute(newKey);
                const newColumn = columns.find(col => col.uid === newKey);
                if (newColumn?.type === 'date') setFilterSearchText(""); else setDateRangeFilter({ from: null, to: null });
                setPage(1);
              }}
              size="md"
            >
              {filterableAttributes.map(col => (<SelectItem key={col.uid} value={col.uid} textValue={col.name}>{col.name}</SelectItem>))}
            </Select>
            {selectedColumnMeta?.type === 'date' ? (
              <div className="flex flex-col xs:flex-row gap-3 w-full xs:w-auto">
                <DatePicker label="Desde" value={dateRangeFilter.from} onChange={(date) => setDateRangeFilter(prev => ({ ...prev, from: date }))} className="w-full xs:w-auto" size="sm" granularity="day" showMonthAndYearPickers isClearable onClear={() => onClearSearchOrDate()} />
                <DatePicker label="Hasta" value={dateRangeFilter.to} onChange={(date) => setDateRangeFilter(prev => ({ ...prev, to: date }))} className="w-full xs:w-auto" size="sm" granularity="day" showMonthAndYearPickers isClearable onClear={() => onClearSearchOrDate()} />
              </div>
            ) : (
              <Input
                isClearable
                className="w-full xs:w-auto xs:flex-grow"
                placeholder={searchPlaceholder}
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
            <Dropdown>
              <DropdownTrigger>
                <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">Columnas</Button>
              </DropdownTrigger>
              <DropdownMenu
                disallowEmptySelection aria-label="Seleccionar Columnas Visibles" closeOnSelect={false}
                selectedKeys={selectedToggleableUIDs} selectionMode="multiple"
                onSelectionChange={(keys) => setSelectedToggleableUIDs(new Set(keys as Set<Key>))}
              >
                {TOGGLEABLE_COLUMNS.map((column) => <DropdownItem key={column.uid} className="capitalize">{column.name}</DropdownItem>)}
              </DropdownMenu>
            </Dropdown>
            {exportActions}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center mt-2 gap-3">
          <span className="text-default-500 text-small self-start sm:self-center">
            Total {data.length} items. {filteredItems.length !== data.length ? `${filteredItems.length} coinciden con el filtro.` : ''}
          </span>
          <div className="flex gap-2 items-center flex-wrap justify-end sm:justify-start w-full sm:w-auto">
            <label className="flex items-center text-default-500 text-small whitespace-nowrap">
              Filas por página:
              <select className="bg-transparent outline-none text-default-500 text-small ml-1" onChange={onRowsPerPageChange} value={rowsPerPage}>
                {rowsPerPageOptions.map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
          </div>
        </div>
      </div>
    );
  }, [filterSearchText, onSearchTextChange, onRowsPerPageChange, data.length, filteredItems.length, rowsPerPage, selectedFilterAttribute, dateRangeFilter, selectedColumnMeta, columns, finalVisibleColumnUIDs, exportActions, onClearSearchOrDate, selectedToggleableUIDs]);

  // Renderizado del contenido inferior
  const defaultBottomContent = useMemo(() => {
    return (
      <div className="py-2 px-2 flex justify-between items-center">
        <span className="w-[30%] text-small text-default-400 hidden sm:block">
          {selectedKeys === "all" ? "Todos los items seleccionados" : `${selectedKeys.size} de ${itemsToDisplay.length > 0 ? filteredItems.length : 0} seleccionados`}
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

  return (
    <div className="space-y-4 p-4 md:p-0">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>
      {topControls || defaultTopContent}
      <div className="overflow-x-auto w-full shadow-md sm:rounded-lg">
        <Table
          isHeaderSticky aria-label={`Tabla de ${title}`}
          bottomContent={pages > 0 && itemsToDisplay.length > 0 ? (bottomControls || defaultBottomContent) : null}
          selectedKeys={selectedKeys} selectionMode="multiple"
          sortDescriptor={sortDescriptor} onSelectionChange={setSelectedKeys} onSortChange={setSortDescriptor}
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
            emptyContent={data.length === 0 && !isLoading ? emptyContentMessage : "Ningún elemento coincide con los filtros."}
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