// app/dashboard/assets/components/AssetMovementsHistoryList.tsx
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Spinner, Chip, Pagination, Button, Input, DatePicker, Tooltip,
  Card
} from "@heroui/react";
import { toast } from 'react-hot-toast';
import { DateValue } from "@internationalized/date";
import { SearchIcon } from '@/components/icons/SearchIcon';
import { DownloadIcon } from '@/components/icons/DownloadIcon'; // Asegúrate que esta ruta sea correcta
import { RowDataPacket } from 'mysql2';

export interface AssetMovementRecord extends RowDataPacket {
  transfer_id: number;                 // ID de la transferencia (at.id)
  asset_id: number;                    // ID del activo movido (at.asset_id)
  transfer_date: string;               // Fecha y hora de la transferencia (at.transfer_date, formato ISO)

  from_section_id: number | null;      // ID de la sección origen
  from_section_name: string | null;    // Nombre de la sección origen
  from_location_id: number | null;     // ID de la ubicación origen
  from_location_name: string | null;   // Nombre de la ubicación origen
  from_user_id: number | null;         // ID del usuario que tenía el activo antes (opcional)
  from_user_name: string | null;       // Nombre del usuario que tenía el activo antes (opcional)

  to_section_id: number | null;        // ID de la sección destino
  to_section_name: string | null;      // Nombre de la sección destino
  to_location_id: number | null;       // ID de la ubicación destino
  to_location_name: string | null;     // Nombre de la ubicación destino
  to_user_id: number | null;           // ID del usuario al que se asigna/mueve (opcional)
  to_user_name: string | null;         // Nombre del usuario al que se asigna/mueve (opcional)

  authorized_by_user_id: number | null; // ID del usuario que autorizó/ejecutó el movimiento
  authorized_by_user_name: string | null; // Nombre del usuario que autorizó
  authorized_by_user_ci: string | null;   // CI del usuario que autorizó

  received_by_user_id: number | null;   // ID del usuario que recepcionó
  received_by_user_name: string | null;   // Nombre del usuario que recepcionó
  received_by_user_ci: string | null;     // CI del usuario que recepcionó
  received_by_user_section_name: string | null; // Nombre de la sección del usuario que recepcionó

  received_date: string | null;          // Fecha y hora de recepción (at.received_date, formato ISO)
  transfer_reason: string | null;        // Razón/justificación del movimiento (at.transfer_reason)
  notes: string | null;                  // Notas adicionales, incluye "Tipo de movimiento: X" (at.notes)
  signature_image_url: string | null;    // URL de la firma asociada al movimiento (at.signature_image_url)

  transfer_created_at: string;         // Fecha y hora de creación del registro de transferencia (at.created_at, formato ISO)

  // Podrías incluso añadir algunos detalles básicos del activo si siempre son necesarios en la lista
  // asset_product_name: string | null;
  // asset_serial_number: string | null;
  // asset_inventory_code: string | null;
}

interface AssetMovementsHistoryListProps {
  assetId: number;
  assetName?: string;
}

