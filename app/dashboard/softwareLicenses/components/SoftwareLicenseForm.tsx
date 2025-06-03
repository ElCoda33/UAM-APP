// app/dashboard/softwareLicenses/components/SoftwareLicenseForm.tsx
"use client";

import React, { useEffect, useState, FormEvent, Key } from "react";
import {
    Input, Button, Select, SelectItem, Textarea, DatePicker,
    Spinner, Autocomplete, AutocompleteItem, Card, CardBody, CardHeader, Divider
} from "@heroui/react";
import { toast } from "react-hot-toast";
import {
    createSoftwareLicenseSchema, softwareLicenseTypeEnum,
    type softwareLicenseSchemaBase as SoftwareLicenseZodSchema // Para tipado
} from "@/lib/schema"; //
import { DateValue, parseDate, CalendarDate } from "@internationalized/date";
import type { z } from "zod";

// Tipos para datos de dropdowns/autocompletes
interface AssetOption { id: number; name: string; }
interface CompanyOption { id: number; name: string; }
interface UserOption { id: number; name: string; }

// Tipo para el estado del formulario, manejando DateValue para DatePickers
type SoftwareLicenseFormData = Omit<z.infer<typeof SoftwareLicenseZodSchema>, 'purchase_date' | 'expiry_date'> & {
    purchase_date_value: DateValue | null;
    expiry_date_value: DateValue | null;
};

// Opciones para el Select de tipo de licencia
const licenseTypeOptions = softwareLicenseTypeEnum.options.map(option => ({
    key: option,
    label: option.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') // Formatear para display
}));

interface SoftwareLicenseFormProps {
    initialData?: Partial<SoftwareLicenseFormData>;
    isEditMode: boolean;
    licenseId?: number; // Para modo edición
    onSubmitSuccess: (data: any) // Debería ser SoftwareLicenseAPIRecord cuando la tengas
        => void;
    onCancel: () => void;
}

// Helper para convertir YYYY-MM-DD string a DateValue
const stringToDateValue = (dateString: string | null | undefined): DateValue | null => {
    if (!dateString) return null;
    try {
        const [year, month, day] = dateString.split('-').map(Number);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            return new CalendarDate(year, month, day);
        }
        // Fallback por si el formato es diferente, aunque nuestra API devuelve YYYY-MM-DD
        return parseDate(dateString);
    } catch (e) {
        console.warn("Error parsing date string for DatePicker:", dateString, e);
        return null;
    }
};

