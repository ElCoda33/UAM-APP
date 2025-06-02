// app/dashboard/companies/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
    Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
    Chip, Tooltip, Button, Link as HeroUILink, Spinner,
    Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
    Input, Pagination, SortDescriptor, Selection
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { PlusIcon } from "@/components/icons/PlusIcon";
import { EditIcon } from "@/components/icons/EditIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { EyeIcon } from "@/components/icons/EyeIcon"; // Para un futuro "Ver Detalles"
import { SearchIcon } from "@/components/icons/SearchIcon";
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";
import type { CompanyRecord } from "@/app/api/companies/route"; // Importa la interfaz

const companyColumnsDefinition = [
    { uid: "id", name: "ID", sortable: true, defaultVisible: false },
    { uid: "legal_name", name: "Razón Social", sortable: true, defaultVisible: true },
    { uid: "trade_name", name: "Nombre Fantasía", sortable: true, defaultVisible: true },
    { uid: "tax_id", name: "RUT (Tax ID)", sortable: true, defaultVisible: true },
    { uid: "email", name: "Email", sortable: true, defaultVisible: true },
    { uid: "phone_number", name: "Teléfono", sortable: true, defaultVisible: true },
    { uid: "actions", name: "Acciones", sortable: false, defaultVisible: true },
];

const INITIAL_VISIBLE_COLUMNS_COMPANIES = companyColumnsDefinition
    .filter(col => col.defaultVisible)
    .map(col => col.uid);

