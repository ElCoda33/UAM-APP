// app/dashboard/users/components/userList/UserList.tsx
"use client";

import React, { useEffect, useState, useMemo, Key, useCallback } from "react";
import {
    Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
    User as HeroUIUser, // Renombrar si es necesario para evitar colisión
    Chip, Tooltip, Button, Link as NextUILink, Spinner,
    Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
    Input, Select, SelectItem, SortDescriptor, Pagination, Selection
} from "@heroui/react";
import { useRouter }
    from "next/navigation";
import { toast } from "react-hot-toast";

import { EditIcon } from "@/components/icons/EditIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { EyeIcon } from "@/components/icons/EyeIcon";
import { PlusIcon } from "@/components/icons/PlusIcon";
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";
import { SearchIcon } from "@/components/icons/SearchIcon";

import type { UserDetailsFromDB } from "@/lib/data/users"; // Tipo de la API
import { USER_COLUMNS_DEFINITION, INITIAL_VISIBLE_USER_COLUMNS, FILTERABLE_USER_ATTRIBUTES, statusColorMap, userStatusOptionsForFilter } from "./data";
import { capitalize, formatDate, formatUserRoles, formatUserStatus } from "./utils";
import { useSession } from "next-auth/react";

const ROWS_PER_PAGE_OPTIONS = [10, 15, 25, 50]; // Opciones para filas por página

