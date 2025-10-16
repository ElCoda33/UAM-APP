// types/entity.ts
export type EntityColumn<T> = {
  uid: keyof T | 'actions';
  name: string;
  sortable?: boolean;
  filterable?: boolean;
  type?: 'text' | 'date' | 'status';
  render?: (item: T) => React.ReactNode;
};

export type EntityListProps<T extends { id: string | number }> = {
  entityName: string; // Ej: "Activo", "Usuario", "Proveedor"
  apiEndpoint: string; // Ej: "/api/assets"
  columns: EntityColumn<T>[];
  statusOptions?: { uid: string; name: string }[];
  defaultVisibleColumns?: (keyof T | 'actions')[];
  renderActions?: (item: T) => React.ReactNode;
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onView?: (item: T) => void;
  onMove?: (item: T) => void;
  onHistory?: (item: T) => void;
};