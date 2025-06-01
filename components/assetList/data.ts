// components/assetList/data.ts

export const columns = [
    { name: 'PRODUCTO', uid: 'product_name', sortable: true, filterable: true, type: 'string' },
    { name: 'Nº SERIE', uid: 'serial_number', sortable: true, filterable: true, type: 'string' },
    { name: 'CÓD. INVENTARIO', uid: 'inventory_code', sortable: true, filterable: true, type: 'string' },
    { name: 'DESCRIPCIÓN', uid: 'description', sortable: true, filterable: true, type: 'string' },
    { name: 'SECCIÓN ACTUAL', uid: 'current_section_name', sortable: true, filterable: true, type: 'string' },
    { name: 'PROVEEDOR', uid: 'supplier_company_name', sortable: true, filterable: true, type: 'string' },
    { name: 'FECHA COMPRA', uid: 'purchase_date', sortable: true, filterable: true, type: 'date' },
    { name: 'Nº FACTURA', uid: 'invoice_number', sortable: false, filterable: true, type: 'string' },
    { name: 'VTO. GARANTÍA', uid: 'warranty_expiry_date', sortable: true, filterable: true, type: 'date' },
    { name: 'PROC. ADQUISICIÓN', uid: 'acquisition_procedure', sortable: true, filterable: true, type: 'string' },
    { name: 'ESTADO', uid: 'status', sortable: true, filterable: true, type: 'string' }, // O un tipo 'status' si quieres manejo especial
    { name: 'ACCIONES', uid: 'actions', sortable: false, filterable: false },
];

// statusOptions sin cambios
export const statusOptions = [
    { name: 'En Uso', uid: 'in_use' },
    { name: 'En Depósito', uid: 'in_storage' },
    { name: 'En Reparación', uid: 'under_repair' },
    { name: 'Dada de Baja', uid: 'disposed' },
    { name: 'Perdido', uid: 'lost' },
];