export default function UserList() {
    const router = useRouter();
    const [users, setUsers] = useState<UserDetailsFromDB[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [filterSearchText, setFilterSearchText] = useState<string>("");
    const [selectedFilterAttribute, setSelectedFilterAttribute] = useState<Key>(
        FILTERABLE_USER_ATTRIBUTES[0]?.uid || "user" // Default al primer atributo filtrable o 'user'
    );
    const [statusFilter, setStatusFilter] = useState<Selection>("all"); // Para el filtro de estado específico

    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: 'user', // Columna de ordenación por defecto (nombre completo)
        direction: 'ascending',
    });
    const [visibleColumns, setVisibleColumns] = useState<Selection>(
        new Set(INITIAL_VISIBLE_USER_COLUMNS)
    );
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/users'); // API para obtener usuarios
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || "Error al cargar usuarios");
            }
            const data: UserDetailsFromDB[] = await res.json();
            setUsers(data);
        } catch (err: any) {
            toast.error(err.message || "No se pudieron cargar los usuarios.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const filteredItems = useMemo(() => {
        let filteredUsers = [...users];

        // Filtrado por texto de búsqueda principal
        if (filterSearchText.trim() && selectedFilterAttribute) {
            const searchTerm = filterSearchText.toLowerCase();
            filteredUsers = filteredUsers.filter(user => {
                let attributeValueString: string;
                switch (selectedFilterAttribute) {
                    case "user":
                        attributeValueString = `${user.first_name || ""} ${user.last_name || ""}`.trim().toLowerCase();
                        break;
                    case "email": attributeValueString = (user.email || "").toLowerCase(); break;
                    case "roles": attributeValueString = (user.roles || "").toLowerCase(); break; // roles es string concatenado
                    case "section_name": attributeValueString = (user.section_name || "").toLowerCase(); break;
                    case "status":
                        attributeValueString = formatUserStatus(user.status).toLowerCase();
                        break;
                    case "national_id": attributeValueString = (user.national_id || "").toLowerCase(); break;
                    case "email_verified_at":
                        attributeValueString = user.email_verified_at ? "verificado" : "no verificado";
                        break;
                    default:
                        const rawValue = user[selectedFilterAttribute as keyof UserDetailsFromDB];
                        attributeValueString = rawValue !== null && rawValue !== undefined ? String(rawValue).toLowerCase() : "";
                        break;
                }
                return attributeValueString.includes(searchTerm);
            });
        }

        // Filtrado por estado (si se seleccionó alguno)
        if (statusFilter !== "all" && statusFilter.size > 0) {
             filteredUsers = filteredUsers.filter(user =>
                Array.from(statusFilter).includes(user.status || "")
            );
        }
        return filteredUsers;
    }, [users, filterSearchText, selectedFilterAttribute, statusFilter]);

    const sortedUsers = useMemo(() => {
        return [...filteredItems].sort((a, b) => {
            const col = sortDescriptor.column as keyof UserDetailsFromDB;
            const direction = sortDescriptor.direction === 'ascending' ? 1 : -1;
            let valA = a[col];
            let valB = b[col];

            if (col === 'user') { // Comparación especial para nombre completo
                valA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
                valB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
            } else if (col === 'birth_date' || col === 'email_verified_at' || col === 'created_at' || col === 'updated_at') {
                valA = valA ? new Date(valA as string).getTime() : -Infinity; // Tratar nulls/undefined como más antiguos
                valB = valB ? new Date(valB as string).getTime() : -Infinity;
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
            } else if (typeof valB === 'string') {
                valB = valB.toLowerCase();
            }
            
            if (valA === null || valA === undefined) return 1 * direction;
            if (valB === null || valB === undefined) return -1 * direction;

            if (valA < valB) return -1 * direction;
            if (valA > valB) return 1 * direction;
            return 0;
        });
    }, [sortDescriptor, filteredItems]);

    const itemsToDisplay = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return sortedUsers.slice(start, end);
    }, [page, sortedUsers, rowsPerPage]);

    const pages = Math.ceil(sortedUsers.length / rowsPerPage);

    const handleDeleteUser = async (userId: number, userName: string) => {
        if (String(userId) === session?.user?.id) { // Obtener session de useSession si es necesario
            toast.error("No puedes eliminar tu propia cuenta.");
            return;
        }
        const confirmDelete = window.confirm(`¿Estás seguro de que quieres eliminar (deshabilitar) al usuario "${userName}" (ID: ${userId})?`);
        if (!confirmDelete) return;

        const toastId = toast.loading("Eliminando usuario...");
        try {
            const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' }); ///route.ts]
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Error al eliminar el usuario");
            
            toast.success(result.message || "Usuario eliminado/deshabilitado.", { id: toastId });
            fetchUsers(); // Recargar datos
        } catch (err: any) {
            toast.error(err.message || "No se pudo eliminar el usuario.", { id: toastId });
        }
    };
    
    const { data: session } = useSession(); // Para verificar si el usuario es el mismo que el logueado

    const renderCell = useCallback((user: UserDetailsFromDB, columnKey: Key): React.ReactNode => {
        const cellValue = user[columnKey as keyof UserDetailsFromDB];
        const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Usuario Sin Nombre";

        switch (columnKey) {
            case "user":
                return (<HeroUIUser avatarProps={{ radius: "lg", src: user.avatar_url || undefined, size: "sm", name: fullName.charAt(0) }} description={user.email || "Sin email"} name={fullName} />);
            case "email":
                return <span className="text-sm">{user.email || "N/A"}</span>;
            case "roles":
                const rolesArray = formatUserRoles(user.roles); // user.roles es string de nombres
                if (rolesArray.length === 0) return <Chip size="sm" variant="flat">Sin roles</Chip>;
                return (<div className="flex flex-col gap-1"> {rolesArray.map((role, index) => (<Chip className="capitalize" size="sm" variant="flat" key={`${user.id}-role-${index}-${role}`} color="secondary"> {role} </Chip>))} </div>);
            case "section_name":
                return <span className="text-sm">{user.section_name || "Sin sección"}</span>;
            case "status":
                return (<Chip className="capitalize" color={statusColorMap[user.status || "default"] || "default"} size="sm" variant="flat"> {formatUserStatus(user.status)} </Chip>);
            case "national_id":
                return <span className="text-sm">{user.national_id || "N/A"}</span>;
            case "birth_date":
                return <span className="text-sm">{formatDate(user.birth_date)}</span>;
            case "email_verified_at":
                return user.email_verified_at ? (<Chip color="success" variant="flat" size="sm" startContent={<span className="mr-1">✔️</span>}>Verificado ({formatDate(user.email_verified_at)})</Chip>) : (<Chip color="warning" variant="flat" size="sm" startContent={<span className="mr-1">✖️</span>}>No Verificado</Chip>);
            case "created_at":
                return <span className="text-sm">{formatDate(user.created_at, true)}</span>;
            case "updated_at":
                return <span className="text-sm">{formatDate(user.updated_at, true)}</span>;
            case "actions":
                return (
                    <div className="relative flex items-center justify-end gap-1 sm:gap-2">
                        <Tooltip content="Ver detalles del usuario">
                            <Button isIconOnly size="sm" variant="light" as={NextUILink} href={`/dashboard/users/${user.id}`}>
                                <EyeIcon className="text-lg text-default-400" />
                            </Button>
                        </Tooltip>
                        <Tooltip content="Editar usuario">
                            <Button isIconOnly size="sm" variant="light" as={NextUILink} href={`/dashboard/users/${user.id}/edit`}>
                                <EditIcon className="text-lg text-default-400" />
                            </Button>
                        </Tooltip>
                        {String(user.id) !== session?.user?.id && ( // No permitir auto-eliminación
                            <Tooltip color="danger" content="Eliminar (Deshabilitar) usuario">
                                <Button isIconOnly size="sm" variant="light" onPress={() => handleDeleteUser(user.id, fullName)}>
                                    <DeleteIcon className="text-lg text-danger" />
                                </Button>
                            </Tooltip>
                        )}
                    </div>
                );
            default:
                const val = String(cellValue);
                return <span className="text-sm">{val !== "null" && val !== "undefined" ? val : "N/A"}</span>;
        }
    }, [router, fetchUsers, session?.user?.id]);

    const onSearchTextChange = useCallback((value?: string) => { setFilterSearchText(value || ""); setPage(1); }, []);
    const onClearSearch = useCallback(() => { setFilterSearchText(""); setPage(1); }, []);
    const onRowsPerPageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => { setRowsPerPage(Number(e.target.value)); setPage(1); }, []);
    
    const headerColumnsToRender = useMemo(() => {
        return USER_COLUMNS_DEFINITION.filter(col => (visibleColumns as Set<React.Key>).has(col.uid));
    }, [visibleColumns]);

    const toggleableColumnsForDropdown = useMemo(() => {
        return USER_COLUMNS_DEFINITION.filter(col => col.uid !== 'actions'); // Acciones siempre visibles o manejado por `defaultVisible`
    }, []);

    const topContent = useMemo(() => {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-end gap-3">
                    <div className="flex flex-col xs:flex-row items-end gap-3 w-full sm:w-auto flex-grow-[2] sm:flex-grow-0">
                        <Select
                            aria-label="Filtrar por atributo"
                            placeholder="Buscar por..."
                            className="w-full xs:w-auto xs:min-w-[180px] md:max-w-xs"
                            selectedKeys={selectedFilterAttribute ? [selectedFilterAttribute] : undefined}
                            onSelectionChange={(keys) => setSelectedFilterAttribute(Array.from(keys as Set<Key>)[0] || FILTERABLE_USER_ATTRIBUTES[0].uid)}
                            size="md"
                        >
                            {FILTERABLE_USER_ATTRIBUTES.map(col => (
                                <SelectItem key={col.uid} value={col.uid} textValue={col.name}>{col.name}</SelectItem>
                            ))}
                        </Select>
                        <Input
                            isClearable
                            className="w-full xs:w-auto xs:flex-grow"
                            placeholder={`Buscar en "${USER_COLUMNS_DEFINITION.find(c => c.uid === selectedFilterAttribute)?.name || 'atributo'}"...`}
                            startContent={<SearchIcon className="text-default-400 pointer-events-none flex-shrink-0" />}
                            value={filterSearchText}
                            onClear={onClearSearch}
                            onValueChange={onSearchTextChange}
                            size="md"
                        />
                    </div>
                     <div className="flex gap-3 w-full sm:w-auto justify-end sm:justify-start">
                        <Dropdown>
                            <DropdownTrigger>
                                <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">Estado</Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                disallowEmptySelection aria-label="Filtrar por Estado" closeOnSelect={false}
                                selectedKeys={statusFilter} selectionMode="multiple"
                                onSelectionChange={setStatusFilter}
                            >
                                {userStatusOptionsForFilter.map((statusOpt) => <DropdownItem key={statusOpt.key} className="capitalize">{statusOpt.label}</DropdownItem>)}
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
                        <Button color="primary" endContent={<PlusIcon />} onPress={() => router.push("/dashboard/users/add")}>
                            Añadir Usuario
                        </Button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-default-500 text-small">
                        Total {users.length} usuarios. {sortedUsers.length !== users.length ? `${sortedUsers.length} coinciden con el filtro.` : ''}
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
        filterSearchText, visibleColumns, onSearchTextChange, onRowsPerPageChange, users.length, router,
        onClearSearch, rowsPerPage, selectedFilterAttribute, toggleableColumnsForDropdown, sortedUsers.length, statusFilter
    ]);
    
    const bottomContent = useMemo(() => {
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


    if (isLoading && users.length === 0) {
         return (<div className="flex justify-center items-center h-[calc(100vh-200px)]"> <Spinner label="Cargando usuarios..." color="primary" labelColor="primary" size="lg" /> </div>);
    }

    return (
        <div className="space-y-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestión de Usuarios</h1>
            <Table
                aria-label="Tabla de Usuarios"
                isHeaderSticky
                topContent={topContent}
                topContentPlacement="outside"
                bottomContent={pages > 0 && itemsToDisplay.length > 0 ? bottomContent : null}
                bottomContentPlacement="outside"
                sortDescriptor={sortDescriptor}
                onSortChange={setSortDescriptor}
                classNames={{ wrapper: "max-h-[calc(100vh-350px)]", table: "min-w-[1000px]" }} // Ajusta min-width según columnas
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
                    isLoading={isLoading && itemsToDisplay.length > 0} // Spinner si recarga y hay items
                    loadingContent={<Spinner label="Actualizando lista..." />}
                    emptyContent={
                        !isLoading && users.length === 0 ? "No hay usuarios registrados." :
                        !isLoading && sortedUsers.length === 0 ? "Ningún usuario coincide con los filtros." : " "
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