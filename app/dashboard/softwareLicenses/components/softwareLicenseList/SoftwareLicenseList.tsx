// app/dashboard/softwareLicenses/components/softwareLicenseList/SoftwareLicenseList.tsx
"use client";

import React, { useEffect, useState, useMemo, Key, useCallback } from "react";
import {
    Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
    Input, Button, DropdownTrigger, Dropdown, DropdownMenu, DropdownItem,
    Chip, User as HeroUIUser, Pagination, Selection, Spinner,
    SortDescriptor, Select, SelectItem, Tooltip, Link as HeroUILink
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { PlusIcon } from "@/components/icons/PlusIcon";
import { EditIcon } from "@/components/icons/EditIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { EyeIcon } from "@/components/icons/EyeIcon"; // Para Ver Detalles
import { SearchIcon } from "@/components/icons/SearchIcon";
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";

// La API ahora devuelve SoftwareLicenseListAPIRecord que incluye assigned_assets_count
import { SoftwareLicenseListAPIRecord } from "@/app/api/softwareLicenses/route";
import { COLUMNS_SOFTWARE_LICENSES, INITIAL_VISIBLE_LICENSE_COLUMNS, FILTERABLE_LICENSE_ATTRIBUTES, licenseStatusOptions } from "./data";
import { capitalize, formatDate, formatLicenseType, getLicenseChipStatus } from "./utils";

const ROWS_PER_PAGE_OPTIONS = [10, 15, 25, 50];

export default function SoftwareLicenseList() {
    const router = useRouter();
    const [licenses, setLicenses] = useState<SoftwareLicenseListAPIRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [filterSearchText, setFilterSearchText] = useState("");
    const [selectedFilterAttribute, setSelectedFilterAttribute] = useState<Key>(
        FILTERABLE_LICENSE_ATTRIBUTES[0]?.uid || "software_name"
    );
    // Nuevo: filtro específico para el estado de la licencia (Activa, Expirada, etc.)
    const [derivedStatusFilter, setDerivedStatusFilter] = useState<Selection>("all");


    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "software_name",
        direction: "ascending",
    });
    const [visibleColumns, setVisibleColumns] = useState<Selection>(
        new Set(INITIAL_VISIBLE_LICENSE_COLUMNS)
    );
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);

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

    const filteredItems = useMemo(() => {
        let filtered = [...licenses];

        // Filtrado por texto de búsqueda principal
        if (filterSearchText.trim() && selectedFilterAttribute) {
            const searchTerm = filterSearchText.toLowerCase();
            const attributeKey = selectedFilterAttribute as keyof SoftwareLicenseListAPIRecord;
            filtered = filtered.filter(license => {
                const value = license[attributeKey];
                if (value === null || value === undefined) return false;
                if (attributeKey === 'license_type') {
                    return formatLicenseType(String(value)).toLowerCase().includes(searchTerm);
                }
                if (attributeKey === 'status_derived') { // Filtrar por la etiqueta del estado calculado
                    return getLicenseChipStatus(license).label.toLowerCase().includes(searchTerm);
                }
                return String(value).toLowerCase().includes(searchTerm);
            });
        }

        // Filtrado por estado derivado (Activa, Expirada, etc.)
        if (derivedStatusFilter !== "all" && derivedStatusFilter.size > 0) {
            const selectedStatuses = Array.from(derivedStatusFilter);
            filtered = filtered.filter(license => {
                const statusInfo = getLicenseChipStatus(license);
                // Comparar con el 'uid' de licenseStatusOptions, que podría ser el label normalizado
                return selectedStatuses.includes(statusInfo.label.toLowerCase().replace(' ', '_'));
            });
        }

        return filtered;
    }, [licenses, filterSearchText, selectedFilterAttribute, derivedStatusFilter]);

    const sortedItems = useMemo(() => {
        return [...filteredItems].sort((a, b) => {
            let colA = sortDescriptor.column === "status_derived"
                ? getLicenseChipStatus(a).label
                : a[sortDescriptor.column as keyof SoftwareLicenseListAPIRecord];
            let colB = sortDescriptor.column === "status_derived"
                ? getLicenseChipStatus(b).label
                : b[sortDescriptor.column as keyof SoftwareLicenseListAPIRecord];

            const direction = sortDescriptor.direction === 'ascending' ? 1 : -1;

            if (sortDescriptor.column === 'purchase_date' || sortDescriptor.column === 'expiry_date' || sortDescriptor.column === 'created_at') {
                colA = colA ? new Date(colA as string).getTime() : -Infinity;
                colB = colB ? new Date(colB as string).getTime() : -Infinity;
            } else if (typeof colA === 'string') {
                colA = colA.toLowerCase();
            }
            if (typeof colB === 'string') { // Asegurar que colB también se trate como string si colA lo es
                colB = colB.toLowerCase();
            }

            if (colA === null || colA === undefined) return 1 * direction;
            if (colB === null || colB === undefined) return -1 * direction;

            if (colA < colB) return -1 * direction;
            if (colA > colB) return 1 * direction;
            return 0;
        });
    }, [sortDescriptor, filteredItems]);

    const itemsToDisplay = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return sortedItems.slice(start, end);
    }, [page, sortedItems, rowsPerPage]);

    const pages = Math.ceil(sortedItems.length / rowsPerPage);

    const handleDeleteLicense = async (licenseId: number, licenseName: string) => {
        // ... (sin cambios)
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
            case "assigned_assets_count": // NUEVO: Mostrar el conteo de activos
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

    const onSearchTextChange = useCallback((value?: string) => { setFilterSearchText(value || ""); setPage(1); }, []);
    const onClearSearch = useCallback(() => { setFilterSearchText(""); setPage(1); }, []);
    const onRowsPerPageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => { setRowsPerPage(Number(e.target.value)); setPage(1); }, []);

    const allTableColumns = useMemo(() => {
        const currentCols = [...COLUMNS_SOFTWARE_LICENSES];
        if (!currentCols.find(col => col.uid === 'status_derived')) {
            const expiryDateIndex = currentCols.findIndex(col => col.uid === 'expiry_date');
            currentCols.splice(expiryDateIndex !== -1 ? expiryDateIndex + 1 : currentCols.length - 1, 0, {
                uid: "status_derived", name: "Estado", sortable: true, defaultVisible: true, filterable: true // Hacerlo filtrable
            });
        }
        return currentCols;
    }, []);

    const headerColumnsToRender = useMemo(() => {
        return allTableColumns.filter(col => (visibleColumns as Set<React.Key>).has(col.uid));
    }, [visibleColumns, allTableColumns]);

    const toggleableColumnsForDropdown = useMemo(() => {
        return allTableColumns.filter(col => col.uid !== 'actions');
    }, [allTableColumns]);

    const topContent = useMemo(() => {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-end gap-3">
                    <div className="flex flex-col xs:flex-row items-end gap-3 w-full sm:w-auto flex-grow-[2] sm:flex-grow-0">
                        <Select
                            aria-label="Filtrar por atributo" placeholder="Buscar por..."
                            className="w-full xs:w-auto xs:min-w-[180px] md:max-w-xs"
                            selectedKeys={selectedFilterAttribute ? [selectedFilterAttribute] : undefined}
                            onSelectionChange={(keys) => setSelectedFilterAttribute(Array.from(keys as Set<Key>)[0] || FILTERABLE_LICENSE_ATTRIBUTES[0].uid)}
                            size="md"
                        >
                            {FILTERABLE_LICENSE_ATTRIBUTES.map(col => (
                                <SelectItem key={col.uid} value={col.uid} textValue={col.name}>{col.name}</SelectItem>
                            ))}
                        </Select>
                        <Input
                            isClearable className="w-full xs:w-auto xs:flex-grow"
                            placeholder={`Buscar en "${allTableColumns.find(c => c.uid === selectedFilterAttribute)?.name || 'atributo'}"...`}
                            startContent={<SearchIcon className="text-default-400" />}
                            value={filterSearchText} onClear={onClearSearch} onValueChange={onSearchTextChange} size="md"
                        />
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto justify-end sm:justify-start">
                        <Dropdown>
                            <DropdownTrigger>
                                <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">Estado Lic.</Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                disallowEmptySelection aria-label="Filtrar por Estado de Licencia" closeOnSelect={false}
                                selectedKeys={derivedStatusFilter} selectionMode="multiple"
                                onSelectionChange={setDerivedStatusFilter} // Actualizar el filtro de estado
                            >
                                {licenseStatusOptions.map((statusOpt) =>
                                    <DropdownItem key={statusOpt.uid} className="capitalize">{statusOpt.name}</DropdownItem>
                                )}
                            </DropdownMenu>
                        </Dropdown>
                        <Dropdown>
                            <DropdownTrigger>
                                <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">Columnas</Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                disallowEmptySelection aria-label="Table Columns" closeOnSelect={false}
                                selectedKeys={visibleColumns} selectionMode="multiple"
                                onSelectionChange={setVisibleColumns}
                            >
                                {toggleableColumnsForDropdown.map((column) => (
                                    <DropdownItem key={column.uid} className="capitalize">{column.name}</DropdownItem>
                                ))}
                            </DropdownMenu>
                        </Dropdown>
                        <Button color="primary" endContent={<PlusIcon />} onPress={() => router.push("/dashboard/softwareLicenses/add")}>
                            Agregar Licencia
                        </Button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-default-500 text-small">
                        Total {licenses.length} licencias. {sortedItems.length !== licenses.length ? `${sortedItems.length} coinciden con el filtro.` : ''}
                    </span>
                    <label className="flex items-center text-default-500 text-small">
                        Filas por página:
                        <select className="bg-transparent outline-none text-default-500 text-small ml-1" onChange={onRowsPerPageChange} value={rowsPerPage}>
                            {ROWS_PER_PAGE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                    </label>
                </div>
            </div>
        );
    }, [
        filterSearchText, visibleColumns, onSearchTextChange, onRowsPerPageChange, licenses.length, router,
        onClearSearch, rowsPerPage, selectedFilterAttribute, allTableColumns, toggleableColumnsForDropdown, sortedItems.length, derivedStatusFilter
    ]);

    // ... (bottomContent y return <Table>... se mantienen muy similares a la versión anterior del listado,
    //      asegurándose de usar headerColumnsToRender y itemsToDisplay) ...
    const bottomContent = useMemo(() => { /* ... (como en el UserList) ... */
        return (
            <div className="py-2 px-2 flex justify-between items-center">
                <span className="w-[30%] text-small text-default-400 hidden sm:block">&nbsp;</span>
                <Pagination
                    isCompact showControls showShadow color="primary"
                    page={page} total={pages} onChange={setPage}
                    className={pages <= 0 ? 'invisible' : ''}
                />
                <div className="hidden sm:flex w-[30%] justify-end gap-2">
                    <Button isDisabled={pages === 1 || page <= 1} size="sm" variant="flat" onPress={() => setPage(p => p - 1)}>Anterior</Button>
                    <Button isDisabled={pages === 1 || page >= pages} size="sm" variant="flat" onPress={() => setPage(p => p + 1)}>Siguiente</Button>
                </div>
            </div>
        );
    }, [page, pages]);

    if (isLoading && licenses.length === 0) {
        return (<div className="flex justify-center items-center h-[calc(100vh-200px)]"> <Spinner label="Cargando licencias..." color="primary" labelColor="primary" size="lg" /> </div>);
    }

    return (
        <div className="space-y-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestión de Licencias de Software</h1>
            <Table
                aria-label="Tabla de Licencias de Software" isHeaderSticky
                topContent={topContent} topContentPlacement="outside"
                bottomContent={pages > 0 && itemsToDisplay.length > 0 ? bottomContent : null}
                bottomContentPlacement="outside"
                sortDescriptor={sortDescriptor} onSortChange={setSortDescriptor}
                classNames={{ wrapper: "max-h-[calc(100vh-350px)]", table: "min-w-[1000px]" }}
            >
                <TableHeader columns={headerColumnsToRender}>
                    {(column) => (
                        <TableColumn
                            key={column.uid}
                            align={column.uid === "actions" || column.uid === "seats" || column.uid === "assigned_assets_count" ? "center" : "start"}
                            allowsSorting={column.sortable}
                            className="bg-default-100 text-default-700 sticky top-0 z-10"
                        >
                            {column.name}
                        </TableColumn>
                    )}
                </TableHeader>
                <TableBody
                    items={itemsToDisplay}
                    isLoading={isLoading && itemsToDisplay.length > 0}
                    loadingContent={<Spinner label="Actualizando lista..." />}
                    emptyContent={
                        !isLoading && licenses.length === 0 ? "No hay licencias registradas." :
                            !isLoading && sortedItems.length === 0 ? "Ninguna licencia coincide con los filtros." : " "
                    }
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