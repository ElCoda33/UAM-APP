// app/dashboard/assets/add/AssetForm.tsx
"use client";

import React, { useEffect, useState, FormEvent, Key } from "react";
import {
    Input,
    Button,
    Select,
    SelectItem,
    Textarea,
    DatePicker,
    Spinner,
    Autocomplete,
    AutocompleteItem,
    Divider
} from "@heroui/react";
import { toast } from "react-hot-toast";
import { createAssetSchema } from "@/lib/schema";
import AssetImageUpload from "@/app/dashboard/assets/components/assetImageUpload";
import ITAssetFields from "@/app/dashboard/assets/components/ITAssetFields";
import { DateValue, parseDate, CalendarDate } from "@internationalized/date";
import type { z } from "zod";

// Interfaces para datos de los Selects
interface SelectOption { id: number; name: string; }
interface CompanyOption { id: number; name: string; } // 'name' será legal_name o trade_name

export const assetStatusOptions: Array<{ key: string; label: string }> = [
    { key: 'in_use', label: 'En Uso' },
    { key: 'in_storage', label: 'En Depósito' },
    { key: 'under_repair', label: 'En Reparación' },
    { key: 'disposed', label: 'Dado de Baja' },
    { key: 'lost', label: 'Perdido' },
];

export type AssetFormData = Omit<z.infer<typeof createAssetSchema>, 'purchase_date' | 'warranty_expiry_date' | 'current_section_id'> & {
    purchase_date_value: DateValue | null;
    warranty_expiry_date_value: DateValue | null;
    current_section_id: number | null; // Cambiado para permitir null inicialmente y manejar el tipo correctamente
};

interface AssetFormProps {
    onFormSubmit: (data: z.infer<typeof createAssetSchema>) => Promise<void>;
    initialData?: Partial<AssetFormData>;
    isSubmittingGlobal: boolean; // Renombrado para evitar confusión con un posible isSubmitting local
    submitButtonText?: string;
    // Campos a mostrar. Si es undefined, se muestran todos los campos de un activo único.
    // Útil para el formulario de lote, donde S/N se maneja por separado.
    showFields?: Array<keyof AssetFormData>;
}

const stringToDateValue = (dateString: string | null | undefined): DateValue | null => {
    if (!dateString || typeof dateString !== 'string') return null;
    try {
        // Intenta parsear como YYYY-MM-DD primero
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                return new CalendarDate(year, month, day);
            }
        }
        // Fallback a parseDate si el formato no es YYYY-MM-DD
        return parseDate(dateString);
    } catch (e) {
        console.warn("Error parsing date string for DatePicker:", dateString, e);
        return null;
    }
};

