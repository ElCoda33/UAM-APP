// app/dashboard/sections/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
    Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
    User, Chip, Tooltip, Button, Link as HeroUILink, Spinner,
    Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
    Input, Pagination, SortDescriptor, Selection
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { PlusIcon } from "@/components/icons/PlusIcon"; //
import { EditIcon } from "@/components/icons/EditIcon"; //
import { DeleteIcon } from "@/components/icons/DeleteIcon"; //
import { EyeIcon } from "@/components/icons/EyeIcon"; //
import { SearchIcon } from "@/components/icons/SearchIcon"; //
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon"; //
import type { SectionRecord } from "@/app/api/sections/route"; // Importa la interfaz

const sectionColumns = [
    { uid: "id", name: "ID", sortable: true, defaultVisible: true },
    { uid: "name", name: "Nombre", sortable: true, defaultVisible: true },
    { uid: "management_level", name: "Nivel Conducción", sortable: true, defaultVisible: true },
    { uid: "email", name: "Email", sortable: true, defaultVisible: true },
    { uid: "parent_section_name", name: "Dependencia (Sección Padre)", sortable: true, defaultVisible: true },
    { uid: "actions", name: "Acciones", sortable: false, defaultVisible: true },
];

const INITIAL_VISIBLE_COLUMNS = sectionColumns
    .filter(col => col.defaultVisible)
    .map(col => col.uid);

