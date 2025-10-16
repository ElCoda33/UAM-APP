// components/EntityList.tsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Input, Button, DropdownTrigger, Dropdown, DropdownMenu, DropdownItem,
  Chip, User as NextUIUser, Pagination, Selection, Spinner,
  SortDescriptor, Select, SelectItem, DatePicker, Tooltip
} from '@heroui/react';
import { DateValue } from '@internationalized/date';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
// Icons (asumiendo que existen en estas rutas o equivalentes)
import { PlusIcon } from '@/components/icons/PlusIcon';
import { SearchIcon } from '@/components/icons/SearchIcon';
import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';
import { DownloadIcon } from '@/components/icons/DownloadIcon';
import { EditIcon } from '@/components/icons/EditIcon';
import { EyeIcon } from '@/components/icons/EyeIcon'; // Asumiendo que quieres un ícono de "ver" para el historial
import MoveUpRoundedIcon from '@mui/icons-material/MoveUpRounded';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import { EntityListProps } from '@/types/entity';
export function EntityList<T extends { id: string | number }>({
  entityName,
  apiEndpoint,
  columns,
  statusOptions = [],
  defaultVisibleColumns,
  renderActions,
  onAdd,
  onEdit,
  onView,
  onMove,
  onHistory,
}: EntityListProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<Selection>('all');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: columns[0]?.uid as string, direction: 'ascending' });

  const filterableColumns = useMemo(() => columns.filter(c => c.filterable), [columns]);
  const [selectedFilterAttr, setSelectedFilterAttr] = useState<keyof T>(filterableColumns[0]?.uid as keyof T);

  const [visibleColumns, setVisibleColumns] = useState<Set<keyof T | 'actions'>>(new Set(defaultVisibleColumns || [columns[0]?.uid, 'actions']));

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(apiEndpoint);
        if (!res.ok) throw new Error(`Error al obtener ${entityName}`);
        const data: T[] = await res.json();
        setItems(data);
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [apiEndpoint, entityName]);

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (filterText) {
      const key = selectedFilterAttr as keyof T;
      result = result.filter(item =>
        String(item[key] ?? '').toLowerCase().includes(filterText.toLowerCase())
      );
    }

    if (statusFilter !== 'all' && Array.from(statusFilter).length) {
      result = result.filter(item =>
        statusOptions.some(opt => Array.from(statusFilter).includes(opt.uid) && item.status === opt.uid)
      );
    }

    return result;
  }, [items, filterText, selectedFilterAttr, statusFilter, statusOptions]);

  const pages = Math.ceil(filteredItems.length / rowsPerPage);
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredItems.slice(start, start + rowsPerPage);
  }, [filteredItems, page, rowsPerPage]);

  const sortedItems = useMemo(() => {
    return [...paginatedItems].sort((a, b) => {
      const key = sortDescriptor.column as keyof T;
      const aVal = a[key];
      const bVal = b[key];
      let cmp = 0;
      if (aVal < bVal) cmp = -1;
      else if (aVal > bVal) cmp = 1;
      return sortDescriptor.direction === 'descending' ? -cmp : cmp;
    });
  }, [sortDescriptor, paginatedItems]);

  const renderCell = useCallback(
    (item: T, columnKey: keyof T | 'actions') => {
      const col = columns.find(c => c.uid === columnKey);
      if (columnKey === 'actions' && renderActions) return renderActions(item);
      if (col?.render) return col.render(item);
      return String(item[columnKey as keyof T] ?? 'N/A');
    },
    [columns, renderActions]
  );

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold">{entityName}</h1>

      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          isClearable
          placeholder={`Buscar en ${selectedFilterAttr}`}
          startContent={<SearchIcon />}
          value={filterText}
          onValueChange={setFilterText}
        />
        {statusOptions.length > 0 && (
          <Dropdown>
            <DropdownTrigger>
              <Button>Estado</Button>
            </DropdownTrigger>
            <DropdownMenu
              disallowEmptySelection
              selectedKeys={statusFilter}
              selectionMode="multiple"
              onSelectionChange={setStatusFilter}
            >
              {statusOptions.map(opt => (
                <DropdownItem key={opt.uid}>{opt.name}</DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        )}
        <Button color="primary" onPress={onAdd} endContent={<PlusIcon />}>
          Agregar {entityName}
        </Button>
      </div>

      {/* Tabla */}
      <Table>
        <TableHeader columns={columns.filter(c => visibleColumns.has(c.uid))}>
          {col => <TableColumn key={col.uid as string}>{col.name}</TableColumn>}
        </TableHeader>
        <TableBody items={sortedItems} loadingContent={<Spinner />}>
          {item => (
            <TableRow key={item.id}>
              {columnKey => (
                <TableCell>{renderCell(item, columnKey as keyof T | 'actions')}</TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination
        page={page}
        total={pages}
        onChange={setPage}
      />
    </div>
  );
}