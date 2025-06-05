// app/dashboard/assets/components/AssociatedDocumentsList.tsx
"use client";

import React, { useEffect, useState, useCallback, FormEvent, ChangeEvent } from 'react';
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Button, Tooltip, Spinner, Card, CardHeader, CardBody, Divider,
  Input, Textarea, Select, SelectItem,
  Chip
} from "@heroui/react";
import { toast } from 'react-hot-toast';

import { DownloadIcon } from "@/components/icons/DownloadIcon";
import { UploadIcon } from "@/components/icons/UploadIcon"; // Usa el que creamos

// Asumiendo que tienes esta función en tus utilidades globales
import { formatCustomDate } from "@/lib/utils";

// Importar el tipo desde la API que acabamos de definir/revisar
import type { AssetDocumentInfo } from "@/app/api/assets/[id]/documents/route"; // Ajusta [id] o [assetId] según tu estructura


interface AssociatedDocumentsListProps {
  assetId: number | null | undefined;
  assetName?: string;
}

const documentCategories = [
  { key: "invoice_purchase", label: "Factura de Compra" },
  { key: "warranty_certificate", label: "Certificado de Garantía" },
  { key: "user_manual", label: "Manual de Usuario" },
  { key: "contract", label: "Contrato" },
  { key: "technical_report", label: "Informe Técnico" },
  { key: "email_communication", label: "Email (Comunicación)" },
  { key: "other", label: "Otro Documento" },
];

const getFileIcon = (mimeType: string): string => {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('word') || mimeType.includes('officedocument.wordprocessingml')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheetml') || mimeType.includes('officedocument.spreadsheetml')) return '📊';
  if (mimeType.includes('text')) return '🧾';
  if (mimeType.includes('vnd.ms-outlook') || mimeType.includes('message/rfc822')) return '📧';
  return '📎';
};

