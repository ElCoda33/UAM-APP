// config/assetColumns.ts
import { EntityColumn } from '@/types/entity';

export const assetColumns: EntityColumn<any>[] = [
  { uid: 'product_name', name: 'Producto', sortable: true, filterable: true },
  { uid: 'serial_number', name: 'Serial', sortable: true, filterable: true },
  { uid: 'status', name: 'Estado', type: 'status' },
  { uid: 'purchase_date', name: 'Fecha de compra', type: 'date' },
  { uid: 'actions', name: 'Acciones' },
];