const historyColumns = [
  { uid: 'transfer_id', name: 'ID Transf.', sortable: true },
  { uid: 'transfer_date', name: 'Fecha Mov.', sortable: true },
  { uid: 'notes', name: 'Tipo/Notas', sortable: false },
  { uid: 'transfer_reason', name: 'Motivo Transf.', sortable: true },
  { uid: 'from_section_name', name: 'Desde Sección', sortable: true },
  { uid: 'from_location_name', name: 'Desde Lugar', sortable: true },
  { uid: 'from_user_name', name: 'Usuario Origen', sortable: true },
  { uid: 'to_section_name', name: 'Hacia Sección', sortable: true },
  { uid: 'to_location_name', name: 'Hacia Lugar', sortable: true },
  { uid: 'to_user_name', name: 'Usuario Destino', sortable: true },
  { uid: 'authorized_by_user_name', name: 'Autorizado Por', sortable: true },
  { uid: 'authorized_by_user_ci', name: 'CI Autoriza', sortable: true },
  { uid: 'received_by_user_name', name: 'Recibido Por', sortable: true },
  { uid: 'received_by_user_ci', name: 'CI Recibe', sortable: true },
  { uid: 'received_by_user_section_name', name: 'Sección Receptor', sortable: true },
  { uid: 'received_date', name: 'Fecha Recep.', sortable: true },
  { uid: 'signature_image_url', name: 'Firma URL', sortable: false }, // Mostrar como texto o enlace
  { uid: 'transfer_created_at', name: 'Fecha Registro', sortable: true },
  { uid: 'actions', name: 'Acciones', sortable: false },
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

const dateValueToYYYYMMDD = (dateValue: DateValue | null): string | null => {
  if (!dateValue) return null;
  return `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
};

export default function AssetMovementsHistoryList({ assetId, assetName }: AssetMovementsHistoryListProps) {
  const [allMovements, setAllMovements] = useState<AssetMovementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingListPDF, setIsDownloadingListPDF] = useState(false); // Renombrado para claridad
  const [isDownloadingSinglePDF, setIsDownloadingSinglePDF] = useState<number | null>(null);
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
    // Nuevos estados de filtro para nuevas columnas si decides implementarlos
    transfer_reason: "",
    from_user_name: "",
    to_user_name: "",
    authorized_by_user_ci: "",
    received_by_user_ci: "",
    received_by_user_section_name: "",
    // transfer_created_at_range: { from: null as DateValue | null, to: null as DateValue | null }, // Ejemplo
  });

  useEffect(() => {
    // console.log("AssetMovementsHistoryList: assetId prop =", assetId);
    if (!assetId) { setIsLoading(false); setError("ID de activo no proporcionado para cargar el historial."); return; }
    const fetchMovements = async () => {
      setIsLoading(true); setError(null);
      // console.log(`AssetMovementsHistoryList: Fetching movements for assetId: ${assetId}`);
      try {
        const response = await fetch(`/api/assets/${assetId}/movements`);
        // console.log("AssetMovementsHistoryList: Fetch response status:", response.status);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({ message: "Error desconocido al cargar movimientos." }));
          // console.error("AssetMovementsHistoryList: Error data from API:", errData);
          throw new Error(errData.message || `Error al cargar movimientos: ${response.statusText}`);
        }
        const data: AssetMovementRecord[] = await response.json();
        setAllMovements(data);
        // console.log("AssetMovementsHistoryList: Movimientos cargados:", data);
      } catch (err: any) {
        // console.error("AssetMovementsHistoryList: Catch block error fetching movements:", err);
        setError(err.message);
        toast.error(err.message || "No se pudo cargar el historial de movimientos.");
      } finally {
        setIsLoading(false);
        // console.log("AssetMovementsHistoryList: Fetching finished, isLoading set to false.");
      }
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
      // isDateInRange(mov.transfer_created_at, filters.transfer_created_at_range) && // Si añades filtro para esta fecha
      (filters.from_section_name === "" || String(mov.from_section_name || "").toLowerCase().includes(filters.from_section_name.toLowerCase())) &&
      (filters.from_location_name === "" || String(mov.from_location_name || "").toLowerCase().includes(filters.from_location_name.toLowerCase())) &&
      (filters.from_user_name === "" || String(mov.from_user_name || "").toLowerCase().includes(filters.from_user_name.toLowerCase())) &&
      (filters.to_section_name === "" || String(mov.to_section_name || "").toLowerCase().includes(filters.to_section_name.toLowerCase())) &&
      (filters.to_location_name === "" || String(mov.to_location_name || "").toLowerCase().includes(filters.to_location_name.toLowerCase())) &&
      (filters.to_user_name === "" || String(mov.to_user_name || "").toLowerCase().includes(filters.to_user_name.toLowerCase())) &&
      (filters.authorized_by_user_name === "" || String(mov.authorized_by_user_name || "").toLowerCase().includes(filters.authorized_by_user_name.toLowerCase())) &&
      (filters.authorized_by_user_ci === "" || String(mov.authorized_by_user_ci || "").toLowerCase().includes(filters.authorized_by_user_ci.toLowerCase())) &&
      (filters.received_by_user_name === "" || String(mov.received_by_user_name || "").toLowerCase().includes(filters.received_by_user_name.toLowerCase())) &&
      (filters.received_by_user_ci === "" || String(mov.received_by_user_ci || "").toLowerCase().includes(filters.received_by_user_ci.toLowerCase())) &&
      (filters.received_by_user_section_name === "" || String(mov.received_by_user_section_name || "").toLowerCase().includes(filters.received_by_user_section_name.toLowerCase())) &&
      (filters.notes === "" || String(mov.notes || "").toLowerCase().includes(filters.notes.toLowerCase())) &&
      (filters.transfer_reason === "" || String(mov.transfer_reason || "").toLowerCase().includes(filters.transfer_reason.toLowerCase()))
    ));
  }, [allMovements, filters]);

  const pages = Math.ceil(filteredMovements.length / rowsPerPage);
  const itemsToDisplay = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredMovements.slice(start, end);
  }, [page, filteredMovements, rowsPerPage]);

  const handleExportSingleMovementPDF = async (transferId: number) => {
    // console.log(`handleExportSingleMovementPDF called for transferId: ${transferId}`);
    setIsDownloadingSinglePDF(transferId);
    const pdfToastId = toast.loading(`Generando PDF para movimiento ID: ${transferId}...`);
    try {
      const response = await fetch(`/api/asset-transfers/${transferId}/pdf`);
      // console.log(`handleExportSingleMovementPDF response status for transferId ${transferId}:`, response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Error al generar PDF del movimiento." }));
        // console.error(`handleExportSingleMovementPDF error data for transferId ${transferId}:`, errorData);
        throw new Error(errorData.message);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `movimiento_activo_${assetId}_transferencia_${transferId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF del movimiento descargado.", { id: pdfToastId });
    } catch (error: any) {
      console.error("Error exportando PDF de movimiento individual:", error);
      toast.error(error.message || "No se pudo generar el PDF del movimiento.", { id: pdfToastId });
    } finally {
      setIsDownloadingSinglePDF(null);
    }
  };

  const renderCell = (item: AssetMovementRecord, columnKey: React.Key): React.ReactNode => {
    const cellValue = item[columnKey as keyof AssetMovementRecord];
    switch (columnKey) {
      case 'transfer_date': case 'received_date':
        return cellValue ? new Date(cellValue as string).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Montevideo' }) : 'N/A';
      case 'notes':
        const tipoMovMatch = (cellValue as string)?.match(/Tipo de movimiento: (.*)/);
        const displayNote = tipoMovMatch ? tipoMovMatch[1] : cellValue;
        return <Chip size="sm" variant="flat" color="default" className="whitespace-normal text-xs">{displayNote || 'N/A'}</Chip>;
      case 'signature_image_url':
        return cellValue ? <a href={cellValue as string} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline text-xs">Ver Firma</a> : 'N/A';

      case 'actions':
        return (
          <div className="flex items-center justify-center">
            <Tooltip content="Exportar este movimiento a PDF">
              <Button
                isIconOnly size="sm" variant="light"
                onPress={() => {
                  // console.log(`Botón PDF para transfer_id ${item.transfer_id} presionado.`);
                  handleExportSingleMovementPDF(item.transfer_id);
                }}
                isLoading={isDownloadingSinglePDF === item.transfer_id}
                aria-label={`Exportar movimiento ${item.transfer_id} a PDF`}
              >
                {isDownloadingSinglePDF === item.transfer_id ? <Spinner size="sm" color="current" /> : <DownloadIcon className="text-lg text-primary-500" />}
              </Button>
            </Tooltip>
          </div>
        );
      default: return cellValue != null && String(cellValue).trim() !== "" ? String(cellValue) : 'N/A';
    }
  };

  const handleExportCSV = () => {
    // console.log("handleExportCSV llamado");
    if (filteredMovements.length === 0) { toast.error("No hay datos para exportar."); return; }
    const header = historyColumns.filter(col => col.uid !== 'actions').map(col => col.name).join(','); // Excluir columna de acciones
    const rows = filteredMovements.map(mov =>
      historyColumns.filter(col => col.uid !== 'actions').map(col => {
        let val = mov[col.uid as keyof AssetMovementRecord];
        if (col.uid === 'transfer_date' || col.uid === 'received_date') {
          val = val ? new Date(val as string).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Montevideo' }) : 'N/A';
        } else if (col.uid === 'notes') {
          const tipoMovMatch = (val as string)?.match(/Tipo de movimiento: (.*)/);
          val = tipoMovMatch ? tipoMovMatch[1] : val;
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

  const handleExportListPDF = async () => { // Renombrado de handleExportFullListPDF
    // console.log("handleExportListPDF llamado");
    if (filteredMovements.length === 0 && !Object.values(filters).some(f => f && (typeof f !== 'object' || (f as any).from || (f as any).to))) {
      toast.error("No hay datos (o filtros aplicados) para generar el PDF de la lista.");
      return;
    }
    setIsDownloadingListPDF(true); // Usar estado correcto
    const pdfToastId = toast.loading("Generando PDF de la lista...");
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
      // console.log("handleExportListPDF response status:", response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Error al generar PDF de la lista en el servidor." }));
        // console.error("handleExportListPDF error data:", errorData);
        throw new Error(errorData.message);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historial_movimientos_activo_${assetId}_lista_filtrada.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF de la lista descargado.", { id: pdfToastId });
    } catch (error: any) {
      console.error("Error exportando PDF de la lista:", error);
      toast.error(error.message || "No se pudo generar el PDF de la lista.", { id: pdfToastId });
    } finally {
      setIsDownloadingListPDF(false); // Usar estado correcto
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-xs text-foreground-600 block mb-1">Fecha Transf. (Desde)</label>
            <DatePicker showMonthAndYearPickers aria-label="Fecha Transferencia Desde" value={filters.transferDateRange.from} onChange={val => handleDateRangeFilterChange('transferDateRange', 'from', val)} granularity="day" variant="bordered" size="sm" fullWidth />
          </div>
          <div>
            <label className="text-xs text-foreground-600 block mb-1">Fecha Transf. (Hasta)</label>
            <DatePicker showMonthAndYearPickers aria-label="Fecha Transferencia Hasta" value={filters.transferDateRange.to} onChange={val => handleDateRangeFilterChange('transferDateRange', 'to', val)} granularity="day" variant="bordered" size="sm" fullWidth />
          </div>

          <div>
            <label className="text-xs text-foreground-600 block mb-1">Fecha Recep. (Desde)</label>
            <DatePicker showMonthAndYearPickers aria-label="Fecha Recepción Desde" value={filters.receivedDateRange.from} onChange={val => handleDateRangeFilterChange('receivedDateRange', 'from', val)} granularity="day" variant="bordered" size="sm" fullWidth />
          </div>
          <div>
            <label className="text-xs text-foreground-600 block mb-1">Fecha Recep. (Hasta)</label>
            <DatePicker showMonthAndYearPickers aria-label="Fecha Recepción Hasta" value={filters.receivedDateRange.to} onChange={val => handleDateRangeFilterChange('receivedDateRange', 'to', val)} granularity="day" variant="bordered" size="sm" fullWidth />
          </div>
          <Input label="Tipo/Notas" aria-label="Filtrar por Tipo o Notas del Movimiento" placeholder="Filtrar..." value={filters.notes} onValueChange={val => handleFilterChange('notes', val)} startContent={<SearchIcon className="text-default-400" />} isClearable onClear={() => handleFilterChange('notes', "")} variant="bordered" size="sm" />
          <Input label="Desde Sección" aria-label="Filtrar por Sección de Origen" placeholder="Filtrar..." value={filters.from_section_name} onValueChange={val => handleFilterChange('from_section_name', val)} startContent={<SearchIcon className="text-default-400" />} isClearable onClear={() => handleFilterChange('from_section_name', "")} variant="bordered" size="sm" />
          <Input label="Desde Lugar" aria-label="Filtrar por Lugar de Origen" placeholder="Filtrar..." value={filters.from_location_name} onValueChange={val => handleFilterChange('from_location_name', val)} startContent={<SearchIcon className="text-default-400" />} isClearable onClear={() => handleFilterChange('from_location_name', "")} variant="bordered" size="sm" />
          <Input label="Hacia Sección" aria-label="Filtrar por Sección de Destino" placeholder="Filtrar..." value={filters.to_section_name} onValueChange={val => handleFilterChange('to_section_name', val)} startContent={<SearchIcon className="text-default-400" />} isClearable onClear={() => handleFilterChange('to_section_name', "")} variant="bordered" size="sm" />
          <Input label="Hacia Lugar" aria-label="Filtrar por Lugar de Destino" placeholder="Filtrar..." value={filters.to_location_name} onValueChange={val => handleFilterChange('to_location_name', val)} startContent={<SearchIcon className="text-default-400" />} isClearable onClear={() => handleFilterChange('to_location_name', "")} variant="bordered" size="sm" />
          <Input label="Autorizado Por" aria-label="Filtrar por Usuario que Autorizó" placeholder="Filtrar..." value={filters.authorized_by_user_name} onValueChange={val => handleFilterChange('authorized_by_user_name', val)} startContent={<SearchIcon className="text-default-400" />} isClearable onClear={() => handleFilterChange('authorized_by_user_name', "")} variant="bordered" size="sm" />
          <Input label="Recibido Por" aria-label="Filtrar por Usuario que Recibió" placeholder="Filtrar..." value={filters.received_by_user_name} onValueChange={val => handleFilterChange('received_by_user_name', val)} startContent={<SearchIcon className="text-default-400" />} isClearable onClear={() => handleFilterChange('received_by_user_name', "")} variant="bordered" size="sm" />

        </div>
      </Card>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <p className="text-sm text-default-600">
          Mostrando {itemsToDisplay.length} de {filteredMovements.length} movimientos filtrados ({allMovements.length} total).
        </p>
        <div className="flex gap-3 flex-wrap justify-center sm:justify-end">
          <Button color="primary" variant="flat" onPress={handleExportCSV} startContent={<DownloadIcon />} isDisabled={isLoading || filteredMovements.length === 0}>
            Exportar CSV (Lista)
          </Button>
          <Button color="secondary" variant="flat" onPress={handleExportListPDF} startContent={<DownloadIcon />} isLoading={isDownloadingListPDF} isDisabled={isLoading || isDownloadingListPDF || filteredMovements.length === 0}>
            Exportar PDF (Lista)
          </Button>
        </div>
      </div>

      {isLoading && itemsToDisplay.length > 0 && <div className="flex justify-center py-4"><Spinner label="Actualizando lista..." /></div>}

      <Table
        aria-label="Historial de Movimientos del Activo"
        bottomContent={pages > 1 && itemsToDisplay.length > 0 ? (<div className="flex w-full justify-center py-4"> <Pagination isCompact showControls showShadow color="primary" page={page} total={pages} onChange={setPage} isDisabled={isLoading} /> </div>) : null}
        bottomContentPlacement="outside"
        classNames={{ wrapper: "max-h-[600px] overflow-auto", table: "min-w-[1200px]" }}
      >
        <TableHeader columns={historyColumns}>
          {(column) => (<TableColumn key={column.uid} allowsSorting={column.sortable} className="bg-default-100 text-default-700 sticky top-0 z-10 whitespace-nowrap">{column.name}</TableColumn>)}
        </TableHeader>
        <TableBody
          items={itemsToDisplay}
          emptyContent={!isLoading ? (allMovements.length === 0 ? "Este activo no tiene movimientos." : "No hay movimientos que coincidan con los filtros.") : "Cargando..."}
          isLoading={isLoading && itemsToDisplay.length === 0}
          loadingContent={<Spinner label="Cargando movimientos..." />}
        >
          {(item) => (<TableRow key={item.transfer_id}>{(columnKey) => (<TableCell className="text-xs py-2 px-3 whitespace-nowrap">{renderCell(item, columnKey)}</TableCell>)}</TableRow>)}
        </TableBody>
      </Table>
    </div>
  );
}