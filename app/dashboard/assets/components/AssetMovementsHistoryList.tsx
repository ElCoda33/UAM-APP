// app/dashboard/assets/components/AssetMovementsHistoryList.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Spinner, Chip, Pagination, Button, Input, DatePicker,
  Card
} from "@heroui/react";
import { toast } from 'react-hot-toast';
import { DateValue } from "@internationalized/date";
import { SearchIcon } from '@/components/icons/SearchIcon';

// Asumiendo que tienes un icono de descarga, o crea uno simple
const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

export interface AssetMovementRecord {
  transfer_id: number;
  transfer_date: string;
  from_section_name: string | null;
  from_location_name: string | null;
  to_section_name: string | null;
  to_location_name: string | null;
  authorized_by_user_name: string | null;
  received_by_user_name: string | null;
  received_date: string | null;
  notes: string | null;
}

interface AssetMovementsHistoryListProps {
  assetId: number;
  assetName?: string; // Para pasar al endpoint de PDF y usar en el título
}

const historyColumns = [
  { uid: 'transfer_date', name: 'Fecha Transferencia', sortable: true },
  { uid: 'notes', name: 'Tipo/Notas Mov.', sortable: false },
  { uid: 'from_section_name', name: 'Desde Sección', sortable: true },
  { uid: 'from_location_name', name: 'Desde Lugar', sortable: true },
  { uid: 'to_section_name', name: 'Hacia Sección', sortable: true },
  { uid: 'to_location_name', name: 'Hacia Lugar', sortable: true },
  { uid: 'authorized_by_user_name', name: 'Autorizado Por', sortable: true },
  { uid: 'received_by_user_name', name: 'Recibido Por', sortable: true },
  { uid: 'received_date', name: 'Fecha Recepción', sortable: true },
];

function isDateInRange(dateStr: string | null, range: { from: DateValue | null; to: DateValue | null }): boolean {
  if (!dateStr && (range.from || range.to)) return false;
  if (!dateStr) return true;
  let itemDate: Date;
  try {
    itemDate = new Date(dateStr);
    if (isNaN(itemDate.getTime())) return false;
  } catch (e) { return false; }
  const itemDateUTC = Date.UTC(itemDate.getUTCFullYear(), itemDate.getUTCMonth(), itemDate.getUTCDate());
  if (range.from) {
    const fromDateUTC = Date.UTC(range.from.year, range.from.month - 1, range.from.day);
    if (itemDateUTC < fromDateUTC) return false;
  }
  if (range.to) {
    const toDateUTC = Date.UTC(range.to.year, range.to.month - 1, range.to.day);
    const dayAfterToDateUTC = new Date(toDateUTC);
    dayAfterToDateUTC.setUTCDate(dayAfterToDateUTC.getUTCDate() + 1);
    if (itemDateUTC >= dayAfterToDateUTC.getTime()) return false;
  }
  return true;
}