export default function SectionsPage() {
    const router = useRouter();
    const [sections, setSections] = useState<SectionRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filterValue, setFilterValue] = useState("");
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: "name", direction: "ascending" });
    const [visibleColumns, setVisibleColumns] = useState<Selection>(new Set(INITIAL_VISIBLE_COLUMNS));
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const fetchSectionsData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Podrías añadir el filterValue a la URL si tu API GET /api/sections lo soporta
            // const apiUrl = filterValue ? `/api/sections?name=${encodeURIComponent(filterValue)}` : "/api/sections";
            const apiUrl = "/api/sections"; // Por ahora, filtrado en cliente
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || "Error al cargar secciones");
            }
            const data: SectionRecord[] = await response.json();
            setSections(data);
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message || "No se pudieron cargar las secciones.");
        } finally {
            setIsLoading(false);
        }
    }, []); // Podrías añadir filterValue aquí si el filtrado es por API

    useEffect(() => {
        fetchSectionsData();
    }, [fetchSectionsData]);

    const filteredItems = useMemo(() => {
        let filteredSections = [...sections];
        if (filterValue) {
            filteredSections = filteredSections.filter((section) =>
                section.name.toLowerCase().includes(filterValue.toLowerCase()) ||
                (section.email || "").toLowerCase().includes(filterValue.toLowerCase()) ||
                (section.parent_section_name || "").toLowerCase().includes(filterValue.toLowerCase())
            );
        }
        return filteredSections;
    }, [sections, filterValue]);

    const sortedItems = useMemo(() => {
        return [...filteredItems].sort((a, b) => {
            const first = a[sortDescriptor.column as keyof SectionRecord];
            const second = b[sortDescriptor.column as keyof SectionRecord];
            let cmp = (first < second ? -1 : 1) * (sortDescriptor.direction === "descending" ? -1 : 1);
            // Manejo simple para números y strings. Podrías necesitar lógica más compleja.
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

    const handleDeleteSection = async (sectionId: number) => {
        const confirmDelete = window.confirm(`¿Estás seguro de que quieres eliminar la sección ID ${sectionId}? Esto podría afectar a otras entidades relacionadas.`);
        if (!confirmDelete) return;

        const toastId = toast.loading("Eliminando sección...");
        try {
            const response = await fetch(`/api/sections/${sectionId}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || "Error al eliminar la sección");
            }
            toast.success(result.message || "Sección eliminada.", { id: toastId });
            fetchSectionsData(); // Recargar datos
        } catch (err: any) {
            toast.error(err.message || "No se pudo eliminar la sección.", { id: toastId });
            console.error("Error deleting section:", err);
        }
    };

    const renderCell = useCallback((section: SectionRecord, columnKey: React.Key) => {
        const cellValue = section[columnKey as keyof SectionRecord];
        switch (columnKey) {
            case "name":
                return (
                    <User
                        name={section.name}
                        description={section.email || "Sin email"}
                    // avatarProps={{ src: "url_del_avatar_seccion_si_existiera" }}
                    >
                        {section.name}
                    </User>
                );
            case "actions":
                return (
                    <div className="relative flex items-center gap-1.5">
                        <Tooltip content="Editar Sección">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/sections/${section.id}/edit`)}>
                                <EditIcon className="text-lg text-default-500" />
                            </Button>
                        </Tooltip>
                        <Tooltip content="Ver Detalles (Implementación pendiente)">
                            <Button isIconOnly size="sm" variant="light" onPress={() => router.push(`/dashboard/sections/${section.id}`)} >
                                <EyeIcon className="text-lg text-default-500" />
                            </Button>
                        </Tooltip>
                        <Tooltip color="danger" content="Eliminar Sección">
                            <Button isIconOnly size="sm" variant="light" onPress={() => handleDeleteSection(section.id)}>
                                <DeleteIcon className="text-lg text-danger" />
                            </Button>
                        </Tooltip>
                    </div>
                );
            default:
                return cellValue != null ? String(cellValue) : "N/A";
        }
    }, [router, fetchSectionsData]);

    const onSearchChange = useCallback((value?: string) => {
        setFilterValue(value || "");
        setPage(1);
    }, []);

    const onClear = useCallback(() => {
        setFilterValue("");
        setPage(1);
    }, []);

    const topContent = useMemo(() => {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex justify-between gap-3 items-end flex-wrap">
                    <Input
                        isClearable
                        className="w-full sm:max-w-xs"
                        placeholder="Buscar por nombre, email, dependencia..."
                        startContent={<SearchIcon className="text-default-300" />}
                        value={filterValue}
                        onClear={onClear}
                        onValueChange={onSearchChange}
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
                                disallowEmptySelection
                                aria-label="Table Columns"
                                closeOnSelect={false}
                                selectedKeys={visibleColumns}
                                selectionMode="multiple"
                                onSelectionChange={setVisibleColumns}
                            >
                                {sectionColumns.filter(col => col.uid !== 'actions').map((column) => ( // Excluir 'actions' de aquí
                                    <DropdownItem key={column.uid} className="capitalize">
                                        {column.name}
                                    </DropdownItem>
                                ))}
                            </DropdownMenu>
                        </Dropdown>
                        <Button color="primary" endContent={<PlusIcon />} onPress={() => router.push("/dashboard/sections/add")}>
                            Agregar Sección
                        </Button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-default-400 text-small">Total {sections.length} secciones. {filteredItems.length !== sections.length ? `${filteredItems.length} encontradas.` : ''}</span>
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
    }, [filterValue, onSearchChange, onClear, visibleColumns, sections.length, filteredItems.length, rowsPerPage, router]);

    const headerColumnsToRender = useMemo(() => {
        if (visibleColumns === "all") return sectionColumns; // No debería pasar con Set
        return sectionColumns.filter(col => (visibleColumns as Set<React.Key>).has(col.uid) || col.uid === 'actions');
    }, [visibleColumns]);


    return (
        <div className="space-y-4 p-4 md:p-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestión de Secciones</h1>
            <Table
                aria-label="Tabla de Secciones"
                isHeaderSticky
                topContent={topContent}
                topContentPlacement="outside"
                bottomContent={pages > 0 && itemsToDisplay.length > 0 ? (
                    <div className="py-2 px-2 flex justify-between items-center">
                        <span className="w-[30%] text-small text-default-400">&nbsp;</span>
                        <Pagination isCompact showControls showShadow color="primary" page={page} total={pages} onChange={setPage} />
                        <div className="hidden sm:flex w-[30%] justify-end gap-2">&nbsp;</div>
                    </div>
                ) : null}
                bottomContentPlacement="outside"
                sortDescriptor={sortDescriptor}
                onSortChange={setSortDescriptor}
                classNames={{ wrapper: "max-h-[calc(100vh-300px)]", table: "min-w-[700px]" }}
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
                    loadingContent={<Spinner label="Cargando secciones..." />}
                    emptyContent={!isLoading && sections.length === 0 ? "No hay secciones creadas." :
                        !isLoading && filteredItems.length === 0 ? "No hay secciones que coincidan con los filtros." : " "}
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