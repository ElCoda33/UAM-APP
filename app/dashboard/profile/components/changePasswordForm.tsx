// app/dashboard/profile/components/ChangePasswordForm.tsx
"use client";

import { Card, CardHeader, CardBody, Input, Button } from "@nextui-org/react";

export default function ChangePasswordForm() {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-xl font-semibold">Cambiar Contraseña</h2>
      </CardHeader>
      <CardBody as="form" className="space-y-4">
        <Input type="password" label="Contraseña Actual" variant="bordered" isReadOnly />
        <Input type="password" label="Nueva Contraseña" variant="bordered" isReadOnly />
        <Input type="password" label="Confirmar Nueva Contraseña" variant="bordered" isReadOnly />
        <Button color="secondary" isDisabled>Cambiar Contraseña (Pendiente)</Button>
      </CardBody>
    </Card>
  );
}