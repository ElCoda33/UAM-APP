// app/dashboard/locations/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Tooltip, Button, Link as HeroUILink, Spinner,
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
  Input, Pagination, SortDescriptor, Selection
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { PlusIcon } from "@/components/icons/PlusIcon";
import { EditIcon } from "@/components/icons/EditIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { SearchIcon } from "@/components/icons/SearchIcon";
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";
import type { LocationRecord } from "@/app/api/locations/route"; // Importa la interfaz con la nueva ruta

const locationColumnsDefinition = [ // Renombrado
  { uid: "id", name: "ID", sortable: true, defaultVisible: true },
  { uid: "name", name: "Nombre Ubicación", sortable: true, defaultVisible: true },
  { uid: "description", name: "Descripción", sortable: true, defaultVisible: true },
  { uid: "section_name", name: "Dependencia (Sección)", sortable: true, defaultVisible: true },
  { uid: "actions", name: "Acciones", sortable: false, defaultVisible: true },
];

const INITIAL_VISIBLE_COLUMNS_LOCATIONS = locationColumnsDefinition // Renombrado
  .filter(col => col.defaultVisible)
  .map(col => col.uid);

export default function LocationsPage() { // Renombrado
  const router = useRouter();
  const [locations, setLocations] = useState<LocationRecord[]>([]); // Renombrado
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterValue, setFilterValue] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: "name", direction: "ascending" });
  const [visibleColumns, setVisibleColumns] = useState<Selection>(new Set(INITIAL_VISIBLE_COLUMNS_LOCATIONS)); // Renombrado
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchLocationsData = useCallback(async (searchTerm: string = "") => { // Renombrado
    setIsLoading(true);
    setError(null);
    try {
      const apiUrl = searchTerm ? `/api/locations?search=${encodeURIComponent(searchTerm)}` : "/api/locations"; // Ruta API actualizada
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Error al cargar ubicaciones");
      }
      const data: LocationRecord[] = await response.json();
      setLocations(data); // Renombrado
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || "No se pudieron cargar las ubicaciones.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocationsData(filterValue);
  }, [fetchLocationsData, filterValue]);

  const filteredItems = useMemo(() => {
    return [...locations]; // Asumiendo que la API maneja el filtro 'search'
  }, [locations]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const first = a[sortDescriptor.column as keyof LocationRecord];
      const second = b[sortDescriptor.column as keyof LocationRecord];
      let cmp = 0;
      if (first == null && second != null) cmp = -1;
      else if (first != null && second == null) cmp = 1;
      else if (first == null && second == null) cmp = 0;
      else if (typeof first === 'number' && typeof second === 'number') cmp = first - second;
      else cmp = String(first).toLowerCase().localeCompare(String(second).toLowerCase());
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [sortDescriptor, filteredItems]);

  const itemsToDisplay = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedItems.slice(start, end);
  }, [page, sortedItems, rowsPerPage]);

  const pages = Math.ceil(filteredItems.length / rowsPerPage);

  const handleDeleteLocation = async (locationId: number) => { // Renombrado
    const confirmDelete = window.confirm(`¿Estás seguro de eliminar la ubicación ID ${locationId}?`);
    if (!confirmDelete) return;
    const toastId = toast.loading("Eliminando ubicación...");
    try {
      const response = await fetch(`/api/locations/${locationId}`, { method: 'DELETE' }); // Ruta API actualizada
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Error al eliminar ubicación");
      toast.success(result.message || "Ubicación eliminada.", { id: toastId });
      fetchLocationsData(filterValue);
    } catch (err: any) {
      toast.error(err.message || "No se pudo eliminar la ubicación.", { id: toastId });
    }
  };

  const renderCell = useCallback((location: LocationRecord, columnKey: React.Key) => { // Parámetro renombrado
    const cellValue = location[columnKey as keyof LocationRecord];
    switch (columnKey) {
      case "actions":
        return (
          <div className="relative flex items-center gap-1.5">
            <Tooltip content="Editar Ubicación">
              <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/locations/${location.id}/edit`)}> {/* Ruta actualizada */}
                <EditIcon className="text-lg text-default-500" />
              </Button>
            </Tooltip>
            <Tooltip color="danger" content="Eliminar Ubicación">
              <Button isIconOnly size="sm" variant="light" onPress={() => handleDeleteLocation(location.id)}>
                <DeleteIcon className="text-lg text-danger" />
              </Button>
            </Tooltip>
          </div>
        );
      default:
        return cellValue != null ? String(cellValue) : "N/A";
    }
  }, [router, fetchLocationsData, filterValue]);

  const onSearchChange = useCallback((value?: string) => {
    setFilterValue(value || ""); setPage(1);
  }, []);
  const onClear = useCallback(() => {
    setFilterValue(""); setPage(1);
  }, []);

  const topContent = useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between gap-3 items-end flex-wrap">
          <Input
            isClearable className="w-full sm:max-w-xs"
            placeholder="Buscar ubicación..."
            startContent={<SearchIcon className="text-default-300" />}
            value={filterValue} onClear={onClear} onValueChange={onSearchChange} size="md"
          />
          <div className="flex gap-3">
            <Dropdown>
              <DropdownTrigger>
                <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">Columnas</Button>
              </DropdownTrigger>
              <DropdownMenu
                disallowEmptySelection aria-label="Table Columns" closeOnSelect={false}
                selectedKeys={visibleColumns} selectionMode="multiple" onSelectionChange={setVisibleColumns}
              >
                {locationColumnsDefinition.filter(col => col.uid !== 'actions').map((column) => (
                  <DropdownItem key={column.uid} className="capitalize">{column.name}</DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
            <Button color="primary" endContent={<PlusIcon />} onPress={() => router.push("/dashboard/locations/add")}> {/* Ruta actualizada */}
              Agregar Ubicación
            </Button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-default-400 text-small">Total {locations.length} ubicaciones. {filteredItems.length !== locations.length ? `${filteredItems.length} encontradas.` : ''}</span>
          <label className="flex items-center text-default-400 text-small">
            Filas por página:
            <select className="bg-transparent outline-none text-default-400 text-small" value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}>
              {[5, 10, 15, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        </div>
      </div>
    );
  }, [filterValue, onSearchChange, onClear, visibleColumns, locations.length, filteredItems.length, rowsPerPage, router]);

  const headerColumnsToRender = useMemo(() => {
    return locationColumnsDefinition.filter(col => (visibleColumns as Set<React.Key>).has(col.uid) || col.uid === 'actions');
  }, [visibleColumns]);

  return (
    <div className="space-y-4 p-4 md:p-0">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestión de Ubicaciones Físicas</h1>
      <Table
        aria-label="Tabla de Ubicaciones" isHeaderSticky
        topContent={topContent} topContentPlacement="outside"
        bottomContent={pages > 0 && itemsToDisplay.length > 0 ? (
          <div className="py-2 px-2 flex justify-between items-center">
            <span className="w-[30%] text-small text-default-400">&nbsp;</span>
            <Pagination isCompact showControls showShadow color="primary" page={page} total={pages} onChange={setPage} />
            <div className="hidden sm:flex w-[30%] justify-end gap-2">&nbsp;</div>
          </div>
        ) : null}
        bottomContentPlacement="outside"
        sortDescriptor={sortDescriptor} onSortChange={setSortDescriptor}
        classNames={{ wrapper: "max-h-[calc(100vh-320px)]", table: "min-w-[700px]" }}
      >
        <TableHeader columns={headerColumnsToRender}>
          {(column) => (
            <TableColumn key={column.uid} align={column.uid === "actions" ? "center" : "start"} allowsSorting={column.sortable} className="bg-default-100 text-default-700 sticky top-0 z-10">
              {column.name}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody
          items={itemsToDisplay}
          isLoading={isLoading}
          loadingContent={<Spinner label="Cargando ubicaciones..." />}
          emptyContent={!isLoading && locations.length === 0 ? "No hay ubicaciones creadas." :
            !isLoading && filteredItems.length === 0 ? "No hay ubicaciones que coincidan con la búsqueda." : " "}
        >
          {(item) => (
            <TableRow key={item.id}>
              {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}