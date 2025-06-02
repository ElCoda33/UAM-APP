// app/dashboard/sections/components/SectionForm.tsx
"use client";

import React, { useEffect, useState, FormEvent } from "react";
import {
  Input,
  Button,
  Select,
  SelectItem,
  Autocomplete,
  AutocompleteItem,
  Spinner,
  Textarea // Podríamos usar Textarea si el email fuera más largo, pero Input es común
} from "@heroui/react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { sectionSchema, createSectionSchema, updateSectionSchema } from "@/lib/schema"; //
import type { SectionRecord } from "@/app/api/sections/route"; // Interfaz de la API
import { z } from "zod";

interface SectionFormProps {
  initialData?: Partial<SectionRecord>; // Para modo edición
  isEditMode: boolean;
  sectionId?: number; // Necesario para modo edición
  onSubmitSuccess: (data: SectionRecord) => void;
  onCancel: () => void;
}

const managementLevels = [
  { key: "1", label: "Nivel 1" },
  { key: "2", label: "Nivel 2" },
  { key: "3", label: "Nivel 3" },
  // Agrega más niveles si son necesarios
];

type FormFields = z.infer<typeof sectionSchema>;
type FormErrors = z.ZodFormattedError<FormFields> | null;

export default function SectionForm({
  initialData,
  isEditMode,
  sectionId,
  onSubmitSuccess,
  onCancel,
}: SectionFormProps) {
  const [formData, setFormData] = useState<Partial<FormFields>>({
    name: initialData?.name || "",
    management_level: initialData?.management_level ?? null,
    email: initialData?.email || "",
    parent_section_id: initialData?.parent_section_id ?? null,
  });
  const [allSections, setAllSections] = useState<SectionRecord[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        management_level: initialData.management_level ?? null,
        email: initialData.email || "",
        parent_section_id: initialData.parent_section_id ?? null,
      });
    }
  }, [initialData]);

  useEffect(() => {
    const fetchSectionsForDropdown = async () => {
      setIsLoadingSections(true);
      try {
        const res = await fetch("/api/sections");
        if (!res.ok) throw new Error("Error al cargar lista de secciones para dependencia.");
        const data: SectionRecord[] = await res.json();
        // Filtrar la sección actual de la lista de posibles padres en modo edición
        setAllSections(isEditMode && sectionId ? data.filter(s => s.id !== sectionId) : data);
      } catch (error: any) {
        toast.error(error.message || "No se pudieron cargar las secciones para el selector.");
      } finally {
        setIsLoadingSections(false);
      }
    };
    fetchSectionsForDropdown();
  }, [isEditMode, sectionId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors && errors[name as keyof FormFields]) {
      setErrors(prev => ({ ...prev, [name as keyof FormFields]: undefined, _errors: [] }));
    }
  };

  const handleSelectChange = (name: keyof FormFields, selectedKey: React.Key | null) => {
    setFormData(prev => ({ ...prev, [name]: selectedKey ? Number(selectedKey) : null }));
    if (errors && errors[name as keyof FormFields]) {
      setErrors(prev => ({ ...prev, [name as keyof FormFields]: undefined, _errors: [] }));
    }
  };


  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors(null);

    const dataToValidate: FormFields = {
      name: formData.name || "",
      management_level: formData.management_level === undefined ? null : Number(formData.management_level) || null,
      email: formData.email || null,
      parent_section_id: formData.parent_section_id === undefined ? null : Number(formData.parent_section_id) || null,
    };

    // Evitar que una sección sea su propio padre
    if (isEditMode && sectionId && dataToValidate.parent_section_id === sectionId) {
      toast.error("Una sección no puede ser su propia dependencia.");
      setErrors(prev => ({
        ...(prev || { _errors: [] }),
        parent_section_id: { _errors: ["Una sección no puede ser su propia dependencia."] }
      }));
      setIsSubmitting(false);
      return;
    }

    const schemaToUse = isEditMode ? updateSectionSchema : createSectionSchema;
    const validationResult = schemaToUse.safeParse(dataToValidate);

    if (!validationResult.success) {
      const formattedErrors = validationResult.error.format();
      setErrors(formattedErrors);
      setIsSubmitting(false);
      toast.error("Por favor, corrige los errores en el formulario.");
      return;
    }

    const apiPath = isEditMode ? `/api/sections/${sectionId}` : "/api/sections";
    const method = isEditMode ? "PUT" : "POST";

    try {
      const response = await fetch(apiPath, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validationResult.data),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Error al ${isEditMode ? 'actualizar' : 'crear'} la sección.`);
      }
      toast.success(`Sección ${isEditMode ? 'actualizada' : 'creada'} correctamente!`);
      onSubmitSuccess(result); // `result` debería ser la sección actualizada/creada
    } catch (error: any) {
      toast.error(error.message || `No se pudo ${isEditMode ? 'actualizar' : 'crear'} la sección.`);
      console.error("Error en handleSubmit SectionForm:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        name="name"
        label="Nombre de la Sección"
        value={formData.name || ""}
        onChange={handleChange}
        variant="bordered"
        isInvalid={!!errors?.name?._errors.length}
        errorMessage={errors?.name?._errors.join(", ")}
        isDisabled={isSubmitting}
        isRequired
      />
      <Input
        name="email"
        type="email"
        label="Email de Contacto (Opcional)"
        value={formData.email || ""}
        onChange={handleChange}
        variant="bordered"
        isInvalid={!!errors?.email?._errors.length}
        errorMessage={errors?.email?._errors.join(", ")}
        isDisabled={isSubmitting}
      />
      <Select
        name="management_level"
        label="Nivel de Conducción (Opcional)"
        placeholder="Seleccione un nivel"
        selectedKeys={formData.management_level ? [String(formData.management_level)] : []}
        onSelectionChange={(keys) => handleSelectChange('management_level', Array.from(keys as Set<React.Key>)[0])}
        variant="bordered"
        isInvalid={!!errors?.management_level?._errors.length}
        errorMessage={errors?.management_level?._errors.join(", ")}
        isDisabled={isSubmitting}
      >
        {managementLevels.map((level) => (
          <SelectItem key={level.key} value={level.key}>
            {level.label}
          </SelectItem>
        ))}
      </Select>
      <Autocomplete
        name="parent_section_id"
        label="Dependencia (Sección Padre - Opcional)"
        placeholder="Buscar sección padre..."
        items={allSections}
        selectedKey={formData.parent_section_id ? String(formData.parent_section_id) : null}
        onSelectionChange={(key) => handleSelectChange('parent_section_id', key)}
        isLoading={isLoadingSections}
        variant="bordered"
        aria-label="Dependencia"
        isInvalid={!!errors?.parent_section_id?._errors.length}
        errorMessage={errors?.parent_section_id?._errors.join(", ")}
        isDisabled={isSubmitting}
        allowsCustomValue={false} // Para asegurar que solo se seleccionen IDs válidos
        onClear={() => handleSelectChange('parent_section_id', null)}
      >
        {(item) => (
          <AutocompleteItem key={item.id} textValue={item.name}>
            {item.name} (ID: {item.id})
          </AutocompleteItem>
        )}
      </Autocomplete>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="flat" onPress={onCancel} isDisabled={isSubmitting} type="button">
          Cancelar
        </Button>
        <Button type="submit" color="primary" isLoading={isSubmitting} isDisabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : (isEditMode ? "Guardar Cambios" : "Crear Sección")}
        </Button>
      </div>
    </form>
  );
}