// UAM-APP/app/dashboard/companies/add/page.tsx
"use client";

import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
    Input,
    Button,
    Card,
    CardHeader,
    CardBody,
    Spinner,
    Link as NextUILink,
    Divider
} from "@heroui/react";
import { toast } from "react-hot-toast";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import { createCompanySchema } from "@/lib/schema"; // Usaremos el schema de creación
import { z } from "zod";

// Tipo para el estado del formulario, basado en el schema de creación
type FormState = z.infer<typeof createCompanySchema>;
type FormErrors = z.ZodFormattedError<FormState> | null;

const initialFormData: FormState = {
    tax_id: "",
    legal_name: "",
    trade_name: "", // o null si el schema lo permite como opcional y nullable
    email: "",       // o null
    phone_number: "", // o null
};

export default function AddCompanyPage() {
    const router = useRouter();
    const [formData, setFormData] = useState<FormState>(initialFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<FormErrors>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors(null);
        const submittingToastId = toast.loading('Agregando empresa...');

        // Limpiar campos opcionales que estén vacíos a null si el schema lo espera
        const dataToValidate: FormState = {
            ...formData,
            trade_name: formData.trade_name?.trim() === "" ? null : formData.trade_name,
            email: formData.email?.trim() === "" ? null : formData.email,
            phone_number: formData.phone_number?.trim() === "" ? null : formData.phone_number,
        };


        const validationResult = createCompanySchema.safeParse(dataToValidate);

        if (!validationResult.success) {
            setErrors(validationResult.error.format());
            setIsSubmitting(false);
            toast.error("Por favor, corrige los errores en el formulario.", { id: submittingToastId });
            return;
        }

        const dataToSubmit = validationResult.data;

        try {
            const response = await fetch('/api/companies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSubmit),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Error ${response.status}: Fallo al crear la empresa`);
            }

            toast.success(`Empresa "${result.legal_name || result.trade_name}" agregada correctamente!`, { id: submittingToastId });
            router.push('/dashboard/companies');
            router.refresh(); // Para asegurar que la lista se actualice
        } catch (err: any) {
            console.error("Error creating company:", err);
            toast.error(err.message || "Ocurrió un error al agregar la empresa.", { id: submittingToastId });
            if (err.message && err.message.toLowerCase().includes("rut") && err.message.toLowerCase().includes("existe")) {
                setErrors(prev => ({ ...(prev || { _errors: [] }), tax_id: { _errors: ["Este RUT ya está registrado."] } }));
            }
            if (err.message && err.message.toLowerCase().includes("email") && err.message.toLowerCase().includes("existe")) {
                setErrors(prev => ({ ...(prev || { _errors: [] }), email: { _errors: ["Este email ya está registrado."] } }));
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
                    href="/dashboard/companies"
                    variant="light"
                    startContent={<ArrowLeftIcon className="mr-1" />}
                >
                    Volver a la Lista de Empresas
                </Button>
            </div>
            <Card className="shadow-xl">
                <CardHeader>
                    <h1 className="text-2xl font-bold text-foreground">
                        Agregar Nueva Empresa
                    </h1>
                </CardHeader>
                <Divider />
                <CardBody>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            name="tax_id"
                            label="RUT (Tax ID)"
                            value={formData.tax_id}
                            onChange={handleChange}
                            variant="bordered"
                            isRequired
                            isDisabled={isSubmitting}
                            isInvalid={!!errors?.tax_id?._errors.length}
                            errorMessage={errors?.tax_id?._errors.join(", ")}
                            description="El RUT o identificador fiscal de la empresa."
                        />
                        <Input
                            name="legal_name"
                            label="Razón Social"
                            value={formData.legal_name}
                            onChange={handleChange}
                            variant="bordered"
                            isRequired
                            isDisabled={isSubmitting}
                            isInvalid={!!errors?.legal_name?._errors.length}
                            errorMessage={errors?.legal_name?._errors.join(", ")}
                        />
                        <Input
                            name="trade_name"
                            label="Nombre Fantasía (Opcional)"
                            value={formData.trade_name || ""}
                            onChange={handleChange}
                            variant="bordered"
                            isDisabled={isSubmitting}
                            isInvalid={!!errors?.trade_name?._errors.length}
                            errorMessage={errors?.trade_name?._errors.join(", ")}
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
                        />
                        <Input
                            name="phone_number"
                            label="Número de Teléfono (Opcional)"
                            value={formData.phone_number || ""}
                            onChange={handleChange}
                            variant="bordered"
                            isDisabled={isSubmitting}
                            isInvalid={!!errors?.phone_number?._errors.length}
                            errorMessage={errors?.phone_number?._errors.join(", ")}
                        />

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="flat" onPress={() => router.push("/dashboard/companies")} isDisabled={isSubmitting} type="button">
                                Cancelar
                            </Button>
                            <Button type="submit" color="primary" isLoading={isSubmitting} isDisabled={isSubmitting}>
                                {isSubmitting ? "Guardando..." : "Agregar Empresa"}
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}