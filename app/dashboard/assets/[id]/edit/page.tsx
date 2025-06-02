// app/dashboard/assets/[id]/edit/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Input,
  Button,
  Card,
  CardHeader,
  CardBody,
  Select,
  SelectItem,
  Spinner,
  Link as NextUILink, // Assuming HeroUI's Link, aliased
  Textarea,
  Divider,
  DatePicker // From @heroui/react
} from "@heroui/react";
import { toast } from "react-hot-toast";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import AssetImageUpload from "@/app/dashboard/assets/components/assetImageUpload"; // We'll define this next
import { parseDate, CalendarDate, DateValue } from "@internationalized/date"; // For DatePicker

// Interfaces for fetched data
interface AssetData {
  id: number;
  product_name: string | null;
  serial_number: string | null;
  inventory_code: string | null;
  description: string | null;
  current_section_id: number | null;
  current_location_id: number | null;
  supplier_company_id: number | null;
  purchase_date: string | null; // YYYY-MM-DD
  invoice_number: string | null;
  warranty_expiry_date: string | null; // YYYY-MM-DD
  acquisition_procedure: string | null;
  status: 'in_use' | 'in_storage' | 'under_repair' | 'disposed' | 'lost' | null;
  image_url: string | null;
}

interface Section {
  id: number;
  name: string;
}

interface Location {
  id: number;
  name: string;
}

interface Company {
  id: number;
  // Assuming 'legal_name' or 'trade_name' would be used for display
  legal_name?: string;
  trade_name?: string;
  name?: string; // Fallback if the above are not present
}

// Form state should handle DateValue for DatePickers
type FormState = Omit<AssetData, 'id' | 'purchase_date' | 'warranty_expiry_date'> & {
  purchase_date_value: DateValue | null;
  warranty_expiry_date_value: DateValue | null;
};

const assetStatusOptions: Array<{ key: AssetData['status']; label: string }> = [
  { key: 'in_use', label: 'En Uso' },
  { key: 'in_storage', label: 'En Depósito' },
  { key: 'under_repair', label: 'En Reparación' },
  { key: 'disposed', label: 'Dado de Baja' },
  { key: 'lost', label: 'Perdido' },
];

// Helper to convert YYYY-MM-DD string to DateValue for HeroUI's DatePicker
const stringToDateValue = (dateString: string | null | undefined): DateValue | null => {
  if (!dateString) return null;
  try {
    // CalendarDate expects year, month, day as numbers
    const [year, month, day] = dateString.split('-').map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new CalendarDate(year, month, day);
    }
    return parseDate(dateString); // Fallback using parseDate
  } catch (e) {
    console.warn("Error parsing date string for DatePicker:", dateString, e);
    return null;
  }
};

