// app/dashboard/components/AssociatedDocumentsList.tsx
// (O la ubicación donde decidas colocar este componente genérico)
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
import { UploadIcon } from "@/components/icons/UploadIcon";
import { formatCustomDate } from "@/lib/utils"; //

// Interfaz para la información del documento que se devolverá al frontend
export interface GenericDocumentInfo {
    id: number; // ID del documento mismo
    original_filename: string;
    mime_type: string;
    file_size_bytes: number;
    document_category: string | null;
    description: string | null;
    uploaded_by_user_id: number | null;
    uploaded_by_user_name?: string | null; // Nombre del usuario que subió el doc
    created_at: string; // Fecha de subida (ISO string)
}

interface AssociatedDocumentsListProps {
    entityId: number | null | undefined;
    entityType: string; // ej: "asset", "software_license", "company"
    entityNameFriendly?: string; // Un nombre legible de la entidad, ej: "Activo XYZ" o "Licencia Adobe"
}

// Definición de categorías de documentos
const documentCategories = [
    { key: "invoice_purchase", label: "Factura de Compra" },
    { key: "invoice_sale", label: "Factura de Venta" },
    { key: "warranty_certificate", label: "Certificado de Garantía" },
    { key: "user_manual", label: "Manual de Usuario" },
    { key: "contract", label: "Contrato" },
    { key: "technical_report", label: "Informe Técnico" },
    { key: "email_communication", label: "Email (Comunicación)" },
    { key: "certification", label: "Certificación" },
    { key: "legal_document", label: "Documento Legal" },
    { key: "policy_document", label: "Documento de Política" },
    { key: "other", label: "Movimiento de bien original" },
    { key: "other", label: "Otro Documento" },
];

// Función para obtener un ícono simple basado en el MIME type
const getFileIcon = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('word') || mimeType.includes('officedocument.wordprocessingml')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheetml') || mimeType.includes('officedocument.spreadsheetml')) return '📊';
    if (mimeType.includes('text')) return '🧾';
    if (mimeType.includes('vnd.ms-outlook') || mimeType.includes('message/rfc822')) return '📧';
    return '📎';
};

const AssociatedDocumentsList: React.FC<AssociatedDocumentsListProps> = ({ entityId, entityType, entityNameFriendly }) => {
    const [documents, setDocuments] = useState<GenericDocumentInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showUploadForm, setShowUploadForm] = useState(false);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [documentCategory, setDocumentCategory] = useState<string>(documentCategories[0].key);
    const [documentDescription, setDocumentDescription] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    const fetchDocuments = useCallback(async () => {
        if (typeof entityId !== 'number' || isNaN(entityId) || entityId <= 0 || !entityType) {
            setDocuments([]);
            setIsLoading(false);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            // Llamada al endpoint genérico /api/documents
            const response = await fetch(`/api/documents?entityType=${encodeURIComponent(entityType)}&entityId=${entityId}`);

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ message: `Error ${response.status} al obtener documentos para ${entityType} ID ${entityId}.` }));
                throw new Error(errData.message);
            }
            const data: GenericDocumentInfo[] = await response.json();
            setDocuments(data);
        } catch (err: any) {
            setError(err.message);
            setDocuments([]);
            // Opcional: podrías añadir un toast aquí si la carga falla de forma crítica
            // toast.error(`Error al cargar documentos: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [entityId, entityType]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFileToUpload(e.target.files[0]);
        } else {
            setFileToUpload(null);
        }
    };

    const handleDocumentUpload = async (e: FormEvent) => {
        e.preventDefault();
        if (!fileToUpload) {
            toast.error("Por favor, selecciona un archivo para subir.");
            return;
        }
        if (!entityId || !entityType) {
            toast.error("No se pudo determinar la entidad para la subida del documento.");
            return;
        }

        setIsUploading(true);
        const uploadToastId = toast.loading("Subiendo documento...");
        const formDataApi = new FormData();

        // El endpoint /api/documents/upload espera 'invoiceFile'.
        // Si has generalizado el backend para aceptar 'documentFile', cambia aquí.
        formDataApi.append('invoiceFile', fileToUpload); //

        formDataApi.append('entityType', entityType); //
        formDataApi.append('entityId', String(entityId)); //
        formDataApi.append('documentCategory', documentCategory); //
        if (documentDescription.trim()) {
            formDataApi.append('description', documentDescription.trim()); //
        }

        try {
            const response = await fetch('/api/documents/upload', { method: 'POST', body: formDataApi }); //
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Error al subir el documento.");
            toast.success(result.message || "Documento subido correctamente.", { id: uploadToastId });
            setFileToUpload(null);
            setDocumentCategory(documentCategories[0].key);
            setDocumentDescription("");
            setShowUploadForm(false);
            await fetchDocuments(); // Recargar la lista
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

    const renderCell = useCallback((item: GenericDocumentInfo, columnKey: React.Key) => {
        const cellValue = item[columnKey as keyof GenericDocumentInfo];
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
                return formatCustomDate(item.created_at, { hour: '2-digit', minute: '2-digit' }); //
            case "uploaded_by_user_name":
                return <span className="text-xs">{item.uploaded_by_user_name || "Sistema"}</span>;
            case "actions":
                return (
                    <div className="flex justify-center">
                        <Tooltip content="Descargar documento">
                            <Button
                                as="a"
                                href={`/api/documents/${item.id}`} // El endpoint de descarga individual ya es genérico
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

    const entityDisplayName = entityNameFriendly || `${entityType} ID: ${entityId}`;

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
                    isDisabled={!entityId || typeof entityId !== 'number' || entityId <= 0 || !entityType}
                >
                    {showUploadForm ? "Cancelar Subida" : "Adjuntar Documento"}
                </Button>
            </CardHeader>
            <Divider />
            <CardBody>
                {showUploadForm && entityId && entityType && (
                    <form onSubmit={handleDocumentUpload} className="space-y-4 p-4 mb-6 border border-dashed border-default-300 rounded-md bg-default-50 dark:bg-default-100">
                        <h3 className="text-md font-medium">Adjuntar Nuevo Documento para {entityDisplayName}</h3>
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
                    <p className="text-danger text-center p-4">Error cargando documentos: {error}.</p>
                }

                {!isLoading && !error && (
                    <Table
                        aria-label={`Documentos asociados a ${entityDisplayName}`}
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
                            emptyContent={!entityId || (typeof entityId === 'number' && entityId <= 0) || !entityType
                                ? "Esperando ID y tipo de entidad válidos."
                                : `No hay documentos adjuntos a ${entityDisplayName}.`
                            }
                        >
                            {(item: GenericDocumentInfo) => (
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