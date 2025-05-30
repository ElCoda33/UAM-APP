// app/dashboard/profile/components/ProfileForm.tsx
"use client";

import { Card, CardHeader, CardBody, Input, Button } from "@nextui-org/react";

interface ProfileFormProps {
  currentUser: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
}

export default function ProfileForm({ currentUser }: ProfileFormProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <h2 className="text-xl font-semibold">Información Personal</h2>
      </CardHeader>
      <CardBody as="form" className="space-y-4">
        <Input
          label="Nombre(s)"
          defaultValue={currentUser.firstName || ""}
          variant="bordered"
          isReadOnly // Por ahora
        />
        <Input
          label="Apellido(s)"
          defaultValue={currentUser.lastName || ""}
          variant="bordered"
          isReadOnly // Por ahora
        />
        <Input
          label="Email"
          type="email"
          defaultValue={currentUser.email || ""}
          variant="bordered"
          isReadOnly // La edición de email requiere verificación
        />
        <Button color="primary" isDisabled>Guardar Cambios (Pendiente)</Button>
      </CardBody>
    </Card>
  );
}