export default function CompaniesPage() {
    const router = useRouter();
    const [companies, setCompanies] = useState<CompanyRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filterValue, setFilterValue] = useState("");
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: "legal_name", direction: "ascending" });
    const [visibleColumns, setVisibleColumns] = useState<Selection>(new Set(INITIAL_VISIBLE_COLUMNS_COMPANIES));
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const fetchCompaniesData = useCallback(async (searchTerm: string = "") => {
        setIsLoading(true);
        setError(null);
        try {
            const apiUrl = searchTerm ? `/api/companies?search=${encodeURIComponent(searchTerm)}` : "/api/companies";
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || "Error al cargar empresas");
            }
            const data: CompanyRecord[] = await response.json();
            setCompanies(data);
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message || "No se pudieron cargar las empresas.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Carga inicial y cuando el filtro de búsqueda cambia (si se implementa filtrado por API)
        // Por ahora, el filtrado es en cliente, así que solo carga inicial.
        fetchCompaniesData(filterValue);
    }, [fetchCompaniesData, filterValue]); // Re-fetch if filterValue changes (for server-side filtering)

    const filteredItems = useMemo(() => {
        let filteredCompanies = [...companies];
        // El filtrado ya se hace en la API si se pasa 'searchTerm',
        // pero si no, o para refinar más en cliente:
        // if (filterValue && !searchParams.get('search')) { // Si el filtro es solo cliente
        //     filteredCompanies = filteredCompanies.filter((company) =>
        //         (company.legal_name || "").toLowerCase().includes(filterValue.toLowerCase()) ||
        //         (company.trade_name || "").toLowerCase().includes(filterValue.toLowerCase()) ||
        //         (company.tax_id || "").toLowerCase().includes(filterValue.toLowerCase()) ||
        //         (company.email || "").toLowerCase().includes(filterValue.toLowerCase())
        //     );
        // }
        return filteredCompanies; // Si la API ya filtró, esto solo devuelve companies.
    }, [companies /*, filterValue */]); // filterValue si es filtrado cliente

    const sortedItems = useMemo(() => {
        return [...filteredItems].sort((a, b) => {
            const first = a[sortDescriptor.column as keyof CompanyRecord];
            const second = b[sortDescriptor.column as keyof CompanyRecord];
            let cmp = (first < second ? -1 : 1) * (sortDescriptor.direction === "descending" ? -1 : 1);
            if (first == null) cmp = -1;
            if (second == null) cmp = 1;
            if (typeof first === 'number' && typeof second === 'number') {
                cmp = (first - second) * (sortDescriptor.direction === "descending" ? -1 : 1);
            }
            return cmp;
        });
    }, [sortDescriptor, filteredItems]);

    const itemsToDisplay = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return sortedItems.slice(start, end);
    }, [page, sortedItems, rowsPerPage]);

    const pages = Math.ceil(filteredItems.length / rowsPerPage);

    const handleDeleteCompany = async (companyId: number) => {
        const confirmDelete = window.confirm(`¿Estás seguro de eliminar la empresa ID ${companyId}? Los activos asociados tendrán su proveedor puesto a NULO.`);
        if (!confirmDelete) return;

        const toastId = toast.loading("Eliminando empresa...");
        try {
            const response = await fetch(`/api/companies/${companyId}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Error al eliminar empresa");
            toast.success(result.message || "Empresa eliminada.", { id: toastId });
            fetchCompaniesData(filterValue); // Recargar datos
        } catch (err: any) {
            toast.error(err.message || "No se pudo eliminar la empresa.", { id: toastId });
        }
    };

    const renderCell = useCallback((company: CompanyRecord, columnKey: React.Key) => {
        const cellValue = company[columnKey as keyof CompanyRecord];
        switch (columnKey) {
            case "legal_name":
                return (
                    <div className="flex flex-col">
                        <span className="font-medium">{company.legal_name}</span>
                        {company.trade_name && company.trade_name !== company.legal_name && (
                            <span className="text-xs text-default-500">{company.trade_name}</span>
                        )}
                    </div>
                );
            case "actions":
                return (
                    <div className="relative flex items-center gap-1.5">
                        <Tooltip content="Editar Empresa">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/companies/${company.id}/edit`)}>
                                <EditIcon className="text-lg text-default-500" />
                            </Button>
                        </Tooltip>
                        {/* <Tooltip content="Ver Detalles (Implementación pendiente)">
                           <Button isIconOnly size="sm" variant="light" onPress={() => toast("Vista de detalles pendiente.")} >
                                <EyeIcon className="text-lg text-default-500" />
                            </Button>
                        </Tooltip> */}
                        <Tooltip color="danger" content="Eliminar Empresa">
                            <Button isIconOnly size="sm" variant="light" onPress={() => handleDeleteCompany(company.id)}>
                                <DeleteIcon className="text-lg text-danger" />
                            </Button>
                        </Tooltip>
                    </div>
                );
            default:
                return cellValue != null ? String(cellValue) : "N/A";
        }
    }, [router, fetchCompaniesData, filterValue]); // Añadido filterValue a dependencias de fetch

    const onSearchChange = useCallback((value?: string) => {
        setFilterValue(value || "");
        setPage(1);
        // fetchCompaniesData(value || ""); // Llamar aquí si el filtrado es por API
    }, [/*fetchCompaniesData*/]); // Descomentar fetchCompaniesData si se usa para API filtering

    const onClear = useCallback(() => {
        setFilterValue("");
        setPage(1);
        // fetchCompaniesData(""); // Llamar aquí si el filtrado es por API
    }, [/*fetchCompaniesData*/]);

    const topContent = useMemo(() => {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex justify-between gap-3 items-end flex-wrap">
                    <Input
                        isClearable
                        className="w-full sm:max-w-xs"
                        placeholder="Buscar empresa..."
                        startContent={<SearchIcon className="text-default-300" />}
                        value={filterValue}
                        onClear={onClear}
                        onValueChange={onSearchChange} // Esto dispara el useEffect que llama a fetchCompaniesData
                        size="md"
                    />
                    <div className="flex gap-3">
                        <Dropdown>
                            <DropdownTrigger>
                                <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">
                                    Columnas
                                </Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                disallowEmptySelection aria-label="Table Columns" closeOnSelect={false}
                                selectedKeys={visibleColumns} selectionMode="multiple" onSelectionChange={setVisibleColumns}
                            >
                                {companyColumnsDefinition.filter(col => col.uid !== 'actions').map((column) => (
                                    <DropdownItem key={column.uid} className="capitalize">{column.name}</DropdownItem>
                                ))}
                            </DropdownMenu>
                        </Dropdown>
                        <Button color="primary" endContent={<PlusIcon />} onPress={() => router.push("/dashboard/companies/add")}>
                            Agregar Empresa
                        </Button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-default-400 text-small">Total {companies.length} empresas. {filteredItems.length !== companies.length ? `${filteredItems.length} encontradas.` : ''}</span>
                    <label className="flex items-center text-default-400 text-small">
                        Filas por página:
                        <select
                            className="bg-transparent outline-none text-default-400 text-small"
                            value={rowsPerPage}
                            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                        >
                            {[5, 10, 15, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                    </label>
                </div>
            </div>
        );
    }, [filterValue, onSearchChange, onClear, visibleColumns, companies.length, filteredItems.length, rowsPerPage, router]);

    const headerColumnsToRender = useMemo(() => {
        return companyColumnsDefinition.filter(col => (visibleColumns as Set<React.Key>).has(col.uid) || col.uid === 'actions');
    }, [visibleColumns]);

    return (
        <div className="space-y-4 p-4 md:p-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestión de Empresas</h1>
            <Table
                aria-label="Tabla de Empresas" isHeaderSticky
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
                classNames={{ wrapper: "max-h-[calc(100vh-320px)]", table: "min-w-[700px]" }} // Ajusta max-h
            >
                <TableHeader columns={headerColumnsToRender}>
                    {(column) => (
                        <TableColumn
                            key={column.uid}
                            align={column.uid === "actions" ? "center" : "start"}
                            allowsSorting={column.sortable}
                            className="bg-default-100 text-default-700 sticky top-0 z-10"
                        >
                            {column.name}
                        </TableColumn>
                    )}
                </TableHeader>
                <TableBody
                    items={itemsToDisplay}
                    isLoading={isLoading}
                    loadingContent={<Spinner label="Cargando empresas..." />}
                    emptyContent={!isLoading && companies.length === 0 ? "No hay empresas creadas." :
                        !isLoading && filteredItems.length === 0 ? "No hay empresas que coincidan con la búsqueda." : " "}
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