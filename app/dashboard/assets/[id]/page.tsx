// app/dashboard/assets/[id]/page.tsx
"use client";

import React, { useEffect, useState, FormEvent, ChangeEvent, useCallback } from "react"; // Añadido FormEvent, ChangeEvent
import { useParams, useRouter } from "next/navigation";
import {
    Card, CardHeader, CardBody, Divider, Chip, Spinner, Button,
    Link as HeroUILink, Avatar, Table, TableHeader, TableColumn,
    TableBody, TableRow, TableCell, Image as HeroUIImage, Tooltip,
    Input, Textarea, Select, SelectItem // Añadidos para el formulario de subida
} from "@heroui/react";
import { toast } from "react-hot-toast";
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import { EditIcon } from "@/components/icons/EditIcon";
import { EyeIcon } from "@/components/icons/EyeIcon";
import AssetMovementsHistoryList from "@/app/dashboard/assets/components/AssetMovementsHistoryList";
import { IAssetAPI } from "@/lib/schema";
import { DownloadIcon } from "@/components/icons/DownloadIcon"; // Para el botón de descarga

// Interfaz para la respuesta del endpoint que creamos en Paso 1
import type { AssetDocumentInfo } from "@/app/api/assets/[id]/documents/route"; // Ajusta la ruta si es diferente


// Interfaces para los datos adicionales que se cargarán (software y asignación de usuario)
interface AssetSoftwareLicenseInfo {
    software_license_id: number;
    software_name: string;
    license_type: string;
    expiry_date?: string | null;
    installation_date_on_asset: string | null;
}

interface AssetUserAssignmentInfo {
    user_id: number;
    user_name: string;
    user_email?: string | null;
    user_section_name?: string | null;
    assignment_date: string;
}

const statusColorMap: Record<string, "success" | "danger" | "warning" | "primary" | "secondary" | "default"> = {
    in_use: "success",
    in_storage: "warning",
    under_repair: "secondary",
    disposed: "danger",
    lost: "default",
};

const DetailItem = ({ label, value, children }: { label: string; value?: string | number | null; children?: React.ReactNode }) => {
    if (!children && (value === null || value === undefined || String(value).trim() === "")) return null;
    return (
        <div className="mb-3">
            <dt className="text-sm font-medium text-default-500">{label}</dt>
            {children ? <dd className="mt-1 text-sm text-foreground break-words">{children}</dd> : <dd className="mt-1 text-sm text-foreground break-words">{String(value)}</dd>}
        </div>
    );
};

// Opciones para la categoría del documento
const documentCategories = [
    { key: "invoice_purchase", label: "Factura de Compra" },
    { key: "warranty_certificate", label: "Certificado de Garantía" },
    { key: "user_manual", label: "Manual de Usuario" },
    { key: "contract", label: "Contrato" },
    { key: "technical_report", label: "Informe Técnico" },
    { key: "other", label: "Otro" },
];


