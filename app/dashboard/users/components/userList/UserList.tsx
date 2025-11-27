"use client";

import React, { useEffect, useState, useMemo, Key, useCallback } from "react";
import {
    User as HeroUIUser,
    Chip, Tooltip, Button, Link as NextUILink, ChipProps, SortDescriptor
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";

import { EditIcon } from "@/components/icons/EditIcon";
import { DeleteIcon } from "@/components/icons/DeleteIcon";
import { EyeIcon } from "@/components/icons/EyeIcon";

import type { UserDetailsFromDB } from "@/lib/data/users";
import { USER_COLUMNS_DEFINITION, INITIAL_VISIBLE_USER_COLUMNS, statusColorMap, userStatusOptionsForFilter } from "./data";
import { formatDate, formatUserRoles, formatUserStatus } from "./utils";
import GenericTable from "../../../components/GenericTable";

export default function UserList() {
    const router = useRouter();
    const { data: session } = useSession();
    const [users, setUsers] = useState<UserDetailsFromDB[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/users');
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

    const handleDeleteUser = async (userId: number, userName: string) => {
        if (String(userId) === session?.user?.id) {
            toast.error("No puedes eliminar tu propia cuenta.");
            return;
        }
        const confirmDelete = window.confirm(`¿Estás seguro de que quieres eliminar (deshabilitar) al usuario "${userName}" (ID: ${userId})?`);
        if (!confirmDelete) return;

        const toastId = toast.loading("Eliminando usuario...");
        try {
            const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Error al eliminar el usuario");

            toast.success(result.message || "Usuario eliminado/deshabilitado.", { id: toastId });
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message || "No se pudo eliminar el usuario.", { id: toastId });
        }
    };

    const renderCell = useCallback((user: UserDetailsFromDB, columnKey: Key): React.ReactNode => {
        const cellValue = user[columnKey as keyof UserDetailsFromDB];
        const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Usuario Sin Nombre";

        switch (columnKey) {
            case "user":
                return (<HeroUIUser avatarProps={{ radius: "lg", src: user.avatar_url || undefined, size: "sm", name: fullName.charAt(0) }} description={user.email || "Sin email"} name={fullName} />);
            case "email":
                return <span className="text-sm">{user.email || "N/A"}</span>;
            case "roles":
                const rolesArray = formatUserRoles(user.roles);
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
                        {String(user.id) !== session?.user?.id && (
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

    const getFilterValue = useCallback((user: UserDetailsFromDB, columnKey: Key): string => {
        switch (columnKey) {
            case "user":
                return `${user.first_name || ""} ${user.last_name || ""}`.trim();
            case "email": return user.email || "";
            case "roles": return user.roles || "";
            case "section_name": return user.section_name || "";
            case "status": return formatUserStatus(user.status);
            case "national_id": return user.national_id || "";
            case "email_verified_at": return user.email_verified_at ? "verificado" : "no verificado";
            default: return String(user[columnKey as keyof UserDetailsFromDB] || "");
        }
    }, []);

    const handleExport = async (format: 'csv' | 'pdf', filters: any, sort: SortDescriptor, columns: any[]) => {
        const toastId = toast.loading(`Generando exportación ${format.toUpperCase()}...`);
        try {
            const apiFilters: any = {
                searchText: filters.searchText,
                searchAttribute: filters.searchAttribute,
                status: filters.status,
            };

            const payload = {
                filters: apiFilters,
                sort: {
                    column: sort.column,
                    direction: sort.direction
                },
                columns: columns.map(c => ({ uid: c.uid, name: c.name }))
            };

            const response = await fetch(`/api/users/export/${format}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const resJson = await response.json().catch(() => ({}));
                throw new Error(resJson.message || `Error al exportar a ${format.toUpperCase()}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `usuarios_exportados.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success(`Exportación ${format.toUpperCase()} completada`, { id: toastId });

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al exportar", { id: toastId });
        }
    };

    // Status options need to be mapped to {name, uid} for GenericTable
    const statusOptions = useMemo(() => userStatusOptionsForFilter.map(opt => ({ name: opt.label, uid: opt.key })), []);

    return (
        <div className="space-y-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestión de Usuarios</h1>
            <GenericTable<UserDetailsFromDB>
                data={users}
                columns={USER_COLUMNS_DEFINITION}
                renderCell={renderCell}
                isLoading={isLoading}
                statusOptions={statusOptions}
                initialVisibleColumns={INITIAL_VISIBLE_USER_COLUMNS}
                entityName="Usuarios"
                onAdd={() => router.push('/dashboard/users/add')}
                onExport={handleExport}
                statusColorMap={statusColorMap}
                getFilterValue={getFilterValue}
                emptyContent={users.length === 0 && !isLoading ? "No hay usuarios registrados." : "Ningún usuario coincide con los filtros."}
            />
        </div>
    );
}