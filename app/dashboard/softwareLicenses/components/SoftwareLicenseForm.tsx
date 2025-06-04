// app/dashboard/softwareLicenses/components/SoftwareLicenseForm.tsx
"use client";

import React, { useEffect, useState, FormEvent, Key } from "react";
import {
    Input, Button, Select, SelectItem, Textarea, DatePicker,
    Spinner, Card, CardBody, CardHeader, Divider, Chip // Añadido Chip
} from "@heroui/react";
import { toast } from "react-hot-toast";
import {
    createSoftwareLicenseSchema,
    updateSoftwareLicenseSchema,
    softwareLicenseTypeEnum,
} from "@/lib/schema";
import { DateValue, parseDate, CalendarDate } from "@internationalized/date";
import type { z } from "zod";
import type { SoftwareLicenseDetailAPIRecord } from "@/app/api/softwareLicenses/[id]/route"; // Para initialData
import { TrashIcon } from "@/components/icons/DeleteIcon"; // Asumiendo que tienes un TrashIcon

// Tipos para datos de dropdowns/autocompletes
interface AssetOption { id: number; name: string; inventory_code?: string | null; }
interface CompanyOption { id: number; name: string; }
interface UserOption { id: number; name: string; }

// Tipo para el estado del formulario
type SoftwareLicenseFormDataState = Omit<
    z.infer<typeof createSoftwareLicenseSchema>,
    'purchase_date' | 'expiry_date' | 'assign_to_asset_ids'
> & {
    purchase_date_value: DateValue | null;
    expiry_date_value: DateValue | null;
    selected_asset_ids_set: Set<string>;
};

const licenseTypeOptions = softwareLicenseTypeEnum.options.map(option => ({
    key: option,
    label: option.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}));

interface SoftwareLicenseFormProps {
    initialData?: Partial<SoftwareLicenseDetailAPIRecord>;
    isEditMode: boolean;
    licenseId?: number;
    onSubmitSuccess: (data: SoftwareLicenseDetailAPIRecord | z.infer<typeof createSoftwareLicenseSchema>) => void;
    onCancel: () => void;
}

const stringToDateValue = (dateString: string | null | undefined): DateValue | null => {
    if (!dateString) return null;
    try {
        const [year, month, day] = dateString.split('-').map(Number);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return new CalendarDate(year, month, day);
        }
        return parseDate(dateString);
    } catch (e) {
        console.warn("SoftwareLicenseForm: Error parsing date string:", dateString, e);
        return null;
    }
};