// Helper para convertir DateValue a string YYYY-MM-DD
const dateValueToYYYYMMDD = (dateValue: DateValue | null): string | null => {
  if (!dateValue) return null;
  return `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
};

export default function AssetMovementsHistoryList({ assetId, assetName }: AssetMovementsHistoryListProps) {
  const [allMovements, setAllMovements] = useState<AssetMovementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const [filters, setFilters] = useState({
    transferDateRange: { from: null as DateValue | null, to: null as DateValue | null },
    receivedDateRange: { from: null as DateValue | null, to: null as DateValue | null },
    from_section_name: "", from_location_name: "",
    to_section_name: "", to_location_name: "",
    authorized_by_user_name: "", received_by_user_name: "",
    notes: "",
  });

  useEffect(() => {
    if (!assetId) { setIsLoading(false); setError("ID de activo no proporcionado."); return; }
    const fetchMovements = async () => {
      setIsLoading(true); setError(null);
      try {
        const response = await fetch(`/api/assets/${assetId}/movements`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({ message: "Error desconocido" }));
          throw new Error(errData.message || `Error al cargar movimientos: ${response.statusText}`);
        }
        setAllMovements(await response.json());
      } catch (err: any) { setError(err.message); toast.error(err.message || "No se pudo cargar el historial."); }
      finally { setIsLoading(false); }
    };
    fetchMovements();
  }, [assetId]);

  const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value })); setPage(1);
  };
  const handleDateRangeFilterChange = (filterName: 'transferDateRange' | 'receivedDateRange', dateType: 'from' | 'to', value: DateValue | null) => {
    setFilters(prev => ({ ...prev, [filterName]: { ...prev[filterName], [dateType]: value } })); setPage(1);
  };

  const filteredMovements = useMemo(() => {
    return allMovements.filter(mov => (
      isDateInRange(mov.transfer_date, filters.transferDateRange) &&
      isDateInRange(mov.received_date, filters.receivedDateRange) &&
      (filters.from_section_name === "" || String(mov.from_section_name || "").toLowerCase().includes(filters.from_section_name.toLowerCase())) &&
      (filters.from_location_name === "" || String(mov.from_location_name || "").toLowerCase().includes(filters.from_location_name.toLowerCase())) &&
      (filters.to_section_name === "" || String(mov.to_section_name || "").toLowerCase().includes(filters.to_section_name.toLowerCase())) &&
      (filters.to_location_name === "" || String(mov.to_location_name || "").toLowerCase().includes(filters.to_location_name.toLowerCase())) &&
      (filters.authorized_by_user_name === "" || String(mov.authorized_by_user_name || "").toLowerCase().includes(filters.authorized_by_user_name.toLowerCase())) &&
      (filters.received_by_user_name === "" || String(mov.received_by_user_name || "").toLowerCase().includes(filters.received_by_user_name.toLowerCase())) &&
      (filters.notes === "" || String(mov.notes || "").toLowerCase().includes(filters.notes.toLowerCase()))
    ));
  }, [allMovements, filters]);

  const pages = Math.ceil(filteredMovements.length / rowsPerPage);
  const itemsToDisplay = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredMovements.slice(start, end);
  }, [page, filteredMovements, rowsPerPage]);

  const renderCell = (item: AssetMovementRecord, columnKey: React.Key): React.ReactNode => {
    const cellValue = item[columnKey as keyof AssetMovementRecord];
    switch (columnKey) {
      case 'transfer_date': case 'received_date':
        return cellValue ? new Date(cellValue as string).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Montevideo' }) : 'N/A';
      case 'notes':
        const tipoMovMatch = (cellValue as string)?.match(/Tipo de movimiento: (.*)/);
        const displayNote = tipoMovMatch ? tipoMovMatch[1] : cellValue;
        return <Chip size="sm" variant="flat" color="default">{displayNote || 'N/A'}</Chip>;
      default: return cellValue != null ? String(cellValue) : 'N/A';
    }
  };

  const handleExportCSV = () => {
    if (filteredMovements.length === 0) { toast.error("No hay datos para exportar."); return; }
    const header = historyColumns.map(col => col.name).join(',');
    const rows = filteredMovements.map(mov =>
      historyColumns.map(col => {
        let val = mov[col.uid as keyof AssetMovementRecord];
        if (col.uid === 'transfer_date' || col.uid === 'received_date') {
          val = val ? new Date(val as string).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Montevideo' }) : 'N/A';
        }
        const cellVal = String(val || 'N/A');
        return `"${cellVal.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csvContent = `${header}\n${rows.join('\n')}`;
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `historial_movimientos_activo_${assetId}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Descarga CSV iniciada.");
  };

  const handleExportPDF = async () => {
    if (filteredMovements.length === 0 && !Object.values(filters).some(f => f && (typeof f !== 'object' || (f as any).from || (f as any).to))) {
      toast.error("No hay datos (o filtros aplicados) para generar el PDF.");
      // Si quieres permitir PDF de tabla vacía si hay filtros, quita la segunda condición.
      // return; 
    }
    setIsDownloadingPDF(true);
    const pdfToastId = toast.loading("Generando PDF...");

    const apiFilters = {
      transferDateFrom: dateValueToYYYYMMDD(filters.transferDateRange.from),
      transferDateTo: dateValueToYYYYMMDD(filters.transferDateRange.to),
      receivedDateFrom: dateValueToYYYYMMDD(filters.receivedDateRange.from),
      receivedDateTo: dateValueToYYYYMMDD(filters.receivedDateRange.to),
      from_section_name: filters.from_section_name || undefined,
      from_location_name: filters.from_location_name || undefined,
      to_section_name: filters.to_section_name || undefined,
      to_location_name: filters.to_location_name || undefined,
      authorized_by_user_name: filters.authorized_by_user_name || undefined,
      received_by_user_name: filters.received_by_user_name || undefined,
      notes: filters.notes || undefined,
    };

    try {
      const response = await fetch(`/api/assets/reports/movements-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, assetName, filters: apiFilters }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Error al generar PDF en el servidor." }));
        throw new Error(errorData.message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historial_movimientos_activo_${assetId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF descargado.", { id: pdfToastId });

    } catch (error: any) {
      console.error("Error exportando PDF:", error);
      toast.error(error.message || "No se pudo generar el PDF.", { id: pdfToastId });
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  if (isLoading && allMovements.length === 0) {
    return <div className="flex justify-center items-center p-8"><Spinner label="Cargando historial..." /></div>;
  }
  if (error && allMovements.length === 0) {
    return <div className="p-4 my-4 text-danger bg-danger-50 rounded-md text-center">Error: {error}</div>;
  }

  return (
    <div className="space-y-6 w-full">
      <Card className="p-4 shadow">
        <h3 className="text-lg font-semibold mb-3 text-foreground-700">Filtrar Historial</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-sm text-foreground-600 block mb-1">Fecha Transferencia (Desde)</label>
            <DatePicker value={filters.transferDateRange.from} onChange={val => handleDateRangeFilterChange('transferDateRange', 'from', val)} granularity="day" variant="bordered" size="sm" fullWidth />
          </div>
          <div>
            <label className="text-sm text-foreground-600 block mb-1">Fecha Transferencia (Hasta)</label>
            <DatePicker value={filters.transferDateRange.to} onChange={val => handleDateRangeFilterChange('transferDateRange', 'to', val)} granularity="day" variant="bordered" size="sm" fullWidth />
          </div>
          <Input label="Tipo/Notas Mov." placeholder="Filtrar notas..." value={filters.notes} onValueChange={val => handleFilterChange('notes', val)} startContent={<SearchIcon className="text-default-400" />} isClearable onClear={() => handleFilterChange('notes', "")} variant="bordered" size="sm" />
          <Input label="Desde Sección" placeholder="Filtrar sección..." value={filters.from_section_name} onValueChange={val => handleFilterChange('from_section_name', val)} startContent={<SearchIcon className="text-default-400" />} isClearable onClear={() => handleFilterChange('from_section_name', "")} variant="bordered" size="sm" />
          <Input label="Hacia Sección" placeholder="Filtrar sección..." value={filters.to_section_name} onValueChange={val => handleFilterChange('to_section_name', val)} startContent={<SearchIcon className="text-default-400" />} isClearable onClear={() => handleFilterChange('to_section_name', "")} variant="bordered" size="sm" />
          <Input label="Autorizado Por" placeholder="Filtrar usuario..." value={filters.authorized_by_user_name} onValueChange={val => handleFilterChange('authorized_by_user_name', val)} startContent={<SearchIcon className="text-default-400" />} isClearable onClear={() => handleFilterChange('authorized_by_user_name', "")} variant="bordered" size="sm" />
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <p className="text-sm text-default-600">
          Mostrando {itemsToDisplay.length} de {filteredMovements.length} movimientos filtrados ({allMovements.length} total).
        </p>
        <div className="flex gap-3">
          <Button color="primary" variant="flat" onPress={handleExportCSV} startContent={<DownloadIcon />} isDisabled={isLoading || filteredMovements.length === 0}>
            Exportar CSV
          </Button>
          <Button color="secondary" variant="flat" onPress={handleExportPDF} startContent={<DownloadIcon />} isLoading={isDownloadingPDF} isDisabled={isLoading || isDownloadingPDF}>
            Exportar PDF
          </Button>
        </div>
      </div>

      {isLoading && filteredMovements.length > 0 && <div className="flex justify-center py-4"><Spinner label="Actualizando lista..." /></div>}

      <Table
        aria-label="Historial de Movimientos del Activo"
        bottomContent={pages > 1 && itemsToDisplay.length > 0 ? (<div className="flex w-full justify-center py-4"> <Pagination isCompact showControls showShadow color="primary" page={page} total={pages} onChange={setPage} isDisabled={isLoading} /> </div>) : null}
        bottomContentPlacement="outside"
        classNames={{ wrapper: "max-h-[600px]", table: "min-w-[900px]" }}
      >
        <TableHeader columns={historyColumns}>
          {(column) => (<TableColumn key={column.uid} allowsSorting={column.sortable} className="bg-default-100 text-default-700">{column.name}</TableColumn>)}
        </TableHeader>
        <TableBody
          items={itemsToDisplay}
          emptyContent={!isLoading ? (allMovements.length === 0 ? "Este activo no tiene movimientos." : "No hay movimientos que coincidan con los filtros.") : " "}
          isLoading={isLoading && itemsToDisplay.length === 0}
          loadingContent={<Spinner label="Cargando movimientos..." />}
        >
          {(item) => (<TableRow key={item.transfer_id}>{(columnKey) => (<TableCell className="text-sm">{renderCell(item, columnKey)}</TableCell>)}</TableRow>)}
        </TableBody>
      </Table>
    </div>
  );
}