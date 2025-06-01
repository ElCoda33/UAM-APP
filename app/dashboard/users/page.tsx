"use client";

import { useState, useEffect, useMemo, Key } from "react";
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    User as NextUIUser,
    Chip,
    Tooltip,
    Button,
    Link as NextUILink,
    Spinner,
    Dropdown,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Input,
    Select,
    SelectItem,
    SortDescriptor,
} from "@nextui-org/react";

import { EditIcon } from "@/components/icons/EditIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { EyeIcon } from "@/components/icons/EyeIcon";
import { PlusIcon } from "@/components/icons/PlusIcon";
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";
import { SearchIcon } from "@/components/icons/SearchIcon";

// Interfaz IUserFromAPI y ALL_AVAILABLE_COLUMNS (sin cambios respecto a la última versión)
interface IUserFromAPI {
    id: number;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    status: 'active' | 'disabled' | 'on_vacation' | 'pending_approval' | null;
    national_id: string | null;
    birth_date: string | null;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    section_name: string | null;
    roles: string | null;
}

const ALL_AVAILABLE_COLUMNS = [
    { uid: "user", name: "USUARIO", sortable: true, defaultVisible: true, filterable: true },
    { uid: "email", name: "EMAIL", sortable: true, defaultVisible: true, filterable: true },
    { uid: "roles", name: "ROLES", sortable: false, defaultVisible: true, filterable: true },
    { uid: "section", name: "SECCIÓN", sortable: true, defaultVisible: true, filterable: true },
    { uid: "status", name: "ESTADO", sortable: true, defaultVisible: true, filterable: true },
    { uid: "national_id", name: "ID NACIONAL", sortable: true, defaultVisible: false, filterable: true },
    { uid: "birth_date", name: "FECHA NAC.", sortable: true, defaultVisible: false, filterable: false },
    { uid: "email_verified_at", name: "EMAIL VERIFICADO", sortable: true, defaultVisible: false, filterable: true },
    { uid: "created_at", name: "CREADO EL", sortable: true, defaultVisible: false, filterable: false },
    { uid: "updated_at", name: "ÚLT. ACTUALIZACIÓN", sortable: true, defaultVisible: false, filterable: false },
    { uid: "actions", name: "ACCIONES", sortable: false, defaultVisible: true, filterable: false },
];

const statusColorMap: Record<string, "success" | "danger" | "warning" | "primary" | "default"> = {
    active: "success",
    disabled: "danger",
    on_vacation: "warning",
    pending_approval: "primary",
};

function parseDateStringAsUTC(dateStr: string | null | undefined): Date | null {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === "") {
        return null;
    }
    const simpleDateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (simpleDateMatch) {
        const year = parseInt(simpleDateMatch[1], 10);
        const month = parseInt(simpleDateMatch[2], 10) - 1;
        const day = parseInt(simpleDateMatch[3], 10);
        const dateObj = new Date(Date.UTC(year, month, day));
        if (!isNaN(dateObj.getTime())) {
            return dateObj;
        }
    }
    const fallbackDate = new Date(dateStr);
    if (!isNaN(fallbackDate.getTime())) {
        return fallbackDate;
    }
    console.warn(`No se pudo parsear la cadena de fecha: '${dateStr}'`);
    return null;
}


