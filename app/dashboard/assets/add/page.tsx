// app/dashboard/assets/add/page.tsx
"use client";
import React, { useState, FormEvent } from "react";
import {
    Card, CardHeader, CardBody, Button, Tabs, Tab, Input, Textarea,
    Spinner, Link as NextUILink
} from "@heroui/react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { createAssetSchema, createMultipleAssetsSchema } from "@/lib/schema"; // Ajusta la ruta
import type { z } from "zod";
import AssetForm from "./assetForm"; // El formulario que creamos
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";

export default function AddAssetsPage() {
    const router = useRouter();
    const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);
    const [isSubmittingMultiple, setIsSubmittingMultiple] = useState(false);
    const [isSubmittingCsv, setIsSubmittingCsv] = useState(false);

    // Estado para el formulario de múltiples activos
    const [multipleAssetSerials, setMultipleAssetSerials] = useState("");

    // Estado para el archivo CSV
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvImportResults, setCsvImportResults] = useState<any>(null);


    const handleSingleAssetSubmit = async (data: z.infer<typeof createAssetSchema>) => {
        setIsSubmittingSingle(true);
        const toastId = toast.loading("Agregando activo único...");
        try {
            const response = await fetch('/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Error al agregar el activo.');
            }
            toast.success(`Activo '${result.assets[0]?.product_name}' agregado con ID: ${result.assets[0]?.id}.`, { id: toastId, duration: 5000 });
            // Podrías resetear el formulario aquí si AssetForm no lo hace.
            // O redirigir: router.push('/dashboard/assets');
        } catch (error: any) {
            toast.error(error.message || 'No se pudo agregar el activo.', { id: toastId });
            console.error("Error submitting single asset:", error);
        } finally {
            setIsSubmittingSingle(false);
        }
    };

    const handleMultipleAssetsSubmit = async (commonData: Omit<z.infer<typeof createAssetSchema>, 'serial_number'>) => {
        setIsSubmittingMultiple(true);
        const toastId = toast.loading("Agregando activos en lote...");

        const serials = multipleAssetSerials.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
        if (serials.length === 0) {
            toast.error("Por favor, ingrese al menos un número de serie para el lote.", { id: toastId });
            setIsSubmittingMultiple(false);
            return;
        }

        const validation = createMultipleAssetsSchema.safeParse({ commonData, serial_numbers: serials });
        if (!validation.success) {
            toast.error("Error en los datos comunes o seriales: " + validation.error.flatten().formErrors.join(", "), { id: toastId, duration: 6000 });
            console.error("Zod errors for multiple assets:", validation.error.flatten());
            setIsSubmittingMultiple(false);
            return;
        }

        const assetsToCreate = validation.data.serial_numbers.map(serial_number => ({
            ...validation.data.commonData,
            serial_number,
        }));

        try {
            const response = await fetch('/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assetsToCreate), // Enviar array de activos
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Error al agregar el lote de activos.');
            }
            toast.success(`${result.assets?.length || 0} activos agregados en lote.`, { id: toastId, duration: 5000 });
            setMultipleAssetSerials(""); // Limpiar textarea
            // Podrías resetear el formulario de datos comunes aquí.
        } catch (error: any) {
            toast.error(error.message || 'No se pudo agregar el lote de activos.', { id: toastId });
            console.error("Error submitting multiple assets:", error);
        } finally {
            setIsSubmittingMultiple(false);
        }
    };

    const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type === "text/csv") {
                setCsvFile(file);
                setCsvImportResults(null); // Limpiar resultados anteriores
            } else {
                toast.error("Por favor, seleccione un archivo CSV (.csv).");
                event.target.value = ""; // Resetear el input
                setCsvFile(null);
            }
        }
    };

    const handleCsvImport = async () => {
        if (!csvFile) {
            toast.error("Por favor, seleccione un archivo CSV para importar.");
            return;
        }
        setIsSubmittingCsv(true);
        setCsvImportResults(null);
        const toastId = toast.loading("Importando activos desde CSV...");

        const formData = new FormData();
        formData.append("csvFile", csvFile);

        try {
            const response = await fetch('/api/assets/import-csv', {
                method: 'POST',
                body: formData, // No establecer Content-Type manualmente, el navegador lo hace por FormData
            });
            const result = await response.json();

            if (!response.ok && response.status !== 207) { // 207 es Multi-Status para importaciones parciales
                throw new Error(result.message || `Error al importar CSV (HTTP ${response.status})`);
            }

            setCsvImportResults(result);

            if (result.successCount > 0 && result.errorCount === 0) {
                toast.success(`Importación exitosa: ${result.successCount} activos creados.`, { id: toastId, duration: 7000 });
            } else if (result.successCount > 0 && result.errorCount > 0) {
                toast.warning(`Importación parcial: ${result.successCount} creados, ${result.errorCount} errores. Revisa los detalles.`, { id: toastId, duration: 10000 });
            } else if (result.errorCount > 0 && result.successCount === 0) {
                toast.error(`Importación fallida: ${result.errorCount} errores. Revisa los detalles.`, { id: toastId, duration: 10000 });
            } else {
                toast.info("El archivo CSV fue procesado, pero no se crearon activos o no hubo errores reportados.", { id: toastId, duration: 7000 });
            }
            setCsvFile(null); // Limpiar selección
            // Refrescar lista de activos si es necesario: router.refresh();

        } catch (error: any) {
            toast.error(error.message || "Error crítico durante la importación del CSV.", { id: toastId });
            console.error("Error importing CSV:", error);
        } finally {
            setIsSubmittingCsv(false);
        }
    };


    return (
        <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
                <Button as={NextUILink} href="/dashboard/assets" variant="light" startContent={<ArrowLeftIcon className="mr-1" />}>
                    Volver a Lista de Activos
                </Button>
            </div>

            <Card className="shadow-xl">
                <CardHeader>
                    <h1 className="text-2xl font-bold text-foreground">Agregar Nuevos Activos</h1>
                </CardHeader>
                <CardBody>
                    <Tabs aria-label="Opciones para agregar activos" color="primary" variant="underlined">
                        <Tab key="single" title="Activo Único">
                            <Card className="mt-4">
                                <CardBody>
                                    <AssetForm
                                        onFormSubmit={handleSingleAssetSubmit}
                                        isSubmitting={isSubmittingSingle}
                                        submitButtonText="Agregar Activo Único"
                                    />
                                </CardBody>
                            </Card>
                        </Tab>
                        <Tab key="multiple" title="Lote de Activos (por S/N)">
                            <Card className="mt-4">
                                <CardBody>
                                    <p className="text-sm text-default-600 mb-4">
                                        Ingrese los datos comunes para el lote de activos. Luego, añada los números de serie, uno por línea o separados por coma.
                                        El código de inventario debe ser único para cada activo del lote; si lo dejas en blanco en el formulario de datos comunes,
                                        se generará uno automáticamente para cada activo. Si ingresas un código de inventario, se le añadirá un sufijo para cada serial.
                                    </p>
                                    <AssetForm
                                        onFormSubmit={async (commonData) => {
                                            // El AssetForm nos da los datos comunes validados (sin S/N)
                                            // Pasamos estos datos comunes a handleMultipleAssetsSubmit
                                            await handleMultipleAssetsSubmit(commonData);
                                        }}
                                        isSubmitting={isSubmittingMultiple}
                                        submitButtonText="Agregar Lote de Activos"
                                        showFields={['product_name', 'inventory_code', 'description', 'current_section_id', 'current_location_id', 'supplier_company_id', 'purchase_date_value', 'invoice_number', 'warranty_expiry_date_value', 'acquisition_procedure', 'status', 'image_url' /* No serial_number aquí */]}
                                    />
                                    <Textarea
                                        label="Números de Serie (uno por línea o separados por coma)"
                                        placeholder="S/N001&#10;S/N002, S/N003&#10;S/N004"
                                        value={multipleAssetSerials}
                                        onValueChange={setMultipleAssetSerials}
                                        variant="bordered"
                                        minRows={3}
                                        className="mt-4"
                                        isDisabled={isSubmittingMultiple}
                                    />
                                </CardBody>
                            </Card>
                        </Tab>
                        <Tab key="csv" title="Importar desde CSV">
                            <Card className="mt-4">
                                <CardBody className="space-y-4">
                                    <div>
                                        <h3 className="text-lg font-medium mb-2">Instrucciones para el archivo CSV:</h3>
                                        <ul className="list-disc list-inside text-sm text-default-600 space-y-1">
                                            <li>El archivo debe estar en formato CSV (delimitado por comas).</li>
                                            <li>La primera fila debe ser el encabezado con los nombres de las columnas.</li>
                                            <li>Columnas esperadas (sensible a mayúsculas/minúsculas y espacios en encabezados después de limpiar):
                                                <code className="block whitespace-pre-wrap bg-default-100 p-2 rounded-md text-xs mt-1">
                                                    product_name,serial_number,inventory_code,description,current_section_name,current_location_name,supplier_company_tax_id,purchase_date,invoice_number,warranty_expiry_date,acquisition_procedure,status,image_url
                                                </code>
                                            </li>
                                            <li>Campos obligatorios en CSV: `product_name`, `inventory_code`, `current_section_name`, `status`.</li>
                                            <li>Formatos de fecha: `YYYY-MM-DD`.</li>
                                            <li>Valores para `status`: `in_use`, `in_storage`, `under_repair`, `disposed`, `lost`.</li>
                                            <li>Para `current_section_name`, `current_location_name` (opcional, pero si se usa, debe existir en la sección padre), y `supplier_company_tax_id` (opcional), asegúrate que los nombres/RUTs coincidan exactamente con los registrados en el sistema.</li>
                                        </ul>
                                    </div>
                                    <Input
                                        type="file"
                                        label="Archivo CSV"
                                        accept=".csv"
                                        onChange={handleCsvFileChange}
                                        variant="bordered"
                                        isDisabled={isSubmittingCsv}
                                    />
                                    <Button color="secondary" onPress={handleCsvImport} isLoading={isSubmittingCsv} isDisabled={!csvFile || isSubmittingCsv}>
                                        {isSubmittingCsv ? "Importando..." : "Importar Activos desde CSV"}
                                    </Button>

                                    {csvImportResults && (
                                        <div className="mt-4 p-3 border border-default-200 rounded-md">
                                            <h4 className="font-semibold">Resultados de la Importación:</h4>
                                            <p className="text-sm">Activos Creados: {csvImportResults.successCount}</p>
                                            <p className="text-sm">Filas con Errores: {csvImportResults.errorCount}</p>
                                            {csvImportResults.errors && csvImportResults.errors.length > 0 && (
                                                <div className="mt-2 max-h-60 overflow-y-auto">
                                                    <p className="text-xs font-medium text-danger-600">Detalles de errores:</p>
                                                    <ul className="list-disc list-inside text-xs">
                                                        {csvImportResults.errors.map((err: any, index: number) => (
                                                            <li key={index} className="mt-1">
                                                                Fila {err.row}: {Array.isArray(err.messages) ? err.messages.join("; ") : String(err.messages)}
                                                                {/* <pre className="text-xs bg-default-100 p-1 rounded mt-0.5 overflow-x-auto">
                                  Data: {JSON.stringify(err.data)}
                                </pre> */}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </Tab>
                    </Tabs>
                </CardBody>
            </Card>
        </div>
    );
}