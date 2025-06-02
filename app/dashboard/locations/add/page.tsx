// UAM-APP/app/dashboard/locations/add/page.tsx
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
    Textarea,
    Select, // Cambiado de Autocomplete a Select
    SelectItem // Cambiado de AutocompleteItem a SelectItem
} from "@heroui/react";
import { toast } from "react-hot-toast";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import { createLocationSchema } from "@/lib/schema";
import type { SectionRecord } from "@/app/api/sections/route";
import { z } from "zod";

type FormState = z.infer<typeof createLocationSchema>;
type FormErrors = z.ZodFormattedError<Pick<FormState, 'name' | 'description' | 'section_id'>> | null;

const initialFormData: FormState = {
    name: "",
    description: null,
    section_id: undefined,
};

export default function AddLocationPage() {
    const router = useRouter();
    const [formData, setFormData] = useState<FormState>(initialFormData);
    const [allSections, setAllSections] = useState<SectionRecord[]>([]);
    const [isLoadingSections, setIsLoadingSections] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<FormErrors>(null);

    useEffect(() => {
        const fetchSections = async () => {
            setIsLoadingSections(true);
            try {
                const response = await fetch('/api/sections');
                if (!response.ok) {
                    throw new Error("No se pudieron cargar las secciones para el selector.");
                }
                const data: SectionRecord[] = await response.json();
                setAllSections(data.filter(section => section.deleted_at === null));
            } catch (error: any) {
                toast.error(error.message || "Error cargando secciones.");
                console.error("Error fetching sections:", error);
            } finally {
                setIsLoadingSections(false);
            }
        };
        fetchSections();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors && errors[name as keyof FormState]) {
            setErrors(prevErrors => {
                if (!prevErrors) return null;
                const newFieldErrors = { ...prevErrors };
                const fieldName = name as keyof Pick<FormState, 'name' | 'description' | 'section_id'>;
                if (fieldName in newFieldErrors) {
                    delete newFieldErrors[fieldName];
                }
                return newFieldErrors;
            });
        }
    };

    // Modificado para manejar el evento de HeroUI/NextUI Select
    const handleSectionSelectChange = (selectedKey: Key | null) => {
        const fieldName = 'section_id';
        setFormData(prev => ({ ...prev, [fieldName]: selectedKey ? Number(selectedKey) : undefined }));
        if (errors && errors[fieldName]) {
            setErrors(prevErrors => {
                if (!prevErrors) return null;
                const newFieldErrors = { ...prevErrors };
                if (fieldName in newFieldErrors) {
                    delete newFieldErrors[fieldName];
                }
                return newFieldErrors;
            });
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors(null);
        const submittingToastId = toast.loading('Agregando ubicación...');

        const dataToValidate: FormState = {
            name: formData.name.trim(),
            description: formData.description?.trim() === "" ? null : formData.description?.trim(),
            section_id: formData.section_id ? Number(formData.section_id) : undefined,
        };

        const validationResult = createLocationSchema.safeParse(dataToValidate);

        if (!validationResult.success) {
            setErrors(validationResult.error.format() as FormErrors);
            setIsSubmitting(false);
            toast.error("Por favor, corrige los errores en el formulario.", { id: submittingToastId });
            return;
        }

        const dataToSubmit = validationResult.data;

        try {
            const response = await fetch('/api/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSubmit),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || `Error ${response.status}: Fallo al crear la ubicación`);
            }
            toast.success(`Ubicación "${result.name}" agregada correctamente!`, { id: submittingToastId });
            router.push('/dashboard/locations');
            router.refresh();
        } catch (err: any) {
            console.error("Error creating location:", err);
            toast.error(err.message || "Ocurrió un error al agregar la ubicación.", { id: submittingToastId });
            if (err.message && err.message.toLowerCase().includes("nombre") && err.message.toLowerCase().includes("existe")) {
                setErrors(prev => ({ ...(prev || { _errors: [] }), name: { _errors: ["Este nombre de ubicación ya existe."] } }));
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
                    href="/dashboard/locations"
                    variant="light"
                    startContent={<ArrowLeftIcon className="mr-1" />}
                >
                    Volver a la Lista de Ubicaciones
                </Button>
            </div>
            <Card className="shadow-xl">
                <CardHeader>
                    <h1 className="text-2xl font-bold text-foreground">
                        Agregar Nueva Ubicación
                    </h1>
                </CardHeader>
                <Divider />
                <CardBody>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            name="name"
                            label="Nombre de la Ubicación"
                            value={formData.name}
                            onChange={handleChange}
                            variant="bordered"
                            isRequired
                            isDisabled={isSubmitting}
                            isInvalid={!!errors?.name?._errors.length}
                            errorMessage={errors?.name?._errors.join(", ")}
                            description="Nombre descriptivo para la ubicación física (ej: 'Oficina 101', 'Depósito Sector A')."
                        />
                        <Textarea
                            name="description"
                            label="Descripción (Opcional)"
                            value={formData.description || ""}
                            onChange={handleChange}
                            variant="bordered"
                            minRows={2}
                            isDisabled={isSubmitting}
                            isInvalid={!!errors?.description?._errors.length}
                            errorMessage={errors?.description?._errors.join(", ")}
                        />
                        <Select
                            name="section_id"
                            label="Dependencia (Sección)"
                            placeholder="Seleccionar sección de dependencia"
                            items={allSections}
                            selectedKeys={formData.section_id ? [String(formData.section_id)] : []}
                            onSelectionChange={(keys) => handleSectionSelectChange(Array.from(keys as Set<Key>)[0])}
                            variant="bordered"
                            isRequired // createLocationSchema lo hace requerido a través del .refine()
                            isDisabled={isSubmitting || isLoadingSections}
                            isLoading={isLoadingSections}
                            isInvalid={!!errors?.section_id?._errors.length}
                            errorMessage={errors?.section_id?._errors.join(", ")}
                            description="La sección a la que pertenece o está asociada esta ubicación."
                        >
                            {(section) => (
                                <SelectItem key={section.id} textValue={section.name}>
                                    {section.name} (ID: {section.id})
                                </SelectItem>
                            )}
                        </Select>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="flat" onPress={() => router.push("/dashboard/locations")} isDisabled={isSubmitting} type="button">
                                Cancelar
                            </Button>
                            <Button type="submit" color="primary" isLoading={isSubmitting} isDisabled={isSubmitting}>
                                {isSubmitting ? "Guardando..." : "Agregar Ubicación"}
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}