// app/dashboard/softwareLicenses/components/softwareLicenseList/data.ts
import { Selection } from "@heroui/react"; // O Key de React si es necesario

export interface SoftwareLicenseColumn {
    uid: string;
    name: string;
    sortable?: boolean;
    defaultVisible?: boolean;
    filterable?: boolean; // Para indicar si se puede usar como atributo de filtro principal
}

// Definición de columnas para la tabla de licencias de software
export const COLUMNS_SOFTWARE_LICENSES: SoftwareLicenseColumn[] = [
    { uid: "id", name: "ID Lic.", sortable: true, defaultVisible: false, filterable: true },
    { uid: "software_name", name: "Software", sortable: true, defaultVisible: true, filterable: true },
    { uid: "software_version", name: "Versión", sortable: true, defaultVisible: false, filterable: true },
    { uid: "license_type", name: "Tipo Lic.", sortable: true, defaultVisible: true, filterable: true },
    { uid: "seats", name: "Puestos", sortable: true, defaultVisible: true, filterable: false },
    { uid: "asset_name", name: "Activo Vinculado", sortable: true, defaultVisible: true, filterable: true },
    { uid: "assigned_user_name", name: "Usuario Asignado", sortable: true, defaultVisible: true, filterable: true },
    { uid: "supplier_name", name: "Proveedor", sortable: true, defaultVisible: false, filterable: true },
    { uid: "purchase_date", name: "Fecha Compra", sortable: true, defaultVisible: true, filterable: false }, // Filtrado por fecha requiere DatePicker
    { uid: "expiry_date", name: "Fecha Expira", sortable: true, defaultVisible: true, filterable: false }, // Filtrado por fecha requiere DatePicker
    { uid: "license_key", name: "Clave (parcial)", sortable: false, defaultVisible: false, filterable: true }, // No sortable por complejidad, filtrable sí
    { uid: "invoice_number", name: "Nº Factura", sortable: false, defaultVisible: false, filterable: true },
    { uid: "notes", name: "Notas", sortable: false, defaultVisible: false, filterable: true },
    { uid: "created_at", name: "Fecha Creación", sortable: true, defaultVisible: false, filterable: false },
    { uid: "actions", name: "Acciones", sortable: false, defaultVisible: true, filterable: false },
];

// Columnas visibles inicialmente por defecto en la tabla
export const INITIAL_VISIBLE_LICENSE_COLUMNS: string[] = COLUMNS_SOFTWARE_LICENSES
    .filter(col => col.defaultVisible)
    .map(col => col.uid);

// Atributos por los que se puede filtrar usando el input de búsqueda principal
export const FILTERABLE_LICENSE_ATTRIBUTES: SoftwareLicenseColumn[] = COLUMNS_SOFTWARE_LICENSES
    .filter(col => col.filterable);

// Opciones para un posible filtro de estado de licencia (ej. basado en expiry_date)
// Esto es un ejemplo, la lógica para determinar el "estado" se haría en el componente.
export const licenseStatusOptions = [
    { uid: 'active', name: 'Activa' },
    { uid: 'expiring_soon', name: 'Expira Pronto' }, // ej. en los próximos 30 días
    { uid: 'expired', name: 'Expirada' },
    { uid: 'perpetual', name: 'Perpetua' }, // Si no tiene fecha de expiración
    { uid: 'unassigned', name: 'No Asignada' }, // Si asset_id y user_id son null
];