const dateValueToString = (dateValue: DateValue | null | undefined): string | null => {
    if (!dateValue) return null;
    return `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
};

export default function SoftwareLicenseForm({
    initialData,
    isEditMode,
    licenseId,
    onSubmitSuccess,
    onCancel,
}: SoftwareLicenseFormProps) {

    const prepareInitialFormData = (data?: Partial<SoftwareLicenseDetailAPIRecord>): SoftwareLicenseFormDataState => {
        const assignedAssetsSet = data?.assigned_assets
            ? new Set(data.assigned_assets.map(a => String(a.asset_id)))
            : new Set<string>();

        return {
            software_name: data?.software_name || "",
            software_version: data?.software_version || null,
            license_key: data?.license_key || null,
            license_type: data?.license_type as SoftwareLicenseFormDataState['license_type'] || 'other',
            seats: data?.seats || 1,
            purchase_date_value: stringToDateValue(data?.purchase_date),
            purchase_cost: data?.purchase_cost || null,
            expiry_date_value: stringToDateValue(data?.expiry_date),
            supplier_company_id: data?.supplier_company_id || null,
            invoice_number: data?.invoice_number || null,
            assigned_to_user_id: data?.assigned_to_user_id || null,
            notes: data?.notes || null,
            selected_asset_ids_set: assignedAssetsSet,
        };
    };

    const [formData, setFormData] = useState<SoftwareLicenseFormDataState>(prepareInitialFormData(initialData));
    const [allAssets, setAllAssets] = useState<AssetOption[]>([]); // Cambiado de 'assets' a 'allAssets' para claridad
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof SoftwareLicenseFormDataState | 'assign_to_asset_ids', string>>>({});

    // Nuevos estados para la búsqueda y selección de activos por ID
    const [assetIdInput, setAssetIdInput] = useState<string>("");
    const [foundAsset, setFoundAsset] = useState<AssetOption | null>(null);
    const [searchError, setSearchError] = useState<string>("");
    const [selectedAssetsDetails, setSelectedAssetsDetails] = useState<AssetOption[]>([]);

    useEffect(() => {
        if (initialData) {
            const preparedData = prepareInitialFormData(initialData);
            setFormData(preparedData);
            // Si hay initialData.assigned_assets y allAssets ya está cargado, popular selectedAssetsDetails
            if (initialData.assigned_assets && allAssets.length > 0) {
                const initialDetails = initialData.assigned_assets
                    .map(assigned => allAssets.find(a => a.id === assigned.asset_id))
                    .filter(Boolean) as AssetOption[];
                setSelectedAssetsDetails(initialDetails);
            }
        }
    }, [initialData, allAssets]); // Añadido allAssets como dependencia

    // Efecto para popular selectedAssetsDetails cuando selected_asset_ids_set cambia y allAssets está disponible
    // Esto es útil si selected_asset_ids_set se llena antes que allAssets
    useEffect(() => {
        if (formData.selected_asset_ids_set.size > 0 && allAssets.length > 0) {
            const details: AssetOption[] = [];
            formData.selected_asset_ids_set.forEach(idStr => {
                const asset = allAssets.find(a => String(a.id) === idStr);
                if (asset && !details.some(d => d.id === asset.id)) { // Evitar duplicados en el display
                    details.push(asset);
                }
            });
            setSelectedAssetsDetails(details);
        } else if (formData.selected_asset_ids_set.size === 0) {
            setSelectedAssetsDetails([]); // Limpiar si no hay IDs seleccionados
        }
    }, [formData.selected_asset_ids_set, allAssets]);


    useEffect(() => {
        const fetchDropdownData = async () => {
            setIsLoadingDropdowns(true);
            try {
                const [assetsRes, companiesRes, usersRes] = await Promise.all([
                    fetch('/api/assets'),
                    fetch('/api/companies'),
                    fetch('/api/users')
                ]);

                if (!assetsRes.ok) throw new Error('Error al cargar activos');
                const assetsData = await assetsRes.json();
                setAllAssets(assetsData.map((a: any) => ({
                    id: a.id,
                    name: `${a.product_name || 'Activo'} (Inv: ${a.inventory_code || 'S/C'}, ID: ${a.id})`,
                    inventory_code: a.inventory_code
                })));

                if (!companiesRes.ok) throw new Error('Error al cargar empresas');
                const companiesData = await companiesRes.json();
                setCompanies(companiesData.map((c: any) => ({ id: c.id, name: c.legal_name || c.trade_name || `ID: ${c.id}` })));

                if (!usersRes.ok) throw new Error('Error al cargar usuarios');
                const usersData = await usersRes.json();
                setUsers(usersData.map((u: any) => ({ id: u.id, name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || `ID: ${u.id}` })));

            } catch (error: any) {
                toast.error(error.message || "No se pudieron cargar las opciones para los selectores.");
            } finally {
                setIsLoadingDropdowns(false);
            }
        };
        fetchDropdownData();
    }, []);

    const clearError = (fieldName: keyof SoftwareLicenseFormDataState | 'assign_to_asset_ids') => {
        if (errors && errors[fieldName]) {
            setErrors(prev => ({ ...prev, [fieldName]: undefined }));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        clearError(name as keyof SoftwareLicenseFormDataState);
    };

    const handleGenericSelectChange = (fieldName: keyof SoftwareLicenseFormDataState, selectedKeys: Key | null) => {
        let val: string | number | null = null;
        if (selectedKeys !== null) {
            if (fieldName === 'license_type') {
                val = String(selectedKeys);
            } else {
                val = Number(selectedKeys);
            }
        }
        setFormData(prev => ({ ...prev, [fieldName]: val as any }));
        clearError(fieldName);
    };


    const handleDateChange = (fieldName: 'purchase_date_value' | 'expiry_date_value', date: DateValue | null) => {
        setFormData(prev => ({ ...prev, [fieldName]: date }));
        clearError(fieldName);
    };

    // Funciones para la nueva lógica de búsqueda y selección de activos
    const handleSearchAssetById = () => {
        setFoundAsset(null);
        setSearchError("");
        if (!assetIdInput.trim()) {
            setSearchError("Por favor, ingrese un ID de activo o código de inventario.");
            return;
        }
        // Permitir búsqueda por ID (numérico) o Código de Inventario (string)
        const searchTerm = assetIdInput.trim();
        const searchIdNum = parseInt(searchTerm, 10);

        const asset = allAssets.find(a =>
            a.id === searchIdNum ||
            (a.inventory_code && a.inventory_code.toLowerCase() === searchTerm.toLowerCase())
        );

        if (asset) {
            setFoundAsset(asset);
        } else {
            setSearchError(`Activo con ID/Inv. "${searchTerm}" no encontrado.`);
        }
    };

    const handleAddAssetToSelection = () => {
        if (foundAsset) {
            if (!formData.selected_asset_ids_set.has(String(foundAsset.id))) {
                const newSet = new Set(formData.selected_asset_ids_set).add(String(foundAsset.id));
                setFormData(prev => ({ ...prev, selected_asset_ids_set: newSet }));
                // setSelectedAssetsDetails se actualizará a través del useEffect que depende de formData.selected_asset_ids_set y allAssets
                setAssetIdInput("");
                setFoundAsset(null);
                setSearchError("");
            } else {
                setSearchError(`El activo "${foundAsset.name}" ya está seleccionado.`);
                toast.warn(`El activo "${foundAsset.name}" ya está seleccionado.`);
            }
        }
    };

    const handleRemoveAssetFromSelection = (assetIdToRemove: number) => {
        const newSet = new Set(formData.selected_asset_ids_set);
        newSet.delete(String(assetIdToRemove));
        setFormData(prev => ({ ...prev, selected_asset_ids_set: newSet }));
        // setSelectedAssetsDetails se actualizará a través del useEffect
    };


    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const dataForZod = {
            ...formData,
            purchase_date: dateValueToString(formData.purchase_date_value),
            expiry_date: dateValueToString(formData.expiry_date_value),
            assign_to_asset_ids: Array.from(formData.selected_asset_ids_set).map(idStr => Number(idStr)),
        };
        delete (dataForZod as any).purchase_date_value;
        delete (dataForZod as any).expiry_date_value;
        delete (dataForZod as any).selected_asset_ids_set;

        const schemaToUse = isEditMode ? updateSoftwareLicenseSchema : createSoftwareLicenseSchema;
        const validationResult = schemaToUse.safeParse(dataForZod);

        if (!validationResult.success) {
            const flatErrors: Partial<Record<keyof SoftwareLicenseFormDataState | 'assign_to_asset_ids', string>> = {};
            validationResult.error.errors.forEach(err => {
                const path = err.path[0] as keyof SoftwareLicenseFormDataState | 'assign_to_asset_ids';
                if (path) {
                    flatErrors[path] = err.message;
                }
            });
            setErrors(flatErrors);
            toast.error("Por favor, corrige los errores en el formulario.");
            setIsSubmitting(false);
            return;
        }

        const apiPath = isEditMode ? `/api/softwareLicenses/${licenseId}` : '/api/softwareLicenses';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(apiPath, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validationResult.data),
            });
            const result = await response.json();

            if (!response.ok) {
                let errorMessage = result.message || `Error al ${isEditMode ? 'actualizar' : 'crear'} la licencia.`;
                if (result.field) {
                    setErrors(prev => ({ ...prev, [result.field]: result.message }));
                }
                throw new Error(errorMessage);
            }
            toast.success(`Licencia ${isEditMode ? 'actualizada' : 'creada'} correctamente!`);
            onSubmitSuccess(result.license || result);
        } catch (error: any) {
            toast.error(error.message || `No se pudo ${isEditMode ? 'actualizar' : 'crear'} la licencia.`);
            console.error("Error submitting software license form:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingDropdowns && !initialData) {
        return (
            <div className="flex justify-center items-center p-8">
                <Spinner label="Cargando opciones del formulario..." color="primary" />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Input name="software_name" label="Nombre del Software" value={formData.software_name} onChange={handleChange} variant="bordered" isRequired isDisabled={isSubmitting} isInvalid={!!errors.software_name} errorMessage={errors.software_name} />
            <Input name="software_version" label="Versión del Software (Opcional)" value={formData.software_version || ""} onChange={handleChange} variant="bordered" isDisabled={isSubmitting} isInvalid={!!errors.software_version} errorMessage={errors.software_version} />
            <Input name="license_key" label="Clave de Licencia (Opcional)" value={formData.license_key || ""} onChange={handleChange} variant="bordered" isDisabled={isSubmitting} isInvalid={!!errors.license_key} errorMessage={errors.license_key} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                    name="license_type" label="Tipo de Licencia" placeholder="Seleccionar tipo"
                    selectedKeys={formData.license_type ? [formData.license_type] : []}
                    onSelectionChange={(keys) => handleGenericSelectChange('license_type', Array.from(keys as Set<Key>)[0])}
                    variant="bordered" isRequired isDisabled={isSubmitting}
                    isInvalid={!!errors.license_type} errorMessage={errors.license_type}
                >
                    {licenseTypeOptions.map((opt) => (<SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>))}
                </Select>
                <Input
                    name="seats" type="number" label="Puestos/Asientos" value={String(formData.seats)}
                    onChange={handleChange} variant="bordered" isRequired min="1" isDisabled={isSubmitting}
                    isInvalid={!!errors.seats} errorMessage={errors.seats}
                />
            </div>

            {/* Nueva sección para buscar y asignar activos */}
            <Divider />
            <div className="space-y-4 p-4 border border-default-200 rounded-md">
                <h3 className="text-lg font-medium text-foreground-700">Asignar a Activos (Opcional)</h3>
                <div className="flex items-end gap-2">
                    <Input
                        label="Buscar Activo por ID o Cód. Inventario"
                        placeholder="Ej: 123 o INV00456"
                        value={assetIdInput}
                        onValueChange={setAssetIdInput}
                        variant="bordered"
                        isDisabled={isSubmitting || isLoadingDropdowns}
                        className="flex-grow"
                        isInvalid={!!searchError}
                        errorMessage={searchError}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchAssetById()}
                    />
                    <Button onPress={handleSearchAssetById} isDisabled={isSubmitting || isLoadingDropdowns || !assetIdInput.trim()}>Buscar</Button>
                </div>

                {foundAsset && (
                    <Card variant="flat" className="bg-primary-50 dark:bg-primary-900/30 p-3">
                        <CardBody>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{foundAsset.name}</p>
                                    <p className="text-xs text-default-600">
                                        ID: {foundAsset.id}
                                        {foundAsset.inventory_code && `, Inv: ${foundAsset.inventory_code}`}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    color="success"
                                    variant="flat"
                                    onPress={handleAddAssetToSelection}
                                    isDisabled={formData.selected_asset_ids_set.has(String(foundAsset.id))}
                                >
                                    {formData.selected_asset_ids_set.has(String(foundAsset.id)) ? "Agregado" : "Agregar a Licencia"}
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                )}

                {selectedAssetsDetails.length > 0 && (
                    <div className="space-y-2 mt-3">
                        <p className="text-sm font-medium text-default-700">Activos seleccionados ({selectedAssetsDetails.length}):</p>
                        <div className="flex flex-wrap gap-2">
                            {selectedAssetsDetails.map(asset => (
                                <Chip
                                    key={asset.id}
                                    onClose={() => handleRemoveAssetFromSelection(asset.id)}
                                    variant="flat"
                                    color="secondary"
                                >
                                    {asset.name}
                                </Chip>
                            ))}
                        </div>
                    </div>
                )}
                {!!errors.assign_to_asset_ids && (
                    <p className="text-tiny text-danger mt-1">{errors.assign_to_asset_ids}</p>
                )}
            </div>
            <Divider />


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DatePicker
                    name="purchase_date_value" label="Fecha de Compra (Opcional)"
                    value={formData.purchase_date_value} onChange={(date) => handleDateChange('purchase_date_value', date)}
                    variant="bordered" granularity="day" isDisabled={isSubmitting}
                    isInvalid={!!errors.purchase_date_value} errorMessage={errors.purchase_date_value as string | undefined}
                    showMonthAndYearPickers
                />
                <DatePicker
                    name="expiry_date_value" label="Fecha de Expiración (Opcional)"
                    value={formData.expiry_date_value} onChange={(date) => handleDateChange('expiry_date_value', date)}
                    variant="bordered" granularity="day" isDisabled={isSubmitting}
                    isInvalid={!!errors.expiry_date_value} errorMessage={errors.expiry_date_value as string | undefined}
                    showMonthAndYearPickers
                />
            </div>
            <Input
                name="purchase_cost" type="number" label="Costo de Compra (Opcional)"
                value={formData.purchase_cost === null || formData.purchase_cost === undefined ? "" : String(formData.purchase_cost)}
                onChange={handleChange} variant="bordered" min="0" step="0.01" isDisabled={isSubmitting}
                isInvalid={!!errors.purchase_cost} errorMessage={errors.purchase_cost}
                startContent={<div className="pointer-events-none flex items-center"><span className="text-default-400 text-small">$</span></div>}
            />
            <Select
                name="supplier_company_id" label="Proveedor (Opcional)" placeholder="Seleccionar proveedor..."
                items={companies}
                selectedKeys={formData.supplier_company_id ? [String(formData.supplier_company_id)] : []}
                onSelectionChange={(keys) => handleGenericSelectChange('supplier_company_id', Array.from(keys as Set<Key>)[0])}
                variant="bordered" isDisabled={isSubmitting || isLoadingDropdowns} isLoading={isLoadingDropdowns}
                isInvalid={!!errors.supplier_company_id} errorMessage={errors.supplier_company_id}
            >
                {(item) => <SelectItem key={item.id} textValue={item.name}>{item.name}</SelectItem>}
            </Select>
            <Input name="invoice_number" label="Número de Factura (Opcional)" value={formData.invoice_number || ""} onChange={handleChange} variant="bordered" isDisabled={isSubmitting} isInvalid={!!errors.invoice_number} errorMessage={errors.invoice_number} />
            <Select
                name="assigned_to_user_id" label="Propietario/Responsable de Licencia (Opcional)" placeholder="Seleccionar usuario..."
                items={users}
                selectedKeys={formData.assigned_to_user_id ? [String(formData.assigned_to_user_id)] : []}
                onSelectionChange={(keys) => handleGenericSelectChange('assigned_to_user_id', Array.from(keys as Set<Key>)[0])}
                variant="bordered" isDisabled={isSubmitting || isLoadingDropdowns} isLoading={isLoadingDropdowns}
                isInvalid={!!errors.assigned_to_user_id} errorMessage={errors.assigned_to_user_id}
            >
                {(item) => <SelectItem key={item.id} textValue={item.name}>{item.name}</SelectItem>}
            </Select>
            <Textarea name="notes" label="Notas (Opcional)" value={formData.notes || ""} onChange={handleChange} variant="bordered" minRows={3} isDisabled={isSubmitting} isInvalid={!!errors.notes} errorMessage={errors.notes} />

            <div className="flex justify-end gap-3 pt-4">
                <Button variant="flat" onPress={onCancel} isDisabled={isSubmitting} type="button">Cancelar</Button>
                <Button type="submit" color="primary" isLoading={isSubmitting} isDisabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : (isEditMode ? "Guardar Cambios" : "Crear Licencia")}
                </Button>
            </div>
        </form>
    );
}