const AssociatedDocumentsList: React.FC<AssociatedDocumentsListProps> = ({ assetId, assetName }) => {
  const [documents, setDocuments] = useState<AssetDocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [documentCategory, setDocumentCategory] = useState<string>(documentCategories[0].key);
  const [documentDescription, setDocumentDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (typeof assetId !== 'number' || isNaN(assetId) || assetId <= 0) {
      // console.log("AssociatedDocumentsList: assetId no es válido o no está listo. No se cargarán documentos. Recibido:", assetId);
      setDocuments([]);
      setIsLoading(false);
      setError(null); // Limpiar error si el ID no es válido para evitar mostrar error persistente
      return;
    }

    // console.log(`AssociatedDocumentsList: Iniciando fetch para assetId: ${assetId}`);
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/assets/${assetId}/documents`);
      // console.log(`AssociatedDocumentsList: Respuesta de API para assetId ${assetId}, Status: ${response.status}`);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: `Error ${response.status} al obtener documentos.` }));
        // console.error(`AssociatedDocumentsList: ErrorData de API: `, errData);
        throw new Error(errData.message);
      }
      const data: AssetDocumentInfo[] = await response.json();
      // console.log(`AssociatedDocumentsList: Documentos recibidos para assetId ${assetId}:`, data);
      setDocuments(data);
    } catch (err: any) {
      // console.error("AssociatedDocumentsList: Error en catch de fetchDocuments:", err.message);
      setError(err.message);
      setDocuments([]);
    } finally {
      setIsLoading(false);
      // console.log(`AssociatedDocumentsList: Fetch finalizado para assetId ${assetId}, isLoading: false`);
    }
  }, [assetId]);

  useEffect(() => {
    // console.log("AssociatedDocumentsList: useEffect disparado, assetId actual:", assetId);
    fetchDocuments();
  }, [fetchDocuments]); // fetchDocuments está memoizado y su dependencia es assetId

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => { /* ... (sin cambios) ... */
    if (e.target.files && e.target.files[0]) {
      setFileToUpload(e.target.files[0]);
    } else {
      setFileToUpload(null);
    }
  };
  const handleDocumentUpload = async (e: FormEvent) => { /* ... (sin cambios) ... */
    e.preventDefault();
    if (!fileToUpload) {
      toast.error("Por favor, selecciona un archivo para subir.");
      return;
    }
    if (!assetId) {
      toast.error("No se pudo determinar el ID del activo para la subida.");
      return;
    }

    setIsUploading(true);
    const uploadToastId = toast.loading("Subiendo documento...");
    const formDataApi = new FormData();
    formDataApi.append('invoiceFile', fileToUpload);
    formDataApi.append('entityType', 'asset');
    formDataApi.append('entityId', String(assetId));
    formDataApi.append('documentCategory', documentCategory);
    if (documentDescription.trim()) {
      formDataApi.append('description', documentDescription.trim());
    }

    try {
      const response = await fetch('/api/documents/upload', { method: 'POST', body: formDataApi });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Error al subir el documento.");
      toast.success(result.message || "Documento subido correctamente.", { id: uploadToastId });
      setFileToUpload(null);
      setDocumentCategory(documentCategories[0].key);
      setDocumentDescription("");
      setShowUploadForm(false);
      await fetchDocuments();
    } catch (uploadError: any) {
      toast.error(uploadError.message || "No se pudo subir el documento.", { id: uploadToastId });
    } finally {
      setIsUploading(false);
    }
  };

  const documentTableColumns = [
    { uid: "icon", name: "Tipo", width: "5%" },
    { uid: "original_filename", name: "Nombre Archivo" },
    { uid: "document_category", name: "Categoría" },
    { uid: "description", name: "Descripción", width: "30%" },
    { uid: "uploaded_by_user_name", name: "Subido Por" },
    { uid: "created_at", name: "Fecha Subida" },
    { uid: "actions", name: "Acciones", width: "10%" },
  ];

  const renderCell = useCallback((item: AssetDocumentInfo, columnKey: React.Key) => {
    const cellValue = item[columnKey as keyof AssetDocumentInfo];
    switch (columnKey) {
      case "icon":
        return <span className="text-xl text-center block">{getFileIcon(item.mime_type)}</span>;
      case "original_filename":
        return <span className="font-medium text-sm">{item.original_filename}</span>;
      case "document_category":
        const category = documentCategories.find(c => c.key === item.document_category);
        return <Chip size="sm" variant="flat" color="default">{category ? category.label : (item.document_category || "General")}</Chip>;
      case "description":
        return <span className="text-xs whitespace-pre-wrap">{item.description || "N/A"}</span>
      case "created_at":
        return formatCustomDate(item.created_at, { hour: '2-digit', minute: '2-digit' });
      case "uploaded_by_user_name":
        return <span className="text-xs">{item.uploaded_by_user_name || "Sistema"}</span>;
      case "actions":
        return (
          <div className="flex justify-center">
            <Tooltip content="Descargar documento">
              <Button
                as="a"
                href={`/api/documents/${item.id}`}
                target="_blank"
                isIconOnly variant="light" size="sm"
                aria-label={`Descargar ${item.original_filename}`}
              >
                <DownloadIcon className="text-lg text-primary-500" />
              </Button>
            </Tooltip>
          </div>
        );
      default:
        return String(cellValue ?? "N/A");
    }
  }, []);

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground">
          Documentos Asociados ({isLoading ? <Spinner size="sm" color="current" /> : documents.length})
        </h2>
        <Button
          size="sm"
          color="primary"
          variant={showUploadForm ? "bordered" : "ghost"}
          startContent={!showUploadForm ? <UploadIcon size={18} /> : undefined}
          onPress={() => setShowUploadForm(!showUploadForm)}
          isDisabled={!assetId || typeof assetId !== 'number' || assetId <= 0}
        >
          {showUploadForm ? "Cancelar Subida" : "Adjuntar Documento"}
        </Button>
      </CardHeader>
      <Divider />
      <CardBody>
        {showUploadForm && assetId && (
          <form onSubmit={handleDocumentUpload} className="space-y-4 p-4 mb-6 border border-dashed border-default-300 rounded-md bg-default-50 dark:bg-default-100">
            {/* ... (Formulario de subida igual que antes) ... */}
            <h3 className="text-md font-medium">Adjuntar Nuevo Documento para {assetName || `Activo ID: ${assetId}`}</h3>
            <Input
              type="file"
              labelPlacement="outside-left"
              label="Archivo:"
              onChange={handleFileChange}
              variant="bordered"
              isRequired
              isDisabled={isUploading}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt,.msg,.eml"
              description="Tipos permitidos: PDF, Imagen, Word, Excel, Texto, Email (.msg, .eml)."
            />
            <Select
              label="Categoría del Documento"
              placeholder="Seleccionar categoría"
              selectedKeys={documentCategory ? [documentCategory] : []}
              onSelectionChange={(keys) => setDocumentCategory(Array.from(keys as Set<string>)[0])}
              variant="bordered"
              isRequired
              isDisabled={isUploading}
            >
              {documentCategories.map((cat) => (
                <SelectItem key={cat.key} value={cat.key}>{cat.label}</SelectItem>
              ))}
            </Select>
            <Textarea
              label="Descripción (Opcional)"
              value={documentDescription}
              onValueChange={setDocumentDescription}
              variant="bordered"
              minRows={2}
              isDisabled={isUploading}
              placeholder="Ej: Factura de compra N°123, Certificado de garantía extendida..."
            />
            <div className="flex justify-end">
              <Button type="submit" color="success" variant="solid" isLoading={isUploading} isDisabled={!fileToUpload || isUploading}>
                {isUploading ? "Subiendo..." : "Confirmar y Subir"}
              </Button>
            </div>
          </form>
        )}

        {isLoading && <div className="flex justify-center p-4"><Spinner label="Cargando documentos..." /></div>}

        {!isLoading && error &&
          <p className="text-danger text-center p-4">Error cargando documentos: {error}. Por favor, verifica la consola o intenta recargar la página.</p>
        }

        {!isLoading && !error && (
          <Table
            aria-label="Documentos asociados al activo"
            removeWrapper
            selectionMode="none"
            className="min-w-full"
          >
            <TableHeader columns={documentTableColumns}>
              {(column) => (
                <TableColumn
                  key={column.uid}
                  className="bg-default-100 text-default-700 text-sm"
                  width={column.width || undefined}
                >
                  {column.name}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody
              items={documents}
              emptyContent={!assetId || (typeof assetId === 'number' && assetId <= 0) ? "Esperando ID de activo válido." : "No hay documentos adjuntos a este activo."}
            >
              {(item: AssetDocumentInfo) => (
                <TableRow key={item.id}>
                  {(columnKey) => <TableCell className="py-2 px-3 text-sm">{renderCell(item, columnKey)}</TableCell>}
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
};

export default AssociatedDocumentsList;