export default function UsuariosPageClient() {
    const [users, setUsers] = useState<IUserFromAPI[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: 'user',
        direction: 'ascending',
    });

    const ALWAYS_VISIBLE_COL_UIDS = useMemo(() =>
        ALL_AVAILABLE_COLUMNS
            .filter(col => col.uid === 'actions' && col.defaultVisible)
            .map(col => col.uid as Key)
        , []);

    const TOGGLEABLE_COLUMNS = useMemo(() =>
        ALL_AVAILABLE_COLUMNS.filter(col => !ALWAYS_VISIBLE_COL_UIDS.includes(col.uid as Key))
        , [ALWAYS_VISIBLE_COL_UIDS]);

    const [selectedToggleableUIDs, setSelectedToggleableUIDs] = useState<Set<Key>>(
        new Set(TOGGLEABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.uid as Key))
    );

    const finalVisibleColumnUIDs = useMemo(() => {
        const visible = new Set(selectedToggleableUIDs);
        ALWAYS_VISIBLE_COL_UIDS.forEach(uid => visible.add(uid));
        return visible;
    }, [selectedToggleableUIDs, ALWAYS_VISIBLE_COL_UIDS]);

    const currentTableColumns = useMemo(() => {
        return ALL_AVAILABLE_COLUMNS.filter(col => finalVisibleColumnUIDs.has(col.uid as Key));
    }, [finalVisibleColumnUIDs]);

    const filterableColumns = useMemo(() => ALL_AVAILABLE_COLUMNS.filter(col => col.filterable), []);
    const [selectedFilterAttribute, setSelectedFilterAttribute] = useState<Key>(filterableColumns[0]?.uid || "user");
    const [filterSearchText, setFilterSearchText] = useState<string>("");


    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/users');
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({ message: `Error ${res.status}: Fallo al obtener usuarios` }));
                    throw new Error(errorData.message || `Error ${res.status}: Fallo al obtener usuarios`);
                }
                const data: IUserFromAPI[] = await res.json();
                setUsers(data);
            } catch (err: any) {
                console.error("Error fetching users:", err);
                setError(err.message || "Ocurrió un error al cargar los datos.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        if (!filterSearchText.trim() || !selectedFilterAttribute) return users;
        const searchTerm = filterSearchText.toLowerCase();
        return users.filter(user => {
            let attributeValueString: string;
            switch (selectedFilterAttribute) {
                case "user":
                    attributeValueString = `${user.first_name || ""} ${user.last_name || ""}`.trim().toLowerCase();
                    break;
                case "email": attributeValueString = (user.email || "").toLowerCase(); break;
                case "roles": attributeValueString = (user.roles || "").toLowerCase(); break;
                case "section": attributeValueString = (user.section_name || "").toLowerCase(); break;
                case "status":
                    attributeValueString = (user.status ? user.status.replace("_", " ") : "desconocido").toLowerCase();
                    break;
                case "national_id": attributeValueString = (user.national_id || "").toLowerCase(); break;
                case "email_verified_at":
                    const emailVerifiedDate = parseDateStringAsUTC(user.email_verified_at);
                    attributeValueString = (emailVerifiedDate ? `verificado (${emailVerifiedDate.toLocaleDateString(undefined, { timeZone: 'UTC' })})` : "no verificado").toLowerCase();
                    break;
                default:
                    const rawValue = user[selectedFilterAttribute as keyof IUserFromAPI];
                    attributeValueString = rawValue !== null && rawValue !== undefined ? String(rawValue).toLowerCase() : "";
                    break;
            }
            return attributeValueString.includes(searchTerm);
        });
    }, [users, selectedFilterAttribute, filterSearchText]);

    const sortedUsers = useMemo(() => {
        return [...filteredUsers].sort((a, b) => {
            let firstValue: any, secondValue: any;

            switch (sortDescriptor.column) {
                case 'user':
                    firstValue = `${a.first_name || ''} ${a.last_name || ''}`.trim();
                    secondValue = `${b.first_name || ''} ${b.last_name || ''}`.trim();
                    break;
                case 'section':
                    firstValue = a.section_name;
                    secondValue = b.section_name;
                    break;
                case 'birth_date':
                    firstValue = parseDateStringAsUTC(a.birth_date);
                    secondValue = parseDateStringAsUTC(b.birth_date);
                    break;
                case 'email_verified_at':
                case 'created_at':
                case 'updated_at':
                    firstValue = a[sortDescriptor.column as keyof IUserFromAPI] ? new Date(a[sortDescriptor.column as keyof IUserFromAPI]!) : null;
                    secondValue = b[sortDescriptor.column as keyof IUserFromAPI] ? new Date(b[sortDescriptor.column as keyof IUserFromAPI]!) : null;
                    break;
                default:
                    firstValue = a[sortDescriptor.column as keyof IUserFromAPI];
                    secondValue = b[sortDescriptor.column as keyof IUserFromAPI];
            }

            let cmp: number;
            if (firstValue === null || firstValue === undefined) cmp = -1;
            else if (secondValue === null || secondValue === undefined) cmp = 1;
            else if (firstValue instanceof Date && secondValue instanceof Date) {
                cmp = firstValue.getTime() - secondValue.getTime();
            } else if (typeof firstValue === 'number' && typeof secondValue === 'number') {
                cmp = firstValue - secondValue;
            } else {
                cmp = String(firstValue).toLowerCase().localeCompare(String(secondValue).toLowerCase());
            }

            return sortDescriptor.direction === 'descending' ? -cmp : cmp;
        });
    }, [filteredUsers, sortDescriptor]);

    const renderCell = (user: IUserFromAPI, columnKey: React.Key): React.ReactNode => {
        const cellValue = user[columnKey as keyof IUserFromAPI];
        switch (columnKey) {
            case "user":
                return (<NextUIUser avatarProps={{ radius: "lg", src: user.avatar_url || undefined, size: "sm" }} description={user.email || "Sin email"} name={`${user.first_name || ""} ${user.last_name || ""}`.trim() || "Usuario Sin Nombre"} />);
            case "email":
                return <span className="text-sm">{user.email || "N/A"}</span>;
            case "roles":
                const rolesArray = (user.roles || "").split(',').map(r => r.trim()).filter(r => r);
                if (rolesArray.length === 0) {
                    return <Chip size="sm" variant="flat">Sin roles</Chip>;
                }
                return (<div className="flex flex-col gap-1"> {rolesArray.map((role, index) => (<Chip className="capitalize" size="sm" variant="flat" key={`${user.id}-role-${index}-${role}`} color="secondary"> {role} </Chip>))} </div>);
            case "section":
                return <span className="text-sm">{user.section_name || "Sin sección"}</span>;
            case "status":
                return (<Chip className="capitalize" color={statusColorMap[user.status || "default"] || "default"} size="sm" variant="flat"> {user.status ? user.status.replace(/_/g, " ") : "Desconocido"} </Chip>);
            case "national_id":
                return <span className="text-sm">{user.national_id || "N/A"}</span>;
            case "birth_date":
                const dob = parseDateStringAsUTC(user.birth_date);
                return <span className="text-sm">{dob ? dob.toLocaleDateString(undefined, { timeZone: 'UTC' }) : (user.birth_date === null ? "N/A" : `Inv: ${user.birth_date}`)}</span>;
            case "email_verified_at":
                const verifiedDate = parseDateStringAsUTC(user.email_verified_at);
                return verifiedDate ? (<Chip color="success" variant="flat" size="sm" startContent={<span className="mr-1">✔️</span>}> Verificado ({verifiedDate.toLocaleDateString(undefined, { timeZone: 'UTC' })}) </Chip>) : (<Chip color="warning" variant="flat" size="sm" startContent={<span className="mr-1">✖️</span>}> No Verificado </Chip>);
            case "created_at":
                const createdDate = user.created_at ? new Date(user.created_at) : null;
                return <span className="text-sm">{createdDate ? createdDate.toLocaleDateString() : "N/A"}</span>;
            case "updated_at":
                const updatedDate = user.updated_at ? new Date(user.updated_at) : null;
                return <span className="text-sm">{updatedDate ? updatedDate.toLocaleString() : "N/A"}</span>;
            case "actions":
                return (
                    <div className="relative flex items-center gap-1 sm:gap-2">
                        <Tooltip content="Ver detalles">
                            <Button isIconOnly size="sm" variant="light" as={NextUILink} href={`/dashboard/users/${user.id}`}>
                                <EyeIcon className="text-lg text-default-400" />
                            </Button>
                        </Tooltip>
                        <Tooltip content="Editar usuario">
                            <Button isIconOnly size="sm" variant="light" as={NextUILink} href={`/dashboard/users/${user.id}/edit`}>
                                <EditIcon className="text-lg text-default-400" />
                            </Button>
                        </Tooltip>
                        <Tooltip color="danger" content="Eliminar usuario">
                            <Button isIconOnly size="sm" variant="light" onPress={() => console.log("Eliminar usuario (acción pendiente)", user.id)}>
                                <DeleteIcon className="text-lg text-danger" />
                            </Button>
                        </Tooltip>
                    </div>
                );
            default:
                const val = String(cellValue);
                return <span className="text-sm">{val !== "null" && val !== "undefined" ? val : "N/A"}</span>;
        }
    };

    if (isLoading) {
        return (<div className="flex justify-center items-center h-[calc(100vh-200px)]"> <Spinner label="Cargando usuarios..." color="primary" labelColor="primary" size="lg" /> </div>);
    }
    if (error) {
        return (<div className="container mx-auto p-4 text-center"> <p className="text-danger-500 text-lg">Error: {error}</p> <Button color="primary" onClick={() => { /* Re-fetch logic */ }} className="mt-4"> Reintentar </Button> </div>);
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            {/* --- Cabecera con Filtros --- */}
            <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground self-start md:self-center whitespace-nowrap">
                    Gestión de Usuarios
                </h1>
                {/* Contenedor para filtros, se hará flex-wrap para mejor responsividad */}
                <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full md:w-auto md:justify-end">
                    <Select
                        aria-label="Filtrar por atributo"
                        placeholder="Filtrar por..."
                        className="w-full sm:w-auto sm:min-w-[180px] md:max-w-xs" // Ajuste de anchos
                        selectedKeys={selectedFilterAttribute ? [selectedFilterAttribute] : undefined}
                        onSelectionChange={(keys) => {
                            const newKey = Array.from(keys as Set<Key>)[0];
                            setSelectedFilterAttribute(newKey || (filterableColumns.length > 0 ? filterableColumns[0].uid : ""));
                            setFilterSearchText("");
                        }}
                        size="md"
                    >
                        {filterableColumns.map(col => (
                            <SelectItem key={col.uid} value={col.uid} textValue={col.name}>
                                {col.name}
                            </SelectItem>
                        ))}
                    </Select>
                    <Input
                        isClearable
                        className="w-full sm:w-auto sm:flex-grow md:max-w-xs" // Ajuste de anchos y flex-grow
                        placeholder={`Buscar en "${ALL_AVAILABLE_COLUMNS.find(c => c.uid === selectedFilterAttribute)?.name || 'Seleccione atributo'}"`}
                        startContent={<SearchIcon className="text-default-400 pointer-events-none flex-shrink-0" />}
                        value={filterSearchText}
                        onClear={() => setFilterSearchText("")}
                        onValueChange={setFilterSearchText}
                        disabled={!selectedFilterAttribute && filterableColumns.length > 0}
                        size="md"
                    />
                </div>
            </header>

            {/* --- Controles de Tabla (Columnas, Añadir Usuario) --- */}
            {/* Contenedor para acciones, se hará flex-wrap */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                <span className="text-default-500 text-small self-start sm:self-center">
                    Total {users.length} usuarios. {sortedUsers.length !== users.length ? `${sortedUsers.length} coinciden con el filtro.` : ''}
                </span>
                <div className="flex gap-3 flex-wrap justify-end w-full sm:w-auto">
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
                            selectedKeys={selectedToggleableUIDs}
                            selectionMode="multiple"
                            onSelectionChange={(keys) => setSelectedToggleableUIDs(new Set(keys as Set<Key>))}
                        >
                            {TOGGLEABLE_COLUMNS.map((column) => (
                                <DropdownItem key={column.uid} className="capitalize" textValue={column.name}>
                                    {column.name}
                                </DropdownItem>
                            ))}
                        </DropdownMenu>
                    </Dropdown>
                    <Button
                        as={NextUILink}
                        href="/dashboard/users/add"
                        color="primary"
                        endContent={<PlusIcon />}
                    >
                        Añadir Usuario
                    </Button>
                </div>
            </div>

            {/* --- MODIFICACIÓN PARA RESPONSIVIDAD DE LA TABLA --- */}
            <div className="overflow-x-auto w-full shadow-md sm:rounded-lg">
                <Table
                    aria-label="Tabla de usuarios con columnas, filtros y ordenación dinámicos"
                    removeWrapper // removeWrapper es útil si manejas el scroll externamente como aquí
                    sortDescriptor={sortDescriptor}
                    onSortChange={setSortDescriptor}
                    classNames={{ // Clases para asegurar que la tabla use el ancho disponible
                        table: "min-w-full divide-y divide-default-200",
                        thead: "", // Puedes añadir clases específicas al thead
                        tbody: "", // Puedes añadir clases específicas al tbody
                    }}
                >
                    <TableHeader columns={currentTableColumns}>
                        {(column) => (
                            <TableColumn
                                key={column.uid}
                                align={column.uid === "actions" ? "center" : "start"}
                                allowsSorting={column.sortable}
                                className="py-3 px-4 bg-default-100 text-left text-xs font-medium text-default-600 uppercase tracking-wider whitespace-nowrap" // Estilos para cabeceras
                            >
                                {column.name}
                            </TableColumn>
                        )}
                    </TableHeader>
                    <TableBody
                        items={sortedUsers}
                        isLoading={isLoading}
                        loadingContent={<Spinner label="Cargando..." />}
                        emptyContent={ /* ... (contenido de emptyContent sin cambios) ... */
                            isLoading ? "" :
                                error ? "Error al cargar datos." :
                                    users.length === 0 ? "No hay usuarios para mostrar. Intenta añadir algunos." :
                                        (filterSearchText && sortedUsers.length === 0) ? "Ningún usuario coincide con tu búsqueda." :
                                            sortedUsers.length === 0 ? "No hay datos disponibles." :
                                                "No hay datos disponibles."
                        }
                    >
                        {(item) => (
                            <TableRow key={item.id} className="hover:bg-default-50 transition-colors">
                                {(columnKey) => (
                                    <TableCell className="py-3 px-4 whitespace-nowrap text-sm"> {/* Evitar que el contenido se rompa a múltiples líneas innecesariamente */}
                                        {renderCell(item, columnKey)}
                                    </TableCell>
                                )}
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}