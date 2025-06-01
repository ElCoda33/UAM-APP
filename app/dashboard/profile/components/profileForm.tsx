// app/dashboard/profile/components/ProfileForm.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { Card, CardHeader, CardBody, Input, Button, Spinner } from "@heroui/react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast"; // La importación es correcta
import { updateProfileSchema } from "@/lib/schema";
import { z } from "zod";

interface ProfileFormProps {
  currentUser: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
}

type FormState = {
  firstName: string;
  lastName: string;
};

type FormErrors = z.ZodFormattedError<FormState> | null;

export default function ProfileForm({ currentUser }: ProfileFormProps) {
  const { data: session, update: updateSession } = useSession();
  const [formData, setFormData] = useState<FormState>({
    firstName: currentUser.firstName || "",
    lastName: currentUser.lastName || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>(null);

  useEffect(() => {
    setFormData({
      firstName: currentUser.firstName || "",
      lastName: currentUser.lastName || "",
    });
  }, [currentUser.firstName, currentUser.lastName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors) {
      setErrors(prevErrors => ({
        ...prevErrors,
        _errors: [],
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors(null);

    const validationResult = updateProfileSchema.safeParse(formData);

    if (!validationResult.success) {
      const formattedErrors = validationResult.error.format();
      setErrors(formattedErrors);
      setIsSubmitting(false);
      toast.error("Por favor, corrige los errores en el formulario.");
      return;
    }

    const dataToSend = validationResult.data;
    const changedData: Partial<FormState> = {};
    if (dataToSend.firstName && dataToSend.firstName !== currentUser.firstName) {
      changedData.firstName = dataToSend.firstName;
    }
    if (dataToSend.lastName && dataToSend.lastName !== currentUser.lastName) {
      changedData.lastName = dataToSend.lastName;
    }

    if (Object.keys(changedData).length === 0) {
      // --- CORRECCIÓN AQUÍ ---
      // Antes: toast.info("No hay cambios para guardar.");
      // Ahora:
      toast("No hay cambios para guardar.", { // Usando la función base toast()
        icon: 'ℹ️' // Opcional: puedes añadir un ícono de información
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changedData),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.message || "Error al actualizar el perfil.");
        if (result.errors) {
          console.error("Errores del backend:", result.errors);
        }
      } else {
        toast.success(result.message || "Perfil actualizado correctamente.");

        const newSessionData: Record<string, string | null> = {};
        if (changedData.firstName) newSessionData.firstName = changedData.firstName;
        if (changedData.lastName) newSessionData.lastName = changedData.lastName;

        const finalFirstName = changedData.firstName || currentUser.firstName || "";
        const finalLastName = changedData.lastName || currentUser.lastName || "";
        newSessionData.name = `${finalFirstName} ${finalLastName}`.trim();

        if (Object.keys(newSessionData).length > 0) {
          await updateSession(newSessionData);
        }
      }
    } catch (error) {
      console.error("Error en handleSubmit ProfileForm:", error);
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-6 shadow-lg">
      <CardHeader>
        <h2 className="text-xl font-semibold text-foreground">Información Personal</h2>
      </CardHeader>
      <CardBody as="form" onSubmit={handleSubmit} className="space-y-4 p-6">
        <Input
          name="firstName"
          label="Nombre(s)"
          value={formData.firstName}
          onChange={handleChange}
          variant="bordered"
          isInvalid={!!errors?.firstName?._errors.length}
          errorMessage={errors?.firstName?._errors.join(", ")}
          isDisabled={isSubmitting}
        />
        <Input
          name="lastName"
          label="Apellido(s)"
          value={formData.lastName}
          onChange={handleChange}
          variant="bordered"
          isInvalid={!!errors?.lastName?._errors.length}
          errorMessage={errors?.lastName?._errors.join(", ")}
          isDisabled={isSubmitting}
        />
        <Input
          label="Email"
          type="email"
          value={currentUser.email || ""}
          variant="bordered"
          isReadOnly
          description="La actualización de email requiere un proceso de verificación separado."
        />
        <Button type="submit" color="primary" isLoading={isSubmitting} isDisabled={isSubmitting} fullWidth>
          {isSubmitting ? <Spinner size="sm" color="white" /> : "Guardar Cambios"}
        </Button>
      </CardBody>
    </Card>
  );
}