// Helper to convert DateValue to YYYY-MM-DD string for API submission
const dateValueToString = (dateValue: DateValue | null | undefined): string | null => {
  if (!dateValue) return null;
  return `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
};


export default function EditAssetPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [formData, setFormData] = useState<Partial<FormState>>({
    image_url: "", // Initialize image_url
    purchase_date_value: null,
    warranty_expiry_date_value: null,
  });
  const [originalAsset, setOriginalAsset] = useState<AssetData | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("ID de activo no válido.");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Parallel fetch for asset details and dropdown options
        const [assetRes, sectionsRes, locationsRes, companiesRes] = await Promise.all([
          fetch(`/api/assets/${id}`),      // API to be created
          fetch('/api/sections'),          // Existing API
          fetch('/api/locations'),         // API to be created based on existing patterns
          fetch('/api/companies'),         // API to be created
        ]);

        if (!assetRes.ok) throw new Error(`Error al cargar activo: ${assetRes.statusText}`);
        const assetData: AssetData = await assetRes.json();
        setOriginalAsset(assetData);
        setFormData({
          product_name: assetData.product_name || "",
          serial_number: assetData.serial_number || "",
          inventory_code: assetData.inventory_code || "",
          description: assetData.description || "",
          current_section_id: assetData.current_section_id || null,
          current_location_id: assetData.current_location_id || null,
          supplier_company_id: assetData.supplier_company_id || null,
          purchase_date_value: stringToDateValue(assetData.purchase_date),
          invoice_number: assetData.invoice_number || "",
          warranty_expiry_date_value: stringToDateValue(assetData.warranty_expiry_date),
          acquisition_procedure: assetData.acquisition_procedure || "",
          status: assetData.status || "in_storage",
          image_url: assetData.image_url || "",
        });

        if (!sectionsRes.ok) throw new Error('Error al cargar secciones');
        setSections(await sectionsRes.json());

        if (!locationsRes.ok) throw new Error('Error al cargar ubicaciones');
        setLocations(await locationsRes.json());

        if (!companiesRes.ok) throw new Error('Error al cargar empresas');
        setCompanies(await companiesRes.json());

      } catch (err: any) {
        console.error("Error fetching data for asset edit page:", err);
        setError(err.message || "Ocurrió un error al cargar datos.");
        toast.error(err.message || "Ocurrió un error al cargar datos para editar.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, key: Key | null) => {
    if (name === "status") {
      setFormData(prev => ({ ...prev, [name]: key as AssetData["status"] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: key ? Number(key) : null }));
    }
  };

  const handleDateChange = (name: string, date: DateValue | null) => {
    setFormData(prev => ({ ...prev, [name]: date }));
  };

  const handleImageUploadSuccess = (newImageUrl: string) => {
    setFormData(prev => ({ ...prev, image_url: newImageUrl }));
    toast.success("Imagen del activo actualizada en el formulario. No olvides guardar todos los cambios.");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const savingToastId = toast.loading('Guardando cambios del activo...');

    // Prepare payload, converting DateValue back to string
    const payload = {
      ...formData,
      purchase_date: dateValueToString(formData.purchase_date_value),
      warranty_expiry_date: dateValueToString(formData.warranty_expiry_date_value),
    };
    delete (payload as any).purchase_date_value;
    delete (payload as any).warranty_expiry_date_value;

    // TODO: Implement Zod validation for asset data before submitting
    // const validationResult = assetSchema.safeParse(payload);
    // if (!validationResult.success) { /* handle errors */ }

    try {
      const res = await fetch(`/api/assets/${id}`, { // API endpoint to be created
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Error ${res.status}: Fallo al actualizar activo`);
      }

      toast.success('Activo actualizado correctamente!', { id: savingToastId });
      router.push(`/dashboard/assets`); // Or to asset detail page: /dashboard/assets/${id}
      router.refresh();
    } catch (err: any) {
      console.error("Error updating asset:", err);
      toast.error(err.message || "Ocurrió un error al guardar el activo.", { id: savingToastId });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner label="Cargando formulario del activo..." /></div>;
  }
  if (error && !originalAsset) {
    return <div className="container mx-auto p-4 text-center"><p className="text-danger">{error}</p></div>;
  }
  if (!originalAsset && !isLoading) {
    return <div className="container mx-auto p-4 text-center"><p>Activo no encontrado o error al cargar datos.</p></div>;
  }

  return (
    <div className="container mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Button
          as={NextUILink}
          href={originalAsset ? `/dashboard/assets` : '/dashboard/assets'} // Or /dashboard/assets/${id} for detail view
          variant="light"
          startContent={<ArrowLeftIcon className="mr-1" />}
        >
          {originalAsset ? "Volver a Lista de Activos" : "Volver a la Lista"}
        </Button>
      </div>
      <Card className="shadow-xl">
        <CardHeader>
          <h1 className="text-2xl font-bold text-foreground">
            Editar Activo: {originalAsset?.product_name || `ID ${id}`}
          </h1>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center space-y-3 p-4 border border-default-200 rounded-medium">
              <h3 className="text-lg font-medium text-foreground-600 self-start">Imagen del Activo</h3>
              <AssetImageUpload
                assetId={id!}
                currentImageUrl={formData.image_url || ""}
                onUploadSuccess={handleImageUploadSuccess}
              />
              <Textarea
                name="image_url"
                label="URL de la Imagen"
                value={formData.image_url || ""}
                onChange={handleChange}
                variant="bordered"
                placeholder="https://example.com/asset_image.png"
                description="Puedes pegar una URL directamente o usar el botón de arriba para subir una imagen."
                minRows={1}
                maxRows={3}
                disabled={isSaving}
              />
            </div>
            <Divider className="my-4" />

            <Input name="product_name" label="Nombre del Producto/Activo" value={formData.product_name || ""} onChange={handleChange} variant="bordered" isRequired isDisabled={isSaving} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input name="serial_number" label="Número de Serie" value={formData.serial_number || ""} onChange={handleChange} variant="bordered" isDisabled={isSaving} />
              <Input name="inventory_code" label="Código de Inventario" value={formData.inventory_code || ""} onChange={handleChange} variant="bordered" isRequired isDisabled={isSaving} />
            </div>
            <Textarea name="description" label="Descripción" value={formData.description || ""} onChange={handleChange} variant="bordered" minRows={3} isDisabled={isSaving} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DatePicker
                name="purchase_date_value"
                label="Fecha de Compra"
                value={formData.purchase_date_value}
                onChange={(date) => handleDateChange("purchase_date_value", date)}
                variant="bordered"
                granularity="day"
                isDisabled={isSaving}
              />
              <DatePicker
                name="warranty_expiry_date_value"
                label="Vencimiento de Garantía"
                value={formData.warranty_expiry_date_value}
                onChange={(date) => handleDateChange("warranty_expiry_date_value", date)}
                variant="bordered"
                granularity="day"
                isDisabled={isSaving}
              />
            </div>

            <Input name="invoice_number" label="Número de Factura" value={formData.invoice_number || ""} onChange={handleChange} variant="bordered" isDisabled={isSaving} />
            <Input name="acquisition_procedure" label="Procedimiento de Adquisición" value={formData.acquisition_procedure || ""} onChange={handleChange} variant="bordered" isDisabled={isSaving} />

            <Select
              label="Estado del Activo"
              name="status"
              placeholder="Seleccionar estado"
              selectedKeys={formData.status ? [formData.status] : []}
              onSelectionChange={(keys) => handleSelectChange("status", Array.from(keys as Set<string>)[0] as string | null)}
              variant="bordered"
              isRequired
              isDisabled={isSaving}
            >
              {assetStatusOptions.map((opt) => (
                <SelectItem key={opt.key!} value={opt.key!} textValue={opt.label}>
                  {opt.label}
                </SelectItem>
              ))}
            </Select>

            <Select
              label="Sección Actual"
              name="current_section_id"
              placeholder="Seleccionar sección"
              selectedKeys={formData.current_section_id ? [String(formData.current_section_id)] : []}
              onSelectionChange={(keys) => handleSelectChange("current_section_id", Array.from(keys as Set<string>)[0] as string | null)}
              variant="bordered"
              isRequired
              isDisabled={isSaving}
            >
              {sections.map((section) => (
                <SelectItem key={section.id} value={String(section.id)} textValue={section.name}>
                  {section.name}
                </SelectItem>
              ))}
            </Select>

            <Select
              label="Ubicación Actual"
              name="current_location_id"
              placeholder="Seleccionar ubicación"
              selectedKeys={formData.current_location_id ? [String(formData.current_location_id)] : []}
              onSelectionChange={(keys) => handleSelectChange("current_location_id", Array.from(keys as Set<string>)[0] as string | null)}
              variant="bordered"
              // isRequired // Decide si es obligatorio
              isDisabled={isSaving}
            >
              {locations.map((location) => (
                <SelectItem key={location.id} value={String(location.id)} textValue={location.name}>
                  {location.name}
                </SelectItem>
              ))}
            </Select>

            <Select
              label="Empresa Proveedora"
              name="supplier_company_id"
              placeholder="Seleccionar empresa"
              selectedKeys={formData.supplier_company_id ? [String(formData.supplier_company_id)] : []}
              onSelectionChange={(keys) => handleSelectChange("supplier_company_id", Array.from(keys as Set<string>)[0] as string | null)}
              variant="bordered"
              isDisabled={isSaving}
            >
              {companies.map((company) => (
                <SelectItem key={company.id} value={String(company.id)} textValue={company.name || company.legal_name || company.trade_name || `ID: ${company.id}`}>
                  {company.name || company.legal_name || company.trade_name || `ID: ${company.id}`}
                </SelectItem>
              ))}
            </Select>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="flat" onPress={() => router.back()} isDisabled={isSaving}>Cancelar</Button>
              <Button type="submit" color="primary" isLoading={isSaving} isDisabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}