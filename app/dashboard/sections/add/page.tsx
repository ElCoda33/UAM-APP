// UAM-APP/app/dashboard/sections/add/page.tsx
"use client";

import React, { useState, useEffect, FormEvent, Key } from "react";
import { useRouter } from "next/navigation";
import {
    Input,
    Button,
    Card,
    CardHeader,
    CardBody,
    Spinner,
    Link as NextUILink,
    Divider,
    Select,       // Usaremos Select
    SelectItem    // Usaremos SelectItem
    // Autocomplete y AutocompleteItem ya no son necesarios aquí si los reemplazamos completamente
} from "@heroui/react";
import { toast } from "react-hot-toast";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import { createSectionSchema } from "@/lib/schema";
import type { SectionRecord } from "@/app/api/sections/route";
import { z } from "zod";

type FormState = z.infer<typeof createSectionSchema>;
type FormErrors = z.ZodFormattedError<FormState> | null;

const initialFormData: FormState = {
    name: "",
    management_level: null,
    email: null,
    parent_section_id: null, // Inicializamos como null para el Select
};

const managementLevelsOptions = [
    { key: 1, label: "Nivel 1" },
    { key: 2, label: "Nivel 2" },
    { key: 3, label: "Nivel 3" },
];

export default function AddSectionPage() {
    const router = useRouter();
    const [formData, setFormData] = useState<FormState>(initialFormData);
    const [allParentSections, setAllParentSections] = useState<SectionRecord[]>([]);
    const [isLoadingSections, setIsLoadingSections] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<FormErrors>(null);

    useEffect(() => {
        const fetchParentSections = async () => {
            setIsLoadingSections(true);
            try {
                const response = await fetch('/api/sections');
                if (!response.ok) {
                    throw new Error("No se pudieron cargar las secciones para el selector de dependencia.");
                }
                const data: SectionRecord[] = await response.json();
                setAllParentSections(data.filter(section => section.deleted_at === null));
            } catch (error: any) {
                toast.error(error.message || "Error cargando secciones para dependencia.");
                console.error("Error fetching parent sections:", error);
            } finally {
                setIsLoadingSections(false);
            }
        };
        fetchParentSections();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors && errors[name as keyof FormState]) {
            setErrors(prevErrors => {
                if (!prevErrors) return null;
                const newFieldErrors = { ...prevErrors };
                delete newFieldErrors[name as keyof FormState];
                return newFieldErrors;
            });
        }
    };

    const handleSelectChange = (fieldName: keyof Pick<FormState, 'management_level' | 'parent_section_id'>, selectedKey: Key | null) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: selectedKey ? Number(selectedKey) : null // Guardar null si no hay selección
        }));
        if (errors && errors[fieldName]) {
            setErrors(prevErrors => {
                if (!prevErrors) return null;
                const newFieldErrors = { ...prevErrors };
                delete newFieldErrors[fieldName];
                return newFieldErrors;
            });
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors(null);
        const submittingToastId = toast.loading('Agregando sección...');

        const dataToValidate: FormState = {
            name: formData.name.trim(),
            management_level: formData.management_level ? Number(formData.management_level) : null,
            email: formData.email?.trim() === "" ? null : formData.email?.trim(),
            parent_section_id: formData.parent_section_id ? Number(formData.parent_section_id) : null,
        };

        const validationResult = createSectionSchema.safeParse(dataToValidate);

        if (!validationResult.success) {
            setErrors(validationResult.error.format() as FormErrors);
            setIsSubmitting(false);
            toast.error("Por favor, corrige los errores en el formulario.", { id: submittingToastId });
            return;
        }

        const dataToSubmit = validationResult.data;

        try {
            const response = await fetch('/api/sections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSubmit),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || `Error ${response.status}: Fallo al crear la sección`);
            }
            toast.success(`Sección "${result.name}" agregada correctamente!`, { id: submittingToastId });
            router.push('/dashboard/sections');
            router.refresh();
        } catch (err: any) {
            console.error("Error creating section:", err);
            toast.error(err.message || "Ocurrió un error al agregar la sección.", { id: submittingToastId });
            if (err.message) {
                if (err.message.toLowerCase().includes("nombre") && err.message.toLowerCase().includes("uso")) {
                    setErrors(prev => ({ ...(prev || { _errors: [] }), name: { _errors: ["Este nombre de sección ya está en uso."] } }));
                }
                if (err.message.toLowerCase().includes("email") && err.message.toLowerCase().includes("uso")) {
                    setErrors(prev => ({ ...(prev || { _errors: [] }), email: { _errors: ["Este email ya está en uso por otra sección."] } }));
                }
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
                <Button
                    as={NextUILink}
                    href="/dashboard/sections"
                    variant="light"
                    startContent={<ArrowLeftIcon className="mr-1" />}
                >
                    Volver a la Lista de Secciones
                </Button>
            </div>
            <Card className="shadow-xl">
                <CardHeader>
                    <h1 className="text-2xl font-bold text-foreground">
                        Agregar Nueva Sección
                    </h1>
                </CardHeader>
                <Divider />
                <CardBody>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            name="name"
                            label="Nombre de la Sección"
                            value={formData.name}
                            onChange={handleChange}
                            variant="bordered"
                            isRequired
                            isDisabled={isSubmitting}
                            isInvalid={!!errors?.name?._errors.length}
                            errorMessage={errors?.name?._errors.join(", ")}
                            description="Nombre único para la nueva sección."
                        />
                        <Input
                            name="email"
                            type="email"
                            label="Email de Contacto (Opcional)"
                            value={formData.email || ""}
                            onChange={handleChange}
                            variant="bordered"
                            isDisabled={isSubmitting}
                            isInvalid={!!errors?.email?._errors.length}
                            errorMessage={errors?.email?._errors.join(", ")}
                            description="Casilla de correo electrónico asociada a la sección."
                        />
                        <Select
                            name="management_level"
                            label="Nivel de Conducción (Opcional)"
                            placeholder="Seleccionar nivel"
                            items={managementLevelsOptions}
                            selectedKeys={formData.management_level ? [String(formData.management_level)] : []}
                            onSelectionChange={(keys) => handleSelectChange('management_level', Array.from(keys as Set<Key>)[0])}
                            variant="bordered"
                            isDisabled={isSubmitting}
                            isInvalid={!!errors?.management_level?._errors.length}
                            errorMessage={errors?.management_level?._errors.join(", ")}
                            description="Nivel jerárquico o de gestión de la sección."
                        >
                            {(level) => (
                                <SelectItem key={level.key} textValue={level.label}>
                                    {level.label}
                                </SelectItem>
                            )}
                        </Select>
                        <Select // Cambiado de Autocomplete a Select
                            name="parent_section_id"
                            label="Dependencia (Sección Padre - Opcional)"
                            placeholder="Seleccionar sección padre..."
                            items={allParentSections}
                            selectedKeys={formData.parent_section_id ? [String(formData.parent_section_id)] : []}
                            onSelectionChange={(keys) => handleSelectChange('parent_section_id', Array.from(keys as Set<Key>)[0])}
                            variant="bordered"
                            isDisabled={isSubmitting || isLoadingSections}
                            isLoading={isLoadingSections}
                            isInvalid={!!errors?.parent_section_id?._errors.length}
                            errorMessage={errors?.parent_section_id?._errors.join(", ")}
                            description="Si esta sección depende jerárquicamente de otra sección."
                        >
                            {(section) => (
                                <SelectItem key={section.id} textValue={section.name}>
                                    {section.name} (ID: {section.id})
                                </SelectItem>
                            )}
                        </Select>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="flat" onPress={() => router.push("/dashboard/sections")} isDisabled={isSubmitting} type="button">
                                Cancelar
                            </Button>
                            <Button type="submit" color="primary" isLoading={isSubmitting} isDisabled={isSubmitting}>
                                {isSubmitting ? "Guardando..." : "Agregar Sección"}
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}