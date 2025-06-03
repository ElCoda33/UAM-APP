// app/dashboard/softwareLicenses/components/softwareLicenseList/SoftwareLicenseList.tsx
"use client";

import React, { useEffect, useState, useMemo, Key, useCallback } from "react";
import {
    Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
    Input, Button, DropdownTrigger, Dropdown, DropdownMenu, DropdownItem,
    Chip, User as HeroUIUser, Pagination, Selection, ChipProps, Spinner,
    SortDescriptor, Select, SelectItem, Tooltip
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { PlusIcon } from "@/components/icons/PlusIcon";
import { EditIcon } from "@/components/icons/EditIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
// import { EyeIcon } from "@/components/icons/EyeIcon"; // Para vista de detalles si se implementa
import { SearchIcon } from "@/components/icons/SearchIcon";
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";

import { SoftwareLicenseAPIRecord } from "@/app/api/softwareLicenses/route";
import { COLUMNS_SOFTWARE_LICENSES, INITIAL_VISIBLE_LICENSE_COLUMNS, FILTERABLE_LICENSE_ATTRIBUTES } from "./data";
import { capitalize, formatDate, formatLicenseType, getLicenseChipStatus } from "./utils";

const ROWS_PER_PAGE_OPTIONS = [10, 15, 25, 50];

export default function SoftwareLicenseList() {
    const router = useRouter();
    const [licenses, setLicenses] = useState<SoftwareLicenseAPIRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // const [error, setError] = useState<string | null>(null); // Podríamos usar toasts para errores

    const [filterSearchText, setFilterSearchText] = useState("");
    const [selectedFilterAttribute, setSelectedFilterAttribute] = useState<Key>(
        FILTERABLE_LICENSE_ATTRIBUTES[0]?.uid || "software_name"
    );
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
            // Podríamos pasar filtros al API si se implementa búsqueda en backend
            // const searchParams = new URLSearchParams();
            // if (filterSearchText && selectedFilterAttribute) {
            //    searchParams.append(String(selectedFilterAttribute), filterSearchText);
            // }
            // const response = await fetch(`/api/softwareLicenses?${searchParams.toString()}`);
            const response = await fetch(`/api/softwareLicenses`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || "Error al cargar licencias de software");
            }
            const data: SoftwareLicenseAPIRecord[] = await response.json();
            setLicenses(data);
        } catch (err: any) {
            // setError(err.message);
            toast.error(err.message || "No se pudieron cargar las licencias.");
        } finally {
            setIsLoading(false);
        }
    }, []); // Dependencias para re-fetch si el filtrado es en backend

    useEffect(() => {
        fetchLicenses();
    }, [fetchLicenses]);

    const filteredItems = useMemo(() => {
        if (!filterSearchText.trim()) return licenses;
        const searchTerm = filterSearchText.toLowerCase();
        const attributeKey = selectedFilterAttribute as keyof SoftwareLicenseAPIRecord;

        return licenses.filter(license => {
            const value = license[attributeKey];
            if (value === null || value === undefined) return false;

            if (attributeKey === 'license_type') {
                return formatLicenseType(String(value)).toLowerCase().includes(searchTerm);
            }
            // Para asset_name, assigned_user_name, supplier_name ya vienen como string del API
            return String(value).toLowerCase().includes(searchTerm);
        });
    }, [licenses, filterSearchText, selectedFilterAttribute]);

    const sortedItems = useMemo(() => {
        return [...filteredItems].sort((a, b) => {
            const col = sortDescriptor.column as keyof SoftwareLicenseAPIRecord;
            const direction = sortDescriptor.direction === 'ascending' ? 1 : -1;

            let valA = a[col];
            let valB = b[col];

            // Manejo especial para fechas
            if (col === 'purchase_date' || col === 'expiry_date' || col === 'created_at') {
                valA = valA ? new Date(valA as string).getTime() : -Infinity;
                valB = valB ? new Date(valB as string).getTime() : -Infinity;
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
            } else if (typeof valB === 'string') {
                valB = valB.toLowerCase();
            }

            if (valA === null || valA === undefined) return 1 * direction; // Null/undefined al final
            if (valB === null || valB === undefined) return -1 * direction; // Null/undefined al final

            if (valA < valB) return -1 * direction;
            if (valA > valB) return 1 * direction;
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
        const confirmDelete = window.confirm(`¿Estás seguro de que quieres eliminar la licencia para "${licenseName}" (ID: ${licenseId})?`);
        if (!confirmDelete) return;

        const toastId = toast.loading("Eliminando licencia...");
        try {
            const response = await fetch(`/api/softwareLicenses/${licenseId}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Error al eliminar la licencia");

            toast.success(result.message || "Licencia eliminada.", { id: toastId });
            fetchLicenses(); // Recargar datos
        } catch (err: any) {
            toast.error(err.message || "No se pudo eliminar la licencia.", { id: toastId });
        }
    };

    const renderCell = useCallback((license: SoftwareLicenseAPIRecord, columnKey: Key): React.ReactNode => {
        const cellValue = license[columnKey as keyof SoftwareLicenseAPIRecord];
        const statusInfo = getLicenseChipStatus(license);

        switch (columnKey) {
            case "software_name":
                return (
                    <HeroUIUser
                        name={license.software_name}
                        description={license.software_version || "Versión no especificada"}
                        avatarProps={{
                            // Podrías tener un generador de avatares o un ícono por defecto para software
                            name: license.software_name.charAt(0).toUpperCase(),
                            size: "sm",
                        }}
                    />
                );
            case "license_type":
                return <Chip size="sm" variant="flat">{formatLicenseType(cellValue as string)}</Chip>;
            case "seats":
                return <div className="text-right pr-2">{cellValue}</div>;
            case "purchase_date":
            case "expiry_date":
                return formatDate(cellValue as string);
            case "created_at":
                return formatDate(cellValue as string, true); // Incluir hora para created_at
            case "asset_name":
                return cellValue || <Chip size="sm" variant="bordered" color="default">No asignado</Chip>;
            case "assigned_user_name":
                return cellValue || <Chip size="sm" variant="bordered" color="default">No asignado</Chip>;
            case "license_key":
                return cellValue ? `${(cellValue as string).substring(0, 15)}...` : "N/A";
            case "status_derived": // Columna virtual para el chip de estado
                return <Chip size="sm" variant="flat" color={statusInfo.color}>{statusInfo.label}</Chip>;
            case "actions":
                return (
                    <div className="relative flex items-center justify-end gap-1">
                        <Tooltip content="Editar Licencia">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/softwareLicenses/${license.id}/edit`)}>
                                <EditIcon className="text-lg text-default-500" />
                            </Button>
                        </Tooltip>
                        {/* <Tooltip content="Ver Detalles">
                             <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/softwareLicenses/${license.id}`)}> <EyeIcon /> </Button>
                        </Tooltip> */}
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

    // Columnas dinámicas para el Dropdown de visibilidad y la tabla
    const allTableColumns = useMemo(() => {
        // Añadir una columna virtual para el estado derivado si se desea
        const currentCols = [...COLUMNS_SOFTWARE_LICENSES];
        if (!currentCols.find(col => col.uid === 'status_derived')) {
            currentCols.splice(currentCols.findIndex(col => col.uid === 'expiry_date') + 1, 0, {
                uid: "status_derived", name: "Estado (Calculado)", sortable: true, defaultVisible: true, filterable: false
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
                            aria-label="Filtrar por atributo"
                            placeholder="Buscar por..."
                            className="w-full xs:w-auto xs:min-w-[180px] md:max-w-xs"
                            selectedKeys={selectedFilterAttribute ? [selectedFilterAttribute] : []}
                            onSelectionChange={(keys) => setSelectedFilterAttribute(Array.from(keys as Set<Key>)[0] || FILTERABLE_LICENSE_ATTRIBUTES[0].uid)}
                            size="md"
                        >
                            {FILTERABLE_LICENSE_ATTRIBUTES.map(col => (
                                <SelectItem key={col.uid} value={col.uid} textValue={col.name}>{col.name}</SelectItem>
                            ))}
                        </Select>
                        <Input
                            isClearable
                            className="w-full xs:w-auto xs:flex-grow"
                            placeholder={`Buscar en "${allTableColumns.find(c => c.uid === selectedFilterAttribute)?.name || 'atributo'}"...`}
                            startContent={<SearchIcon className="text-default-400" />}
                            value={filterSearchText}
                            onClear={onClearSearch}
                            onValueChange={onSearchTextChange}
                            size="md"
                        />
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto justify-end sm:justify-start">
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
                        Total {licenses.length} licencias. {filteredItems.length !== licenses.length ? `${filteredItems.length} coinciden con el filtro.` : ''}
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
        onClearSearch, rowsPerPage, selectedFilterAttribute, allTableColumns, toggleableColumnsForDropdown, filteredItems.length
    ]);

    const bottomContent = useMemo(() => {
        return (
            <div className="py-2 px-2 flex justify-between items-center">
                <span className="w-[30%] text-small text-default-400 hidden sm:block">&nbsp;</span> {/* Placeholder */}
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
                aria-label="Tabla de Licencias de Software"
                isHeaderSticky
                topContent={topContent}
                topContentPlacement="outside"
                bottomContent={pages > 0 && itemsToDisplay.length > 0 ? bottomContent : null}
                bottomContentPlacement="outside"
                sortDescriptor={sortDescriptor}
                onSortChange={setSortDescriptor}
                classNames={{ wrapper: "max-h-[calc(100vh-350px)]", table: "min-w-[1000px]" }}
            >
                <TableHeader columns={headerColumnsToRender}>
                    {(column) => (
                        <TableColumn
                            key={column.uid}
                            align={column.uid === "actions" || column.uid === "seats" ? "center" : "start"}
                            allowsSorting={column.sortable}
                            className="bg-default-100 text-default-700 sticky top-0 z-10"
                        >
                            {column.name}
                        </TableColumn>
                    )}
                </TableHeader>
                <TableBody
                    items={itemsToDisplay}
                    isLoading={isLoading && itemsToDisplay.length > 0} // Mostrar spinner si se está recargando y hay items
                    loadingContent={<Spinner label="Actualizando lista..." />}
                    emptyContent={
                        !isLoading && licenses.length === 0 ? "No hay licencias registradas." :
                            !isLoading && filteredItems.length === 0 ? "Ninguna licencia coincide con los filtros." : " "
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