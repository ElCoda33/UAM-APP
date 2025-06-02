// UAM-APP/app/dashboard/companies/[id]/edit/page.tsx
"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
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
import type { CompanyRecord } from "@/app/api/companies/route"; // Importar la interfaz
import { companySchema } from "@/lib/schema"; // Para validación Zod en cliente (opcional pero recomendado)
import { z } from "zod";

// Usaremos los campos de CompanyRecord, excluyendo los gestionados por la DB (id, created_at, updated_at)
type FormState = Omit<CompanyRecord, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
type FormErrors = z.ZodFormattedError<FormState> | null;


export default function EditCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const companyId = parseInt(id || "0", 10);

  const [formData, setFormData] = useState<Partial<FormState>>({});
  const [originalCompany, setOriginalCompany] = useState<CompanyRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>(null);


  useEffect(() => {
    if (!companyId) {
      toast.error("ID de empresa no válido.");
      setIsLoading(false);
      router.push("/dashboard/companies");
      return;
    }

    const fetchCompanyData = async () => {
      setIsLoading(true);
      setErrors(null);
      try {
        const response = await fetch(`/api/companies/${companyId}`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Error al cargar datos de la empresa: ${response.statusText}`);
        }
        const data: CompanyRecord = await response.json();
        setOriginalCompany(data);
        setFormData({
          tax_id: data.tax_id || "",
          legal_name: data.legal_name || "",
          trade_name: data.trade_name || "",
          email: data.email || "",
          phone_number: data.phone_number || "",
        });
      } catch (err: any) {
        toast.error(err.message || "No se pudieron cargar los datos de la empresa.");
        console.error("Error fetching company data:", err);
        router.push("/dashboard/companies");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanyData();
  }, [companyId, router]);

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
    setIsSaving(true);
    setErrors(null);
    const savingToastId = toast.loading('Guardando cambios de la empresa...');

    // Client-side validation using a subset of companySchema for edit
    // tax_id and legal_name remain required if present, others can be partial
    const editValidationSchema = z.object({
        tax_id: companySchema.shape.tax_id,
        legal_name: companySchema.shape.legal_name,
        trade_name: companySchema.shape.trade_name.optional(),
        email: companySchema.shape.email.optional(),
        phone_number: companySchema.shape.phone_number.optional(),
    });

    const validationResult = editValidationSchema.safeParse(formData);

    if (!validationResult.success) {
        setErrors(validationResult.error.format());
        setIsSaving(false);
        toast.error("Por favor, corrige los errores en el formulario.", { id: savingToastId });
        return;
    }

    const dataToSubmit = validationResult.data;

    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || `Error ${res.status}: Fallo al actualizar la empresa`);
      }

      toast.success('Empresa actualizada correctamente!', { id: savingToastId });
      router.push(`/dashboard/companies`); // O a la vista de detalle si existiera
      router.refresh();
    } catch (err: any) {
      console.error("Error updating company:", err);
      toast.error(err.message || "Ocurrió un error al guardar la empresa.", { id: savingToastId });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Spinner label="Cargando datos de la empresa..." color="primary" size="lg" />
      </div>
    );
  }

  if (!originalCompany) {
    // Esto se manejaría si el fetch inicial falla y redirige,
    // pero es una salvaguarda si la lógica de useEffect cambia.
    return (
      <div className="container mx-auto p-8 text-center">
        <p className="text-danger-500">No se pudo cargar la información de la empresa.</p>
        <Button as={NextUILink} href="/dashboard/companies" startContent={<ArrowLeftIcon />} className="mt-4">
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
            Editar Empresa: {originalCompany?.legal_name || originalCompany?.trade_name || `ID ${companyId}`}
          </h1>
        </CardHeader>
        <Divider />
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              name="tax_id"
              label="RUT (Tax ID)"
              value={formData.tax_id || ""}
              onChange={handleChange}
              variant="bordered"
              isRequired
              isDisabled={isSaving}
              isInvalid={!!errors?.tax_id?._errors.length}
              errorMessage={errors?.tax_id?._errors.join(", ")}
              description="El RUT de la empresa."
            />
            <Input
              name="legal_name"
              label="Razón Social"
              value={formData.legal_name || ""}
              onChange={handleChange}
              variant="bordered"
              isRequired
              isDisabled={isSaving}
              isInvalid={!!errors?.legal_name?._errors.length}
              errorMessage={errors?.legal_name?._errors.join(", ")}
            />
            <Input
              name="trade_name"
              label="Nombre Fantasía (Opcional)"
              value={formData.trade_name || ""}
              onChange={handleChange}
              variant="bordered"
              isDisabled={isSaving}
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
              isDisabled={isSaving}
              isInvalid={!!errors?.email?._errors.length}
              errorMessage={errors?.email?._errors.join(", ")}
            />
            <Input
              name="phone_number"
              label="Número de Teléfono (Opcional)"
              value={formData.phone_number || ""}
              onChange={handleChange}
              variant="bordered"
              isDisabled={isSaving}
              isInvalid={!!errors?.phone_number?._errors.length}
              errorMessage={errors?.phone_number?._errors.join(", ")}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="flat" onPress={() => router.push("/dashboard/companies")} isDisabled={isSaving} type="button">
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