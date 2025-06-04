// UAM-APP/app/dashboard/locations/[id]/edit/page.tsx
"use client";

import React, { useEffect, useState, FormEvent, Key } from "react";
import { useParams, useRouter } from "next/navigation";
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
    Select,
    SelectItem,
    Autocomplete,
    AutocompleteItem
} from "@heroui/react";
import { toast } from "react-hot-toast";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import type { LocationRecord } from "@/app/api/locations/route"; // Interfaz de la API de ubicaciones
import type { SectionRecord } from "@/app/api/sections/route";   // Interfaz de la API de secciones
import { locationSchema } from "@/lib/schema"; // Para validación Zod en cliente
import { z } from "zod";

// Campos del formulario para una ubicación
type FormState = Pick<LocationRecord, 'name' | 'description' | 'section_id'>;
type FormErrors = z.ZodFormattedError<FormState> | null;

export default function EditLocationPage() {
    const params = useParams();
    const router = useRouter();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const locationId = parseInt(id || "0", 10);

    const [formData, setFormData] = useState<Partial<FormState>>({});
    const [originalLocation, setOriginalLocation] = useState<LocationRecord | null>(null);
    const [allSections, setAllSections] = useState<SectionRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<FormErrors>(null);

    useEffect(() => {
        if (!locationId) {
            toast.error("ID de ubicación no válido.");
            setIsLoading(false);
            router.push("/dashboard/locations");
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            setErrors(null);
            try {
                // Fetch location data and all sections in parallel
                const [locationRes, sectionsRes] = await Promise.all([
                    fetch(`/api/locations/${locationId}`),
                    fetch('/api/sections') // Para el selector de dependencia
                ]);

                if (!locationRes.ok) {
                    const errData = await locationRes.json().catch(() => ({}));
                    throw new Error(errData.message || `Error al cargar datos de la ubicación: ${locationRes.statusText}`);
                }
                const locationData: LocationRecord = await locationRes.json();
                setOriginalLocation(locationData);
                setFormData({
                    name: locationData.name || "",
                    description: locationData.description || "",
                    section_id: locationData.section_id || null,
                });

                if (!sectionsRes.ok) {
                    const errData = await sectionsRes.json().catch(() => ({}));
                    throw new Error(errData.message || "Error al cargar la lista de secciones.");
                }
                setAllSections(await sectionsRes.json());

            } catch (err: any) {
                toast.error(err.message || "No se pudieron cargar los datos necesarios para la edición.");
                console.error("Error fetching data for edit location page:", err);
                // Consider redirecting if essential data (like location itself) fails to load
                if (!originalLocation && err.message.includes("ubicación")) {
                    router.push("/dashboard/locations");
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [locationId, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors && errors[name as keyof FormState]) {
            setErrors(prevErrors => {
                if (!prevErrors) return null;
                const newFieldErrors = { ...prevErrors };
                if (name in newFieldErrors) {
                    delete newFieldErrors[name as keyof FormState];
                }
                return newFieldErrors;
            });
        }
    };

    const handleSelectChange = (fieldName: keyof FormState, selectedKey: Key | null) => {
        setFormData(prev => ({ ...prev, [fieldName]: selectedKey ? Number(selectedKey) : null }));
        if (errors && errors[fieldName as keyof FormState]) {
            setErrors(prevErrors => {
                if (!prevErrors) return null;
                const newFieldErrors = { ...prevErrors };
                if (fieldName in newFieldErrors) {
                    delete newFieldErrors[fieldName as keyof FormState];
                }
                return newFieldErrors;
            });
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setErrors(null);
        const savingToastId = toast.loading('Guardando cambios de la ubicación...');

        const dataToValidate: FormState = {
            name: formData.name || "",
            description: formData.description || null, // Ensure null if empty for optional fields
            section_id: formData.section_id ? Number(formData.section_id) : null,
        };

        // Use a Zod schema for client-side validation, adapted for edit (name is key)
        const editLocationValidationSchema = z.object({
            name: locationSchema.shape.name,
            description: locationSchema.shape.description.optional(),
            section_id: locationSchema.shape.section_id, // Mantener como requerido en la UI, pero API permite null
        });

        const validationResult = editLocationValidationSchema.safeParse(dataToValidate);

        if (!validationResult.success) {
            setErrors(validationResult.error.format());
            setIsSaving(false);
            toast.error("Por favor, corrige los errores en el formulario.", { id: savingToastId });
            return;
        }

        const dataToSubmit = validationResult.data;

        try {
            const res = await fetch(`/api/locations/${locationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSubmit),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.message || `Error ${res.status}: Fallo al actualizar la ubicación`);
            }

            toast.success('Ubicación actualizada correctamente!', { id: savingToastId });
            router.push(`/dashboard/locations`);
            router.refresh();
        } catch (err: any) {
            console.error("Error updating location:", err);
            toast.error(err.message || "Ocurrió un error al guardar la ubicación.", { id: savingToastId });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-100px)]">
                <Spinner label="Cargando datos de la ubicación..." color="primary" size="lg" />
            </div>
        );
    }

    if (!originalLocation) {
        return (
            <div className="container mx-auto p-8 text-center">
                <p className="text-danger-500">No se pudo cargar la información de la ubicación.</p>
                <Button as={NextUILink} href="/dashboard/locations" startContent={<ArrowLeftIcon />} className="mt-4">
                    Volver a la Lista
                </Button>
            </div>
        );
    }

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
                        Editar Ubicación: {originalLocation?.name || `ID ${locationId}`}
                    </h1>
                </CardHeader>
                <Divider />
                <CardBody>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            name="name"
                            label="Nombre de la Ubicación"
                            value={formData.name || ""}
                            onChange={handleChange}
                            variant="bordered"
                            isRequired
                            isDisabled={isSaving}
                            isInvalid={!!errors?.name?._errors.length}
                            errorMessage={errors?.name?._errors.join(", ")}
                        />
                        <Textarea
                            name="description"
                            label="Descripción (Opcional)"
                            value={formData.description || ""}
                            onChange={handleChange}
                            variant="bordered"
                            minRows={3}
                            isDisabled={isSaving}
                            isInvalid={!!errors?.description?._errors.length}
                            errorMessage={errors?.description?._errors.join(", ")}
                        />
                        <Autocomplete
                            name="section_id"
                            label="Dependencia (Sección)"
                            placeholder="Seleccionar sección de dependencia"
                            defaultItems={allSections}
                            selectedKey={formData.section_id ? String(formData.section_id) : null}
                            onSelectionChange={(key) => handleSelectChange('section_id', key as Key | null)}
                            variant="bordered"
                            isRequired // En la UI es bueno que sea requerido, aunque la API podría permitir null
                            isDisabled={isSaving || isLoading}
                            isLoading={isLoading}
                            isInvalid={!!errors?.section_id?._errors.length}
                            errorMessage={errors?.section_id?._errors.join(", ")}
                            allowsCustomValue={false}
                            onClear={() => handleSelectChange('section_id', null)}
                        >
                            {(section) => (
                                <AutocompleteItem key={section.id} textValue={section.name}>
                                    {section.name} (ID: {section.id})
                                </AutocompleteItem>
                            )}
                        </Autocomplete>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="flat" onPress={() => router.push("/dashboard/locations")} isDisabled={isSaving} type="button">
                                Cancelar
                            </Button>
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