// app/dashboard/profile/components/ChangePasswordForm.tsx
"use client";

import { useState, FormEvent } from "react";
import { Card, CardHeader, CardBody, Input, Button, Spinner } from "@heroui/react";
import { toast } from "react-hot-toast";
import { changePasswordSchema } from "@/lib/schema";
import { z } from "zod";

type PasswordFormState = z.infer<typeof changePasswordSchema>;
type FormattedZodErrors = {
  _errors: string[];
} & {
  [key in keyof PasswordFormState]?: { _errors: string[] };
};

export default function ChangePasswordForm() {
  const [formData, setFormData] = useState<PasswordFormState>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormattedZodErrors | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value as string }));
    if (errors) {
      setErrors(prevErrors => {
        if (!prevErrors) return null;
        const newFieldErrors = { ...prevErrors };
        if (name in newFieldErrors) {
          delete newFieldErrors[name as keyof PasswordFormState];
        }
        return newFieldErrors;
      });
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors(null);

    const validationResult = changePasswordSchema.safeParse(formData);

    if (!validationResult.success) {
      setErrors(validationResult.error.format());
      setIsSubmitting(false);
      toast.error("Por favor, corrige los errores en el formulario.");
      return;
    }

    // ANTES: const { currentPassword, newPassword } = validationResult.data;
    // AHORA: validationResult.data contiene currentPassword, newPassword y confirmPassword
    const dataToSend = validationResult.data;

    try {
      const response = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // --- MODIFICACIÓN AQUÍ ---
        // Antes: body: JSON.stringify({ currentPassword, newPassword }),
        // Ahora: Enviar el objeto completo validado por Zod en el cliente,
        // que incluye currentPassword, newPassword, y confirmPassword.
        // La API del servidor espera confirmPassword para su propia validación.
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.message || "Error al cambiar la contraseña.");

        if (result.errors && typeof result.errors === 'object') {
          const serverFieldErrors = result.errors as Record<string, string[]>;
          const clientCompatibleErrors: FormattedZodErrors = { _errors: [] };
          let hasSpecificErrors = false;
          for (const field in serverFieldErrors) {
            if (Object.prototype.hasOwnProperty.call(serverFieldErrors, field) &&
              Array.isArray(serverFieldErrors[field])) {
              clientCompatibleErrors[field as keyof PasswordFormState] = { _errors: serverFieldErrors[field] };
              hasSpecificErrors = true;
            }
          }
          if (hasSpecificErrors) {
            setErrors(clientCompatibleErrors);
          }
        } else if (result.message && !result.errors) {
          if (result.message.toLowerCase().includes("contraseña actual")) {
            setErrors({ currentPassword: { _errors: [result.message] }, _errors: [] });
          } else {
            setErrors({ _errors: [result.message] });
          }
        }
      } else {
        toast.success(result.message || "Contraseña actualizada correctamente.");
        setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch (error) {
      console.error("Error en handleSubmit ChangePasswordForm:", error);
      toast.error("No se pudo conectar con el servidor o procesar la respuesta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <h2 className="text-xl font-semibold text-foreground">Cambiar Contraseña</h2>
      </CardHeader>
      <CardBody as="form" onSubmit={handleSubmit} className="space-y-4 p-6">
        <Input
          name="currentPassword"
          type="password"
          label="Contraseña Actual"
          value={formData.currentPassword}
          onChange={handleChange}
          variant="bordered"
          isInvalid={!!errors?.currentPassword?._errors.length}
          errorMessage={errors?.currentPassword?._errors.join(", ")}
          isDisabled={isSubmitting}
          isRequired
        />
        <Input
          name="newPassword"
          type="password"
          label="Nueva Contraseña"
          value={formData.newPassword}
          onChange={handleChange}
          variant="bordered"
          isInvalid={!!errors?.newPassword?._errors.length}
          errorMessage={errors?.newPassword?._errors.join(", ")}
          isDisabled={isSubmitting}
          isRequired
        />
        <Input
          name="confirmPassword"
          type="password"
          label="Confirmar Nueva Contraseña"
          value={formData.confirmPassword}
          onChange={handleChange}
          variant="bordered"
          isInvalid={!!errors?.confirmPassword?._errors.length}
          errorMessage={errors?.confirmPassword?._errors.join(", ")}
          isDisabled={isSubmitting}
          isRequired
        />
        {errors?._errors && errors._errors.length > 0 && (
          <div className="text-danger text-tiny p-1 rounded-medium bg-danger-50">
            {errors._errors.join(", ")}
          </div>
        )}
        <Button type="submit" color="secondary" isLoading={isSubmitting} isDisabled={isSubmitting} fullWidth>
          Cambiar Contraseña
        </Button>
      </CardBody>
    </Card>
  );
}