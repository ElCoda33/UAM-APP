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
    // Pagination, // Importa si vas a implementar paginación del lado del cliente
} from "@nextui-org/react";

// --- IMPORTACIÓN DE ICONOS (Asegúrate que estas rutas sean correctas y los componentes existan) ---
import { EditIcon } from "@/components/icons/EditIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { EyeIcon } from "@/components/icons/EyeIcon";
import { PlusIcon } from "@/components/icons/PlusIcon";
import { ChevronDownIcon } from "@/components/icons/ChevronDownIcon";
import { SearchIcon } from "@/components/icons/SearchIcon";

// Interfaz para los datos de usuario que vienen de la API
interface IUserFromAPI {
    id: number;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    status: 'active' | 'disabled' | 'on_vacation' | 'pending_approval' | null;
    national_id: string | null;
    birth_date: string | null;      // Esperado como string (ej: 'YYYY-MM-DD')
    email_verified_at: string | null; // Esperado como string (timestamp ISO)
    created_at: string;           // Esperado como string (timestamp ISO)
    updated_at: string;           // Esperado como string (timestamp ISO)
    section_name: string | null;
    roles: string | null;           // Roles como string concatenado (ej: "Admin, Editor")
}

// --- CONFIGURACIÓN DE COLUMNAS ---
const ALL_AVAILABLE_COLUMNS = [
    { uid: "user", name: "USUARIO", sortable: true, defaultVisible: true, filterable: true },
    { uid: "email", name: "EMAIL", sortable: true, defaultVisible: true, filterable: true },
    { uid: "roles", name: "ROLES", defaultVisible: true, filterable: true },
    { uid: "section", name: "SECCIÓN", sortable: true, defaultVisible: true, filterable: true },
    { uid: "status", name: "ESTADO", sortable: true, defaultVisible: true, filterable: true },
    { uid: "national_id", name: "ID NACIONAL", sortable: true, defaultVisible: false, filterable: true },
    { uid: "birth_date", name: "FECHA NAC.", sortable: true, defaultVisible: false, filterable: false },
    { uid: "email_verified_at", name: "EMAIL VERIFICADO", sortable: true, defaultVisible: false, filterable: true },
    { uid: "created_at", name: "CREADO EL", sortable: true, defaultVisible: false, filterable: false },
    { uid: "updated_at", name: "ÚLT. ACTUALIZACIÓN", sortable: true, defaultVisible: false, filterable: false },
    { uid: "actions", name: "ACCIONES", defaultVisible: true, filterable: false },
];

const statusColorMap: Record<string, "success" | "danger" | "warning" | "primary" | "default"> = {
    active: "success",
    disabled: "danger",
    on_vacation: "warning",
    pending_approval: "primary",
};

export default function UsuariosPageClient() {
    const [users, setUsers] = useState<IUserFromAPI[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const ALWAYS_VISIBLE_COL_UIDS = useMemo(() =>
        ALL_AVAILABLE_COLUMNS
            .filter(col => col.uid === 'actions' && col.defaultVisible) // 'actions' es el único siempre visible y no toggleable
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
        // Mantener el orden original de ALL_AVAILABLE_COLUMNS
        return ALL_AVAILABLE_COLUMNS.filter(col => finalVisibleColumnUIDs.has(col.uid as Key));
    }, [finalVisibleColumnUIDs]);

    const filterableColumns = useMemo(() => ALL_AVAILABLE_COLUMNS.filter(col => col.filterable), []);
    const [selectedFilterAttribute, setSelectedFilterAttribute] = useState<Key>(filterableColumns[0]?.uid || "");
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
                    attributeValueString = (user.email_verified_at ? `verificado (${new Date(user.email_verified_at).toLocaleDateString()})` : "no verificado").toLowerCase();
                    break;
                default:
                    const rawValue = user[selectedFilterAttribute as keyof IUserFromAPI];
                    attributeValueString = rawValue !== null && rawValue !== undefined ? String(rawValue).toLowerCase() : "";
                    break;
            }
            return attributeValueString.includes(searchTerm);
        });
    }, [users, selectedFilterAttribute, filterSearchText]);

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
                return <span className="text-sm">{user.birth_date ? new Date(user.birth_date + 'T00:00:00Z').toLocaleDateString() : "N/A"}</span>;
            case "email_verified_at":
                return user.email_verified_at ? (<Chip color="success" variant="flat" size="sm" startContent={<span className="mr-1">✔️</span>}> Verificado ({new Date(user.email_verified_at).toLocaleDateString()}) </Chip>) : (<Chip color="warning" variant="flat" size="sm" startContent={<span className="mr-1">✖️</span>}> No Verificado </Chip>);
            case "created_at":
                return <span className="text-sm">{user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}</span>;
            case "updated_at":
                return <span className="text-sm">{user.updated_at ? new Date(user.updated_at).toLocaleString() : "N/A"}</span>;
            case "actions": // ESTE CASE ES EL IMPORTANTE PARA LOS BOTONES
                console.log(`Renderizando celda de acciones para usuario ID: ${user.id}`); // Para verificar en consola
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
                )
                const val = String(cellValue);
                return <span className="text-sm">{val !== "null" && val !== "undefined" ? val : "N/A"}</span>;
        }
    };

    if (isLoading) {
        return (<div className="flex justify-center items-center h-[calc(100vh-200px)]"> <Spinner label="Cargando usuarios..." color="primary" labelColor="primary" size="lg" /> </div>);
    }
    if (error) {
        return (<div className="container mx-auto p-4 text-center"> <p className="text-danger-500 text-lg">Error: {error}</p> <Button color="primary" onClick={() => { setIsLoading(true); fetchUsers(); }} className="mt-4"> Reintentar </Button> </div>);
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground self-start md:self-center">
                    Gestión de Usuarios
                </h1>
                <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto">
                    <Select
                        aria-label="Filtrar por atributo"
                        placeholder="Filtrar por..."
                        className="w-full sm:min-w-[200px] sm:max-w-xs"
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
                        className="w-full sm:max-w-xs"
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
            <div className="flex justify-end items-center mb-4 gap-3">
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
                    href="/dashboard/usuarios/nuevo"
                    color="primary"
                    endContent={<PlusIcon />}
                >
                    Añadir Usuario
                </Button>
            </div>

            <Table
                aria-label="Tabla de usuarios con columnas y filtros dinámicos"
                removeWrapper
            >
                <TableHeader columns={currentTableColumns}>
                    {(column) => (
                        <TableColumn
                            key={column.uid}
                            align={column.uid === "actions" ? "center" : "start"}
                            allowsSorting={column.sortable}
                        >
                            {column.name}
                        </TableColumn>
                    )}
                </TableHeader>
                <TableBody
                    items={filteredUsers}
                    isLoading={isLoading} // Mostrar indicador de carga en la tabla si se desea
                    loadingContent={<Spinner label="Cargando..." />}
                    emptyContent={
                        isLoading ? "" : // No mostrar texto si está cargando globalmente
                            error ? "Error al cargar datos." :
                                users.length === 0 ? "No hay usuarios para mostrar. Intenta añadir algunos." :
                                    filterSearchText ? "Ningún usuario coincide con tu búsqueda." :
                                        "No hay datos disponibles." // Fallback general
                    }
                >
                    {(item) => (
                        <TableRow key={item.id}>
                            {(columnKey) => (
                                <TableCell>
                                    {renderCell(item, columnKey)}
                                </TableCell>
                            )}
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}