// Helper para convertir DateValue a YYYY-MM-DD string
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
    const defaultFormData: SoftwareLicenseFormData = {
        asset_id: null,
        software_name: "",
        software_version: null,
        license_key: null,
        license_type: 'other', // Valor por defecto del enum
        seats: 1,
        purchase_date_value: null,
        purchase_cost: null,
        expiry_date_value: null,
        supplier_company_id: null,
        invoice_number: null,
        assigned_to_user_id: null,
        notes: null,
        ...(initialData && { // Sobrescribir con initialData si existe
            ...initialData,
            // Asegurar que las fechas de initialData (que serían string) se conviertan a DateValue
            purchase_date_value: stringToDateValue(initialData.purchase_date_value as unknown as string || undefined),
            expiry_date_value: stringToDateValue(initialData.expiry_date_value as unknown as string || undefined),
        }),
    };

    const [formData, setFormData] = useState<SoftwareLicenseFormData>(defaultFormData);
    const [assets, setAssets] = useState<AssetOption[]>([]);
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof SoftwareLicenseFormData, string>>>({});

    useEffect(() => {
        // Si initialData cambia (ej. al cargar datos para edición), actualizar el formulario
        if (initialData) {
            setFormData({
                asset_id: initialData.asset_id ?? null,
                software_name: initialData.software_name || "",
                software_version: initialData.software_version ?? null,
                license_key: initialData.license_key ?? null,
                license_type: initialData.license_type || 'other',
                seats: initialData.seats || 1,
                purchase_date_value: stringToDateValue(initialData.purchase_date_value as unknown as string),
                purchase_cost: initialData.purchase_cost ?? null,
                expiry_date_value: stringToDateValue(initialData.expiry_date_value as unknown as string),
                supplier_company_id: initialData.supplier_company_id ?? null,
                invoice_number: initialData.invoice_number ?? null,
                assigned_to_user_id: initialData.assigned_to_user_id ?? null,
                notes: initialData.notes ?? null,
            });
        }
    }, [initialData]);

    useEffect(() => {
        const fetchDropdownData = async () => {
            setIsLoadingDropdowns(true);
            try {
                const [assetsRes, companiesRes, usersRes] = await Promise.all([
                    fetch('/api/assets'),      // Asume que este endpoint existe y devuelve {id, product_name}
                    fetch('/api/companies'),   // Asume que este endpoint existe y devuelve {id, legal_name, trade_name}
                    fetch('/api/users')        // Asume que este endpoint existe y devuelve {id, first_name, last_name}
                ]);

                if (!assetsRes.ok) throw new Error('Error al cargar activos');
                const assetsData = await assetsRes.json();
                setAssets(assetsData.map((a: any) => ({ id: a.id, name: a.product_name || `ID: ${a.id}` })));

                if (!companiesRes.ok) throw new Error('Error al cargar empresas');
                const companiesData = await companiesRes.json();
                setCompanies(companiesData.map((c: any) => ({ id: c.id, name: c.legal_name || c.trade_name || `ID: ${c.id}` })));

                if (!usersRes.ok) throw new Error('Error al cargar usuarios');
                const usersData = await usersRes.json();
                setUsers(usersData.map((u: any) => ({ id: u.id, name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || `ID: ${u.id}` })));

            } catch (error: any) {
                toast.error(error.message || "No se pudieron cargar las opciones para los selectores.");
                console.error("Error fetching dropdown data for license form:", error);
            } finally {
                setIsLoadingDropdowns(false);
            }
        };
        fetchDropdownData();
    }, []);

    const clearError = (fieldName: keyof SoftwareLicenseFormData) => {
        if (errors && errors[fieldName]) {
            setErrors(prev => ({ ...prev, [fieldName]: undefined }));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        clearError(name as keyof SoftwareLicenseFormData);
    };

    const handleSelectChange = (fieldName: keyof SoftwareLicenseFormData, selectedKey: Key | null) => {
        let val: string | number | null = null;
        if (selectedKey !== null) {
            if (fieldName === 'license_type') {
                val = String(selectedKey);
            } else { // asset_id, supplier_company_id, assigned_to_user_id
                val = Number(selectedKey);
            }
        }
        setFormData(prev => ({ ...prev, [fieldName]: val as any }));
        clearError(fieldName);
    };

    const handleDateChange = (fieldName: 'purchase_date_value' | 'expiry_date_value', date: DateValue | null) => {
        setFormData(prev => ({ ...prev, [fieldName]: date }));
        clearError(fieldName);
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const dataToValidate = {
            ...formData,
            purchase_date: dateValueToString(formData.purchase_date_value),
            expiry_date: dateValueToString(formData.expiry_date_value),
            // Asegurar que los campos numéricos opcionales sean undefined si son null para la validación de Zod
            asset_id: formData.asset_id === null ? undefined : formData.asset_id,
            software_version: formData.software_version === null ? undefined : formData.software_version,
            license_key: formData.license_key === null ? undefined : formData.license_key,
            purchase_cost: formData.purchase_cost === null ? undefined : formData.purchase_cost,
            supplier_company_id: formData.supplier_company_id === null ? undefined : formData.supplier_company_id,
            invoice_number: formData.invoice_number === null ? undefined : formData.invoice_number,
            assigned_to_user_id: formData.assigned_to_user_id === null ? undefined : formData.assigned_to_user_id,
            notes: formData.notes === null ? undefined : formData.notes,
        };
        delete (dataToValidate as any).purchase_date_value;
        delete (dataToValidate as any).expiry_date_value;


        // Usaremos createSoftwareLicenseSchema tanto para crear como para editar,
        // ya que el PUT en la API puede manejar campos parciales o el schema de Zod `update` lo hará.
        // Para el cliente, es más simple validar contra el schema completo y enviar solo lo cambiado
        // o dejar que la API maneje qué campos actualizar. Por ahora validaremos contra el schema de creación/base.
        const validationResult = createSoftwareLicenseSchema.safeParse(dataToValidate);

        if (!validationResult.success) {
            const flatErrors: Partial<Record<keyof SoftwareLicenseFormData, string>> = {};
            validationResult.error.errors.forEach(err => {
                if (err.path.length > 0) {
                    flatErrors[err.path[0] as keyof SoftwareLicenseFormData] = err.message;
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
                body: JSON.stringify(validationResult.data), // Enviar datos validados
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Error al ${isEditMode ? 'actualizar' : 'crear'} la licencia.`);
            }
            toast.success(`Licencia ${isEditMode ? 'actualizada' : 'creada'} correctamente!`);
            onSubmitSuccess(result.license || result); // La API de POST devuelve {license: ...}
        } catch (error: any) {
            toast.error(error.message || `No se pudo ${isEditMode ? 'actualizar' : 'crear'} la licencia.`);
            console.error("Error submitting software license form:", error);
            if (error.field && error.message) { // Para errores de unicidad desde la API
                setErrors(prev => ({ ...prev, [error.field]: error.message }));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingDropdowns) {
        return (
            <div className="flex justify-center items-center p-8">
                <Spinner label="Cargando opciones del formulario..." color="primary" />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Autocomplete
                label="Activo Vinculado (Opcional)"
                placeholder="Buscar activo..."
                items={assets}
                selectedKey={formData.asset_id ? String(formData.asset_id) : null}
                onSelectionChange={(key) => handleSelectChange('asset_id', key)}
                variant="bordered"
                isDisabled={isSubmitting || isLoadingDropdowns}
                isLoading={isLoadingDropdowns}
                isInvalid={!!errors.asset_id}
                errorMessage={errors.asset_id}
                allowsCustomValue={false}
                onClear={() => handleSelectChange('asset_id', null)}
                name="asset_id"
            >
                {(item) => <AutocompleteItem key={item.id} textValue={item.name}>{item.name}</AutocompleteItem>}
            </Autocomplete>

            <Input
                name="software_name"
                label="Nombre del Software"
                value={formData.software_name}
                onChange={handleChange}
                variant="bordered"
                isRequired
                isDisabled={isSubmitting}
                isInvalid={!!errors.software_name}
                errorMessage={errors.software_name}
            />
            <Input
                name="software_version"
                label="Versión del Software (Opcional)"
                value={formData.software_version || ""}
                onChange={handleChange}
                variant="bordered"
                isDisabled={isSubmitting}
                isInvalid={!!errors.software_version}
                errorMessage={errors.software_version}
            />
            <Input
                name="license_key"
                label="Clave de Licencia (Opcional)"
                value={formData.license_key || ""}
                onChange={handleChange}
                variant="bordered"
                isDisabled={isSubmitting}
                isInvalid={!!errors.license_key}
                errorMessage={errors.license_key}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                    name="license_type"
                    label="Tipo de Licencia"
                    placeholder="Seleccionar tipo"
                    selectedKeys={formData.license_type ? [formData.license_type] : []}
                    onSelectionChange={(keys) => handleSelectChange('license_type', Array.from(keys as Set<Key>)[0])}
                    variant="bordered"
                    isRequired
                    isDisabled={isSubmitting}
                    isInvalid={!!errors.license_type}
                    errorMessage={errors.license_type}
                >
                    {licenseTypeOptions.map((opt) => (<SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>))}
                </Select>
                <Input
                    name="seats"
                    type="number"
                    label="Puestos/Asientos"
                    value={String(formData.seats)}
                    onChange={handleChange}
                    variant="bordered"
                    isRequired
                    min="1"
                    isDisabled={isSubmitting}
                    isInvalid={!!errors.seats}
                    errorMessage={errors.seats}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DatePicker
                    name="purchase_date_value" // Nombre interno para el DatePicker
                    label="Fecha de Compra (Opcional)"
                    value={formData.purchase_date_value}
                    onChange={(date) => handleDateChange('purchase_date_value', date)}
                    variant="bordered"
                    granularity="day"
                    isDisabled={isSubmitting}
                    isInvalid={!!errors.purchase_date_value}
                    errorMessage={errors.purchase_date_value}
                    showMonthAndYearPickers
                />
                <DatePicker
                    name="expiry_date_value" // Nombre interno para el DatePicker
                    label="Fecha de Expiración (Opcional)"
                    value={formData.expiry_date_value}
                    onChange={(date) => handleDateChange('expiry_date_value', date)}
                    variant="bordered"
                    granularity="day"
                    isDisabled={isSubmitting}
                    isInvalid={!!errors.expiry_date_value}
                    errorMessage={errors.expiry_date_value}
                    showMonthAndYearPickers
                />
            </div>
             <Input
                name="purchase_cost"
                type="number"
                label="Costo de Compra (Opcional)"
                value={formData.purchase_cost === null || formData.purchase_cost === undefined ? "" : String(formData.purchase_cost)}
                onChange={handleChange}
                variant="bordered"
                min="0"
                step="0.01"
                isDisabled={isSubmitting}
                isInvalid={!!errors.purchase_cost}
                errorMessage={errors.purchase_cost}
                startContent={
                    <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">$</span>
                    </div>
                }
            />


            <Autocomplete
                label="Proveedor (Opcional)"
                placeholder="Buscar empresa proveedora..."
                items={companies}
                selectedKey={formData.supplier_company_id ? String(formData.supplier_company_id) : null}
                onSelectionChange={(key) => handleSelectChange('supplier_company_id', key)}
                variant="bordered"
                isDisabled={isSubmitting || isLoadingDropdowns}
                isLoading={isLoadingDropdowns}
                isInvalid={!!errors.supplier_company_id}
                errorMessage={errors.supplier_company_id}
                allowsCustomValue={false}
                onClear={() => handleSelectChange('supplier_company_id', null)}
                name="supplier_company_id"
            >
                {(item) => <AutocompleteItem key={item.id} textValue={item.name}>{item.name}</AutocompleteItem>}
            </Autocomplete>

            <Input
                name="invoice_number"
                label="Número de Factura (Opcional)"
                value={formData.invoice_number || ""}
                onChange={handleChange}
                variant="bordered"
                isDisabled={isSubmitting}
                isInvalid={!!errors.invoice_number}
                errorMessage={errors.invoice_number}
            />

            <Autocomplete
                label="Asignado a Usuario (Opcional)"
                placeholder="Buscar usuario..."
                items={users}
                selectedKey={formData.assigned_to_user_id ? String(formData.assigned_to_user_id) : null}
                onSelectionChange={(key) => handleSelectChange('assigned_to_user_id', key)}
                variant="bordered"
                isDisabled={isSubmitting || isLoadingDropdowns}
                isLoading={isLoadingDropdowns}
                isInvalid={!!errors.assigned_to_user_id}
                errorMessage={errors.assigned_to_user_id}
                allowsCustomValue={false}
                onClear={() => handleSelectChange('assigned_to_user_id', null)}
                name="assigned_to_user_id"
            >
                {(item) => <AutocompleteItem key={item.id} textValue={item.name}>{item.name}</AutocompleteItem>}
            </Autocomplete>

            <Textarea
                name="notes"
                label="Notas (Opcional)"
                value={formData.notes || ""}
                onChange={handleChange}
                variant="bordered"
                minRows={3}
                isDisabled={isSubmitting}
                isInvalid={!!errors.notes}
                errorMessage={errors.notes}
            />

            <div className="flex justify-end gap-3 pt-4">
                <Button variant="flat" onPress={onCancel} isDisabled={isSubmitting} type="button">
                    Cancelar
                </Button>
                <Button type="submit" color="primary" isLoading={isSubmitting} isDisabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : (isEditMode ? "Guardar Cambios" : "Crear Licencia")}
                </Button>
            </div>
        </form>
    );
}