export default function AssetDetailPage() {
    const params = useParams();
    const router = useRouter();
    const assetId = parseInt(params.id as string, 10);

    const [asset, setAsset] = useState<IAssetAPI | null>(null);
    const [assignedSoftware, setAssignedSoftware] = useState<AssetSoftwareLicenseInfo[]>([]);
    const [currentUserAssignment, setCurrentUserAssignment] = useState<AssetUserAssignmentInfo | null>(null);

    // Estados para documentos
    const [assetDocuments, setAssetDocuments] = useState<AssetDocumentInfo[]>([]);
    const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [documentCategory, setDocumentCategory] = useState<string>(documentCategories[0].key);
    const [documentDescription, setDocumentDescription] = useState("");
    const [isUploadingDocument, setIsUploadingDocument] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAssetDocuments = useCallback(async () => {
        if (isNaN(assetId)) return;
        setIsLoadingDocuments(true);
        try {
            const docsRes = await fetch(`/api/assets/${assetId}/documents`);
            if (docsRes.ok) {
                setAssetDocuments(await docsRes.json());
            } else {
                console.warn(`No se pudieron cargar los documentos para el activo ${assetId}`);
                toast.error('No se pudieron cargar los documentos asociados.');
            }
        } catch (docError) {
            console.error("Error fetching documents:", docError);
            toast.error("Error al cargar la lista de documentos.");
        } finally {
            setIsLoadingDocuments(false);
        }
    }, [assetId]);


    useEffect(() => {
        if (isNaN(assetId)) {
            setError("ID de activo no válido.");
            setIsLoading(false);
            return;
        }

        const fetchAllAssetData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const assetRes = await fetch(`/api/assets/${assetId}`);
                if (!assetRes.ok) {
                    const errData = await assetRes.json().catch(() => ({}));
                    throw new Error(errData.message || `Error al cargar el activo: ${assetRes.statusText}`);
                }
                const assetData: IAssetAPI = await assetRes.json();
                setAsset(assetData);

                // Licencias (asumiendo que el endpoint /api/assets/[id] ya las incluye como 'linked_software_licenses')
                if (assetData && (assetData as any).linked_software_licenses) {
                    setAssignedSoftware((assetData as any).linked_software_licenses);
                } else {
                    // Fallback si no vienen en la respuesta principal (requeriría un endpoint dedicado)
                    // console.warn("Licencias no incluidas en la respuesta principal del activo. Se necesitaría un fetch separado.");
                }


                // Fetch asignación actual a usuario (endpoint dedicado)
                const assignmentRes = await fetch(`/api/assets/${assetId}/assignments`);
                if (assignmentRes.ok) {
                    const assignmentData = await assignmentRes.json();
                    if (Array.isArray(assignmentData) && assignmentData.length > 0) {
                        setCurrentUserAssignment(assignmentData[0] as AssetUserAssignmentInfo);
                    } else if (!Array.isArray(assignmentData) && assignmentData) {
                        setCurrentUserAssignment(assignmentData as AssetUserAssignmentInfo);
                    }
                } else {
                    console.warn(`No se pudo cargar la asignación de usuario para el activo ${assetId}`);
                }

                // Fetch documentos
                await fetchAssetDocuments();

            } catch (err: any) {
                setError(err.message);
                toast.error(err.message || "No se pudieron cargar todos los detalles del activo.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllAssetData();
    }, [assetId, fetchAssetDocuments]);

    const formatDate = (dateString: string | null | undefined, includeTime: boolean = false) => {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            const options: Intl.DateTimeFormatOptions = {
                year: 'numeric', month: '2-digit', day: '2-digit',
                timeZone: 'UTC'
            };
            if (includeTime) {
                options.hour = '2-digit';
                options.minute = '2-digit';
            }
            return date.toLocaleDateString('es-UY', options);
        } catch (e) { return "Fecha inválida"; }
    };

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
        if (!assetId) {
            toast.error("No se pudo determinar el ID del activo.");
            return;
        }

        setIsUploadingDocument(true);
        const uploadToastId = toast.loading("Subiendo documento...");

        const formData = new FormData();
        formData.append('invoiceFile', fileToUpload); // 'invoiceFile' es lo que espera el API
        formData.append('entityType', 'asset');
        formData.append('entityId', String(assetId));
        formData.append('documentCategory', documentCategory);
        if (documentDescription.trim()) {
            formData.append('description', documentDescription.trim());
        }

        try {
            const response = await fetch('/api/documents/upload', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Error al subir el documento.");
            }
            toast.success(result.message || "Documento subido correctamente.", { id: uploadToastId });
            setFileToUpload(null);
            setDocumentCategory(documentCategories[0].key);
            setDocumentDescription("");
            setShowUploadForm(false);
            await fetchAssetDocuments(); // Recargar la lista de documentos
        } catch (uploadError: any) {
            toast.error(uploadError.message || "No se pudo subir el documento.", { id: uploadToastId });
        } finally {
            setIsUploadingDocument(false);
        }
    };

    const documentTableColumns = [
        { uid: "icon", name: "Tipo" },
        { uid: "original_filename", name: "Nombre Archivo" },
        { uid: "document_category", name: "Categoría" },
        { uid: "description", name: "Descripción" },
        { uid: "created_at", name: "Fecha Subida" },
        { uid: "actions", name: "Acciones" },
    ];

    const getFileIcon = (mimeType: string) => {
        if (mimeType.includes('pdf')) return '📄'; // PDF
        if (mimeType.includes('image')) return '🖼️'; // Imagen
        if (mimeType.includes('word')) return '📝'; // Word
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊'; // Excel
        return '📎'; // Genérico
    };


    if (isLoading && !asset) { // Ajustada condición de carga principal
        return (
            <div className="flex justify-center items-center h-[calc(100vh-120px)]">
                <Spinner label="Cargando detalles del activo..." color="primary" size="lg" />
            </div>
        );
    }

    if (error || (!isLoading && !asset)) { // Ajustada condición de error
        return (
            <div className="container mx-auto p-8 text-center">
                <h1 className="text-xl font-bold mb-4 text-danger-500">Error</h1>
                <p className="mb-6">{error || `Activo con ID ${assetId} no encontrado.`}</p>
                <Button as={HeroUILink} href="/dashboard/assets" startContent={<ArrowLeftIcon />}>
                    Volver a Lista de Activos
                </Button>
            </div>
        );
    }

    if (!asset) return null; // Fallback por si acaso, aunque las condiciones anteriores deberían cubrirlo

    const softwareColumns = [
        { uid: "software_name", name: "Software" },
        { uid: "license_type", name: "Tipo Lic." },
        { uid: "expiry_date", name: "Vencimiento" },
        { uid: "actions", name: "Ver Licencia" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Button as={HeroUILink} href="/dashboard/assets" variant="flat" startContent={<ArrowLeftIcon />}>
                    Volver a Activos
                </Button>
                <Button as={HeroUILink} href={`/dashboard/assets/${asset.id}/edit`} color="primary" variant="flat" startContent={<EditIcon />}>
                    Editar Activo
                </Button>
            </div>

            <Card>
                <CardHeader className="gap-3">
                    {asset.image_url ? (
                        <HeroUIImage src={asset.image_url} alt={asset.product_name || "Imagen del activo"} width={80} height={80} className="rounded-md object-cover" />
                    ) : (
                        <Avatar name={(asset.product_name || "A").charAt(0)} className="w-20 h-20 text-3xl" />
                    )}
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold">{asset.product_name}</h1>
                        <p className="text-sm text-default-500">
                            ID: {asset.id} | Inventario: {asset.inventory_code}
                            {asset.serial_number && ` | S/N: ${asset.serial_number}`}
                        </p>
                    </div>
                    <Chip color={statusColorMap[asset.status!] || "default"} variant="flat" className="ml-auto self-start">{asset.status?.replace(/_/g, " ") || "Desconocido"}</Chip>
                </CardHeader>
                <Divider />
                <CardBody>
                    <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                        <DetailItem label="Descripción" value={asset.description} />
                        <DetailItem label="Sección Actual" value={asset.current_section_name} />
                        <DetailItem label="Ubicación Actual" value={asset.current_location_name} />
                        <DetailItem label="Proveedor" value={asset.supplier_company_name} />
                        <DetailItem label="Fecha de Compra" value={formatDate(asset.purchase_date)} />
                        <DetailItem label="Nº Factura Compra" value={asset.invoice_number} />
                        <DetailItem label="Vencimiento Garantía" value={formatDate(asset.warranty_expiry_date)} />
                        <DetailItem label="Procedimiento de Adquisición" value={asset.acquisition_procedure} />
                        <DetailItem label="Creado el" value={formatDate(asset.created_at, true)} />
                        <DetailItem label="Última Actualización" value={formatDate(asset.updated_at, true)} />
                    </dl>
                </CardBody>
            </Card>

            {currentUserAssignment && (
                <Card>
                    <CardHeader><h2 className="text-xl font-semibold">Persona Asignada Actualmente</h2></CardHeader>
                    <Divider />
                    <CardBody className="flex flex-row items-center gap-4">
                        <Avatar name={currentUserAssignment.user_name.charAt(0) || 'U'} className="w-16 h-16 text-xl" />
                        <div>
                            <p className="font-semibold">{currentUserAssignment.user_name}</p>
                            {currentUserAssignment.user_email && <p className="text-sm text-default-600">{currentUserAssignment.user_email}</p>}
                            {currentUserAssignment.user_section_name && <p className="text-sm text-default-500">Sección: {currentUserAssignment.user_section_name}</p>}
                            <p className="text-xs text-default-500">Asignado el: {formatDate(currentUserAssignment.assignment_date)}</p>
                        </div>
                    </CardBody>
                </Card>
            )}

            <Card>
                <CardHeader><h2 className="text-xl font-semibold">Software Vinculado ({assignedSoftware.length})</h2></CardHeader>
                <Divider />
                <CardBody>
                    {assignedSoftware.length > 0 ? (
                        <Table aria-label="Software vinculado al activo" removeWrapper>
                            <TableHeader columns={softwareColumns}>
                                {(column) => <TableColumn key={column.uid}>{column.name}</TableColumn>}
                            </TableHeader>
                            <TableBody items={assignedSoftware} emptyContent="No hay software vinculado.">
                                {(item: AssetSoftwareLicenseInfo) => (
                                    <TableRow key={item.software_license_id}>
                                        {(columnKey) => {
                                            if (columnKey === "actions") {
                                                return <TableCell>
                                                    <Button as={HeroUILink} href={`/dashboard/softwareLicenses/${item.software_license_id}`} isIconOnly variant="light" size="sm">
                                                        <EyeIcon className="text-lg" />
                                                    </Button>
                                                </TableCell>;
                                            }
                                            if (columnKey === "expiry_date") {
                                                return <TableCell>{formatDate(item.expiry_date) || "Perpetua"}</TableCell>;
                                            }
                                            return <TableCell>{String(item[columnKey as keyof AssetSoftwareLicenseInfo] ?? "N/A")}</TableCell>;
                                        }}
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    ) : <p className="text-default-500">No hay licencias de software directamente asignadas a este activo.</p>}
                </CardBody>
            </Card>

            {/* Sección de Documentos Asociados */}
            <Card>
                <CardHeader className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Documentos Asociados ({assetDocuments.length})</h2>
                    <Button
                        size="sm"
                        color="primary"
                        variant="ghost"
                        startContent={<CloudUploadOutlinedIcon/>}
                        onPress={() => setShowUploadForm(!showUploadForm)}
                    >
                        {showUploadForm ? "Cancelar Subida" : "Adjuntar Documento"}
                    </Button>
                </CardHeader>
                <Divider />
                <CardBody>
                    {showUploadForm && (
                        <form onSubmit={handleDocumentUpload} className="space-y-4 p-4 mb-6 border border-dashed border-default-300 rounded-md">
                            <h3 className="text-md font-medium">Nuevo Documento</h3>
                            <Input
                                type="file"
                                label="Seleccionar archivo"
                                onChange={handleFileChange}
                                variant="bordered"
                                isRequired
                                isDisabled={isUploadingDocument}
                                accept=".pdf,.jpg,.jpeg,.png,.webp" // Tipos de archivo permitidos
                            />
                            <Select
                                label="Categoría del Documento"
                                placeholder="Seleccionar categoría"
                                selectedKeys={documentCategory ? [documentCategory] : []}
                                onSelectionChange={(keys) => setDocumentCategory(Array.from(keys as Set<string>)[0])}
                                variant="bordered"
                                isRequired
                                isDisabled={isUploadingDocument}
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
                                isDisabled={isUploadingDocument}
                            />
                            <Button type="submit" color="success" isLoading={isUploadingDocument} isDisabled={!fileToUpload || isUploadingDocument}>
                                {isUploadingDocument ? "Subiendo..." : "Confirmar y Subir Documento"}
                            </Button>
                        </form>
                    )}

                    {isLoadingDocuments && <div className="flex justify-center p-4"><Spinner label="Cargando documentos..." /></div>}
                    {!isLoadingDocuments && assetDocuments.length > 0 ? (
                        <Table aria-label="Documentos asociados al activo" removeWrapper>
                            <TableHeader columns={documentTableColumns}>
                                {(column) => <TableColumn key={column.uid}>{column.name}</TableColumn>}
                            </TableHeader>
                            <TableBody items={assetDocuments} emptyContent="No hay documentos adjuntos a este activo.">
                                {(item: AssetDocumentInfo) => (
                                    <TableRow key={item.id}>
                                        {(columnKey) => {
                                            if (columnKey === "icon") {
                                                return <TableCell className="text-xl">{getFileIcon(item.mime_type)}</TableCell>;
                                            }
                                            if (columnKey === "actions") {
                                                return (
                                                    <TableCell>
                                                        <Button
                                                            as="a" // Cambiado a "a" para que funcione como enlace
                                                            href={`/api/documents/${item.id}`} // Enlace directo al endpoint de descarga
                                                            target="_blank" // Opcional: abrir en nueva pestaña
                                                            isIconOnly
                                                            variant="light"
                                                            size="sm"
                                                            aria-label="Descargar documento"
                                                        >
                                                            <DownloadIcon className="text-lg text-primary-500" />
                                                        </Button>
                                                    </TableCell>
                                                );
                                            }
                                            if (columnKey === "created_at") {
                                                return <TableCell>{formatDate(item.created_at, true)}</TableCell>;
                                            }
                                            if (columnKey === "document_category") {
                                                const category = documentCategories.find(c => c.key === item.document_category);
                                                return <TableCell>{category ? category.label : item.document_category || "N/A"}</TableCell>;
                                            }
                                            return <TableCell>{String(item[columnKey as keyof AssetDocumentInfo] ?? "N/A")}</TableCell>;
                                        }}
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    ) : (
                        !isLoadingDocuments && <p className="text-default-500">No hay documentos adjuntos a este activo.</p>
                    )}
                </CardBody>
            </Card>


            <Card>
                <CardHeader><h2 className="text-xl font-semibold">Historial de Movimientos</h2></CardHeader>
                <Divider />
                <CardBody>
                    <AssetMovementsHistoryList assetId={assetId} assetName={asset.product_name || undefined} />
                </CardBody>
            </Card>
        </div>
    );
}