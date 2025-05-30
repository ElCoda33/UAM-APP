// app/dashboard/profile/components/AvatarUpload.tsx
"use client";

import { Card, CardHeader, CardBody, Avatar as NextUIAvatar, Button } from "@nextui-org/react";

interface AvatarUploadProps {
  currentAvatarUrl: string | null | undefined;
  userId: string;
}

export default function AvatarUpload({ currentAvatarUrl, userId }: AvatarUploadProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <h2 className="text-xl font-semibold">Foto de Perfil</h2>
      </CardHeader>
      <CardBody className="items-center">
        <NextUIAvatar src={currentAvatarUrl || undefined} className="w-32 h-32 text-large mb-4" />
        <input type="file" className="hidden" id="avatarUploadInput" />
        <Button as="label" htmlFor="avatarUploadInput" color="primary" variant="flat">
          Cambiar Foto
        </Button>
        <p className="text-xs text-default-500 mt-2">Funcionalidad de subida pendiente.</p>
      </CardBody>
    </Card>
  );
}