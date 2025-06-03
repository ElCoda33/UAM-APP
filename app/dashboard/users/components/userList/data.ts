// app/dashboard/users/components/userList/data.ts
import { Key } from "react";

export interface UserColumn {
    uid: string;
    name: string;
    sortable?: boolean;
    defaultVisible?: boolean;
    filterable?: boolean; // Indica si se puede usar como atributo de filtro principal
}

// Definición de columnas para la tabla de usuarios
// Basado en ALL_AVAILABLE_COLUMNS de tu app/dashboard/users/page.tsx
export const USER_COLUMNS_DEFINITION: UserColumn[] = [
    { uid: "user", name: "USUARIO", sortable: true, defaultVisible: true, filterable: true },
    { uid: "email", name: "EMAIL", sortable: true, defaultVisible: true, filterable: true },
    { uid: "roles", name: "ROLES", sortable: false, defaultVisible: true, filterable: true }, // No sortable porque es una lista/string concatenado
    { uid: "section_name", name: "SECCIÓN", sortable: true, defaultVisible: true, filterable: true },
    { uid: "status", name: "ESTADO", sortable: true, defaultVisible: true, filterable: true },
    { uid: "national_id", name: "ID NACIONAL", sortable: true, defaultVisible: false, filterable: true },
    { uid: "birth_date", name: "FECHA NAC.", sortable: true, defaultVisible: false, filterable: false }, // Filtrado por fecha es más complejo
    { uid: "email_verified_at", name: "EMAIL VERIFICADO", sortable: true, defaultVisible: false, filterable: true },
    { uid: "created_at", name: "CREADO EL", sortable: true, defaultVisible: false, filterable: false },
    { uid: "updated_at", name: "ÚLT. ACTUALIZACIÓN", sortable: true, defaultVisible: false, filterable: false },
    { uid: "actions", name: "ACCIONES", sortable: false, defaultVisible: true, filterable: false },
];

// Columnas visibles inicialmente por defecto en la tabla
export const INITIAL_VISIBLE_USER_COLUMNS: string[] = USER_COLUMNS_DEFINITION
    .filter(col => col.defaultVisible)
    .map(col => col.uid);

// Atributos por los que se puede filtrar usando el input de búsqueda principal
export const FILTERABLE_USER_ATTRIBUTES: UserColumn[] = USER_COLUMNS_DEFINITION
    .filter(col => col.filterable);

// Opciones para el filtro de estado (ya existen en tu schema)
// Podrías importarlas de lib/schema.ts si userStatusEnum está exportado
// o redefinirlas aquí para el UI si necesitas labels diferentes.
export const userStatusOptionsForFilter = [
    { key: 'active', label: 'Activo' },
    { key: 'disabled', label: 'Deshabilitado' },
    { key: 'on_vacation', label: 'De Vacaciones' },
    { key: 'pending_approval', label: 'Pendiente Aprobación' },
];

// Mapeo de colores para los chips de estado (ya lo tienes en tu page.tsx)
export const statusColorMap: Record<string, "success" | "danger" | "warning" | "primary" | "default"> = {
    active: "success",
    disabled: "danger",
    on_vacation: "warning",
    pending_approval: "primary",
};