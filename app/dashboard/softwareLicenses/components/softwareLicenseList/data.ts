// app/dashboard/softwareLicenses/components/softwareLicenseList/data.ts
import { Key } from "react"; // Key es de React, Selection de HeroUI

export interface SoftwareLicenseColumn {
    uid: string;
    name: string;
    sortable?: boolean;
    defaultVisible?: boolean;
    filterable?: boolean;
}

export const COLUMNS_SOFTWARE_LICENSES: SoftwareLicenseColumn[] = [
    { uid: "id", name: "ID Lic.", sortable: true, defaultVisible: false, filterable: true },
    { uid: "software_name", name: "Software", sortable: true, defaultVisible: true, filterable: true },
    { uid: "software_version", name: "Versión", sortable: true, defaultVisible: false, filterable: true },
    { uid: "license_type", name: "Tipo Lic.", sortable: true, defaultVisible: true, filterable: true },
    { uid: "seats", name: "Puestos", sortable: true, defaultVisible: true, filterable: false }, // Filtrar por un número exacto con input de texto es menos útil
    // Columna modificada: de asset_name a assigned_assets_count
    { uid: "assigned_assets_count", name: "Activos Asignados", sortable: true, defaultVisible: true, filterable: false }, // Sortable por conteo, filtrable por conteo es menos común para input de texto
    { uid: "assigned_user_name", name: "Usuario Resp.", sortable: true, defaultVisible: true, filterable: true },
    { uid: "supplier_name", name: "Proveedor", sortable: true, defaultVisible: false, filterable: true },
    { uid: "purchase_date", name: "Fecha Compra", sortable: true, defaultVisible: false, filterable: false },
    { uid: "expiry_date", name: "Fecha Expira", sortable: true, defaultVisible: true, filterable: false },
    { uid: "status_derived", name: "Estado (Calculado)", sortable: true, defaultVisible: true, filterable: true }, // Mantener esta columna virtual
    // license_key, invoice_number, notes podrían ser menos prioritarias para la vista de lista por defecto
    { uid: "license_key", name: "Clave (parcial)", sortable: false, defaultVisible: false, filterable: true },
    { uid: "invoice_number", name: "Nº Factura", sortable: false, defaultVisible: false, filterable: true },
    { uid: "notes", name: "Notas", sortable: false, defaultVisible: false, filterable: true },
    { uid: "created_at", name: "Fecha Creación", sortable: true, defaultVisible: false, filterable: false},
    { uid: "actions", name: "Acciones", sortable: false, defaultVisible: true, filterable: false },
];

export const INITIAL_VISIBLE_LICENSE_COLUMNS: string[] = COLUMNS_SOFTWARE_LICENSES
    .filter(col => col.defaultVisible)
    .map(col => col.uid);

// Ajustar atributos filtrables. 'asset_name' ya no existe como tal para el filtro de texto simple.
// Si se quisiera filtrar por "licencias asignadas al activo X", se necesitaría un filtro más avanzado.
export const FILTERABLE_LICENSE_ATTRIBUTES: SoftwareLicenseColumn[] = COLUMNS_SOFTWARE_LICENSES
    .filter(col => col.filterable && col.uid !== 'assigned_assets_count'); // Excluir el conteo del filtro de texto simple por ahora

// ... (licenseStatusOptions se mantiene igual de la respuesta anterior)
export const licenseStatusOptions = [
    { uid: 'active', name: 'Activa' },
    { uid: 'expiring_soon', name: 'Expira Pronto' },
    { uid: 'expired', name: 'Expirada' },
    { uid: 'perpetual', name: 'Perpetua' },
    { uid: 'unassigned', name: 'No Asignada (General)' }, // Para licencias con asset_id y user_id null
];