const dateValueToString = (dateValue: DateValue | null | undefined): string | null => {
    if (!dateValue) return null;
    try {
        return `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
    } catch (e) {
        console.warn("Error converting DateValue to string:", dateValue, e);
        return null;
    }
};

export default function AssetForm({
    onFormSubmit,
    initialData,
    isSubmittingGlobal,
    submitButtonText = "Guardar Activo",
    showFields,
}: AssetFormProps) {

    const defaultFormData: AssetFormData = {
        product_name: "",
        serial_number: null,
        inventory_code: "",
        description: null,
        current_section_id: null,
        current_location_id: null,
        supplier_company_id: null,
        purchase_date_value: null,
        invoice_number: null,
        warranty_expiry_date_value: null,
        acquisition_procedure: null,
        status: 'in_storage',
        asset_type: 'otro',
        it_device_type: null,
        ip_address: null,
        subnet_mask: null,
        image_url: null,
        ...(initialData && {
            ...initialData,
            purchase_date_value: stringToDateValue(initialData.purchase_date_value as unknown as string),
            warranty_expiry_date_value: stringToDateValue(initialData.warranty_expiry_date_value as unknown as string),
        }),
    };

    const [formData, setFormData] = useState<AssetFormData>(defaultFormData);
    const [sections, setSections] = useState<SelectOption[]>([]);
    const [locations, setLocations] = useState<SelectOption[]>([]);
    const [allLocations, setAllLocations] = useState<Array<SelectOption & { section_id: number | null }>>([]);
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof AssetFormData, string>>>({});

    // Network Connections State
    const [pendingConnections, setPendingConnections] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]); // For connection dropdown
    const [newConnection, setNewConnection] = useState({
        connected_to_asset_id: "",
        connection_type: "ethernet",
        port_number: "",
        notes: ""
    });

    useEffect(() => {
        const fetchDropdownData = async () => {
            setIsLoadingDropdowns(true);
            try {
                const [sectionsRes, locationsRes, companiesRes, assetsRes] = await Promise.all([
                    fetch('/api/sections'),
                    fetch('/api/locations'),
                    fetch('/api/companies'),
                    fetch('/api/assets')
                ]);

                if (!sectionsRes.ok || !locationsRes.ok || !companiesRes.ok || !assetsRes.ok) throw new Error("Error al cargar datos para selectores");

                const sectionsData = await sectionsRes.json();
                const locationsData = await locationsRes.json();
                const companiesData = await companiesRes.json();
                const assetsData = await assetsRes.json();

                setSections(sectionsData.map((s: any) => ({ id: s.id, name: s.name })));
                setAllLocations(locationsData.map((l: any) => ({ id: l.id, name: l.name, section_id: l.section_id })));
                setCompanies(companiesData.map((c: any) => ({ id: c.id, name: c.legal_name || c.trade_name || `ID: ${c.id}` })));
                // We only want IT assets for connections, usually. For now, let's filter purely for 'informatica' or maybe show all?
                // Let's show all but maybe filter in the UI or here. 'informatica' makes sense for switches etc. 
                // But you might connect a PC (informatica) to a Switch (also informatica).
                // Let's keep it simple and filter by 'informatica' as originally intended.
                setAssets(Array.isArray(assetsData) ? assetsData.filter((a: any) => a.asset_type === 'informatica') : []);

            } catch (error) {
                console.error("Error fetching dropdown data:", error);
                toast.error("No se pudieron cargar opciones para los campos.");
            } finally {
                setIsLoadingDropdowns(false);
            }
        };
        fetchDropdownData();
    }, []);

    useEffect(() => {
        if (formData.current_section_id && allLocations.length > 0) {
            const filtered = allLocations.filter(loc => loc.section_id === formData.current_section_id);
            setLocations(filtered);
            if (formData.current_location_id && !filtered.find(loc => loc.id === formData.current_location_id)) {
                setFormData(prev => ({ ...prev, current_location_id: null }));
            }
        } else if (!formData.current_section_id) {
            setLocations(allLocations); // No filtrar o mostrar todas si no hay sección
        }
    }, [formData.current_section_id, allLocations, formData.current_location_id]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name as keyof AssetFormData]) {
            setFormErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleSelectChange = (name: keyof AssetFormData, selectedKey: Key | null) => {
        const isStringField = name === 'status' || name === 'asset_type' || name === 'it_device_type';
        const value = selectedKey ? (isStringField ? selectedKey : Number(selectedKey)) : null;
        setFormData(prev => ({ ...prev, [name]: value as any }));
        if (name === 'current_section_id') {
            setFormData(prev => ({ ...prev, current_location_id: null }));
        }
        if (formErrors[name as keyof AssetFormData]) {
            setFormErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleDateChange = (name: 'purchase_date_value' | 'warranty_expiry_date_value', date: DateValue | null) => {
        setFormData(prev => ({ ...prev, [name]: date }));
        if (formErrors[name as keyof AssetFormData]) {
            setFormErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleAddConnection = () => {
        if (!newConnection.connected_to_asset_id) {
            toast.error("Seleccione un dispositivo para conectar");
            return;
        }
        setPendingConnections(prev => [...prev, { ...newConnection, connected_to_asset_id: Number(newConnection.connected_to_asset_id) }]);
        setNewConnection({
            connected_to_asset_id: "",
            connection_type: "ethernet",
            port_number: "",
            notes: ""
        });
        toast.success("Conexión agregada a la lista (pendiente de guardar)");
    };

    const handleRemoveConnection = (index: number) => {
        setPendingConnections(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setFormErrors({}); // Limpiar errores previos

        const payloadForValidation = {
            ...formData,
            current_section_id: formData.current_section_id === null ? undefined : Number(formData.current_section_id), // Zod espera number o undefined
            purchase_date: dateValueToString(formData.purchase_date_value),
            warranty_expiry_date: dateValueToString(formData.warranty_expiry_date_value),
            network_connections: pendingConnections // Add connections to payload
        };
        // Eliminar las claves _value que no existen en el schema de Zod
        delete (payloadForValidation as any).purchase_date_value;
        delete (payloadForValidation as any).warranty_expiry_date_value;


        const validation = createAssetSchema.safeParse(payloadForValidation);

        if (!validation.success) {
            const errors: Partial<Record<keyof AssetFormData, string>> = {};
            validation.error.errors.forEach(err => {
                if (err.path.length > 0) {
                    errors[err.path[0] as keyof AssetFormData] = err.message;
                }
            });
            setFormErrors(errors);
            toast.error("Por favor, corrige los errores en el formulario.");
            return;
        }

        await onFormSubmit(validation.data);
        // El reset del formulario o redirección lo maneja el componente padre
    };

    const isFieldVisible = (fieldName: keyof AssetFormData) => !showFields || showFields.includes(fieldName);

    if (isLoadingDropdowns) {
        return <div className="flex justify-center p-8"><Spinner label="Cargando opciones del formulario..." /></div>;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {isFieldVisible('product_name') && <Input name="product_name" label="Nombre del Producto/Activo" value={formData.product_name} onChange={handleChange} variant="bordered" isRequired isDisabled={isSubmittingGlobal} isInvalid={!!formErrors.product_name} errorMessage={formErrors.product_name} />}

            {isFieldVisible('serial_number') && <Input name="serial_number" label="Número de Serie (Opcional)" value={formData.serial_number || ""} onChange={handleChange} variant="bordered" isDisabled={isSubmittingGlobal} isInvalid={!!formErrors.serial_number} errorMessage={formErrors.serial_number} />}

            {isFieldVisible('inventory_code') && <Input name="inventory_code" label="Código de Inventario (Opcional)" value={formData.inventory_code} onChange={handleChange} variant="bordered" isDisabled={isSubmittingGlobal} isInvalid={!!formErrors.inventory_code} errorMessage={formErrors.inventory_code} />}

            {isFieldVisible('description') && <Textarea name="description" label="Descripción (Opcional)" value={formData.description || ""} onChange={handleChange} variant="bordered" minRows={3} isDisabled={isSubmittingGlobal} isInvalid={!!formErrors.description} errorMessage={formErrors.description} />}

            {/* Sección para imagen (URL directa) */}
            {isFieldVisible('image_url') && (
                <>
                    <Divider className="my-4" />
                    <Input name="image_url" label="URL de la Imagen (Opcional)" value={formData.image_url || ""} onChange={handleChange} variant="bordered" isDisabled={isSubmittingGlobal} type="url" placeholder="https://ejemplo.com/imagen.png" isInvalid={!!formErrors.image_url} errorMessage={formErrors.image_url} />
                    <Divider className="my-4" />
                </>
            )}

            {/* Campos de Tipo de Activo e IT */}
            <div className="border border-default-200 p-4 rounded-medium bg-default-50">
                <ITAssetFields
                    assetType={formData.asset_type as any}
                    itDeviceType={formData.it_device_type}
                    ipAddress={formData.ip_address}
                    subnetMask={formData.subnet_mask}
                    onAssetTypeChange={(value) => handleSelectChange('asset_type' as any, value)}
                    onITDeviceTypeChange={(value) => handleSelectChange('it_device_type' as any, value)}
                    onFieldChange={(name, value) => handleChange({ target: { name, value } } as any)}
                    isDisabled={isSubmittingGlobal}
                    errors={{
                        asset_type: formErrors.asset_type as any,
                        it_device_type: formErrors.it_device_type as any,
                        ip_address: formErrors.ip_address as any,
                        subnet_mask: formErrors.subnet_mask as any,
                    }}
                    isVisible={(field) => isFieldVisible(field as any)}
                />
            </div>

            {/* Network Connections - Only for IT Assets */}
            {formData.asset_type === 'informatica' && (
                <div className="border border-default-200 p-4 rounded-medium bg-default-50 mt-4">
                    <h3 className="text-lg font-semibold mb-4">Conexiones de Red (Opcional)</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select
                                label="Conectar a dispositivo"
                                placeholder="Seleccionar activo"
                                selectedKeys={newConnection.connected_to_asset_id ? [newConnection.connected_to_asset_id] : []}
                                onChange={(e) => setNewConnection(prev => ({ ...prev, connected_to_asset_id: e.target.value }))}
                            >
                                {assets.map(asset => (
                                    <SelectItem key={asset.id} textValue={asset.product_name}>
                                        {asset.product_name} ({asset.inventory_code})
                                    </SelectItem>
                                ))}
                            </Select>
                            <Select
                                label="Tipo de Conexión"
                                selectedKeys={[newConnection.connection_type]}
                                onChange={(e) => setNewConnection(prev => ({ ...prev, connection_type: e.target.value }))}
                            >
                                <SelectItem key="ethernet">Ethernet</SelectItem>
                                <SelectItem key="wifi">WiFi</SelectItem>
                                <SelectItem key="fiber">Fibra Óptica</SelectItem>
                                <SelectItem key="uplink">Uplink</SelectItem>
                                <SelectItem key="other">Otro</SelectItem>
                            </Select>
                            <Input
                                label="Puerto"
                                placeholder="Ej: Eth0"
                                value={newConnection.port_number}
                                onValueChange={(val) => setNewConnection(prev => ({ ...prev, port_number: val }))}
                            />
                            <Input
                                label="Notas"
                                placeholder="Detalles..."
                                value={newConnection.notes}
                                onValueChange={(val) => setNewConnection(prev => ({ ...prev, notes: val }))}
                            />
                        </div>
                        <Button size="sm" color="primary" onPress={handleAddConnection} isDisabled={!newConnection.connected_to_asset_id}>
                            Agregar Conexión
                        </Button>

                        {pendingConnections.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium">Conexiones a agregar:</h4>
                                <ul className="list-disc list-inside text-sm">
                                    {pendingConnections.map((conn, idx) => {
                                        const assetName = assets.find(a => a.id == conn.connected_to_asset_id)?.product_name || "Desconocido";
                                        return (
                                            <li key={idx} className="flex justify-between items-center py-1">
                                                <span>Conectado a: <strong>{assetName}</strong> via {conn.connection_type} {conn.port_number ? `(${conn.port_number})` : ''}</span>
                                                <Button size="sm" color="danger" variant="light" onPress={() => handleRemoveConnection(idx)}>Eliminar</Button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isFieldVisible('current_section_id') && (
                    <Select label="Sección Actual" name="current_section_id" placeholder="Seleccionar sección" selectedKeys={formData.current_section_id ? [String(formData.current_section_id)] : []} onSelectionChange={(keys) => handleSelectChange("current_section_id", Array.from(keys as Set<Key>)[0] as string | null)} variant="bordered" isRequired isDisabled={isSubmittingGlobal || isLoadingDropdowns} isInvalid={!!formErrors.current_section_id} errorMessage={formErrors.current_section_id}>
                        {sections.map((opt) => (<SelectItem key={opt.id} textValue={opt.name}>{opt.name}</SelectItem>))}
                    </Select>
                )}
                {isFieldVisible('current_location_id') && (
                    <Select label="Ubicación Actual (Opcional)" name="current_location_id" placeholder="Seleccionar ubicación" selectedKeys={formData.current_location_id ? [String(formData.current_location_id)] : []} onSelectionChange={(keys) => handleSelectChange("current_location_id", Array.from(keys as Set<Key>)[0] as string | null)} variant="bordered" isDisabled={isSubmittingGlobal || isLoadingDropdowns || !formData.current_section_id || locations.length === 0} description={!formData.current_section_id ? "Seleccione una sección primero" : (locations.length === 0 ? "No hay ubicaciones para esta sección" : "")} isInvalid={!!formErrors.current_location_id} errorMessage={formErrors.current_location_id}>
                        {locations.map((opt) => (<SelectItem key={opt.id} textValue={opt.name}>{opt.name}</SelectItem>))}
                    </Select>
                )}
            </div>

            {isFieldVisible('supplier_company_id') && (
                <Autocomplete label="Empresa Proveedora (Opcional)" name="supplier_company_id" placeholder="Buscar empresa..." defaultItems={companies} selectedKey={formData.supplier_company_id ? String(formData.supplier_company_id) : null} onSelectionChange={(key) => handleSelectChange("supplier_company_id", key as string | null)} variant="bordered" isDisabled={isSubmittingGlobal || isLoadingDropdowns} allowsCustomValue={false} isInvalid={!!formErrors.supplier_company_id} errorMessage={formErrors.supplier_company_id}>
                    {(item) => <AutocompleteItem key={item.id} textValue={item.name}>{item.name}</AutocompleteItem>}
                </Autocomplete>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isFieldVisible('purchase_date_value') && <DatePicker name="purchase_date_value" label="Fecha de Compra (Opcional)" value={formData.purchase_date_value as any} onChange={(date) => handleDateChange("purchase_date_value", date)} variant="bordered" granularity="day" isDisabled={isSubmittingGlobal} isInvalid={!!formErrors.purchase_date_value} errorMessage={formErrors.purchase_date_value} />}
                {isFieldVisible('warranty_expiry_date_value') && <DatePicker name="warranty_expiry_date_value" label="Vencimiento de Garantía (Opcional)" value={formData.warranty_expiry_date_value as any} onChange={(date) => handleDateChange("warranty_expiry_date_value", date)} variant="bordered" granularity="day" isDisabled={isSubmittingGlobal} isInvalid={!!formErrors.warranty_expiry_date_value} errorMessage={formErrors.warranty_expiry_date_value} />}
            </div>

            {isFieldVisible('invoice_number') && <Input name="invoice_number" label="Número de Factura (Opcional)" value={formData.invoice_number || ""} onChange={handleChange} variant="bordered" isDisabled={isSubmittingGlobal} isInvalid={!!formErrors.invoice_number} errorMessage={formErrors.invoice_number} />}
            {isFieldVisible('acquisition_procedure') && <Input name="acquisition_procedure" label="Procedimiento de Adquisición (Opcional)" value={formData.acquisition_procedure || ""} onChange={handleChange} variant="bordered" isDisabled={isSubmittingGlobal} isInvalid={!!formErrors.acquisition_procedure} errorMessage={formErrors.acquisition_procedure} />}

            <Select label="Estado del Activo" name="status" placeholder="Seleccionar estado" selectedKeys={formData.status ? [formData.status] : ["in_storage"]} onSelectionChange={(keys) => handleSelectChange("status", Array.from(keys as Set<string>)[0] as string | null)} variant="bordered" isRequired isDisabled={isSubmittingGlobal} isInvalid={!!formErrors.status} errorMessage={formErrors.status}>
                {assetStatusOptions.map((opt) => (<SelectItem key={opt.key} textValue={opt.label}>{opt.label}</SelectItem>))}
            </Select>

            <div className="flex justify-end pt-4">
                <Button type="submit" color="primary" isLoading={isSubmittingGlobal} isDisabled={isSubmittingGlobal}>
                    {isSubmittingGlobal ? "Guardando..." : submitButtonText}
                </Button>
            </div>
        </form>
    );
}
