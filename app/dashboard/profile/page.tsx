// app/dashboard/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardBody,
  Divider,
  Chip,
  Spinner,
  Button,
  // NextUIAvatar ya no se usará directamente aquí, AvatarUpload lo maneja
} from "@heroui/react";

import AvatarUpload from "./components/avatarUpload";
import ProfileForm from "./components/profileForm";
import ChangePasswordForm from "./components/changePasswordForm";

const statusColorMap: Record<string, "success" | "danger" | "warning" | "primary" | "default"> = {
  active: "success",
  disabled: "danger",
  on_vacation: "warning",
  pending_approval: "primary",
};

export default function ProfilePageClient() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Este estado local es para asegurar que AvatarUpload recibe la URL más actualizada,
  // especialmente después de una subida exitosa para un feedback inmediato.
  const [currentAvatarForUpload, setCurrentAvatarForUpload] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/dashboard/profile");
    }
    // Sincronizar el avatar para AvatarUpload cuando la sesión cambie o se cargue inicialmente.
    if (status === "authenticated" && session?.user?.image !== currentAvatarForUpload) {
      setCurrentAvatarForUpload(session?.user?.image);
    }
  }, [status, router, session?.user?.image, currentAvatarForUpload]);

  if (status === "loading" || (status === "authenticated" && !session?.user)) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Spinner label="Cargando perfil..." color="primary" labelColor="primary" size="lg" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <p>Redirigiendo a login...</p>
        <Spinner />
      </div>
    );
  }

  const user = session.user;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.name || "Usuario";

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    // Actualiza el estado que se pasa a AvatarUpload para que refleje el cambio.
    // La sesión ya fue actualizada por el propio componente AvatarUpload.
    setCurrentAvatarForUpload(newAvatarUrl);
    console.log("PROFILE_PAGE: Avatar localmente actualizado para AvatarUpload:", newAvatarUrl);
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-center">
          Mi Perfil
        </h1>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {/* Columna Izquierda: Perfil y Actualización de Avatar Integrados */}
        <div className="md:col-span-1 space-y-6">
          <Card className="shadow-lg">
            <CardBody className="items-center text-center p-6 space-y-4">
              {/* AvatarUpload ahora es el responsable principal de mostrar el avatar y los controles */}
              <AvatarUpload
                userId={user.id}
                currentAvatarUrl={currentAvatarForUpload} // Usa el estado local sincronizado
                onUploadSuccess={handleAvatarUpdate}
              />

              <div className="w-full"> {/* Contenedor para el texto del perfil */}
                <h2 className="text-2xl font-semibold text-foreground mt-2">{fullName}</h2>
                <p className="text-sm text-default-500 break-all">{user.email}</p>

                {user.roles && user.roles.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {user.roles.map((role) => (
                      <Chip key={role} color="secondary" variant="flat" size="sm" className="capitalize">
                        {role}
                      </Chip>
                    ))}
                  </div>
                )}

                {(user as any).status && (
                  <div className="mt-3">
                    <Chip
                      color={statusColorMap[(user as any).status] || "default"}
                      variant="flat"
                      size="sm"
                      className="capitalize"
                    >
                      Estado: {(user as any).status.replace(/_/g, " ")}
                    </Chip>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Columna Derecha: Formularios de Información y Contraseña */}
        <div className="md:col-span-2 space-y-6">
          <ProfileForm
            currentUser={{
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
            }}
          />
          <Divider className="my-3" /> {/* Un divisor más sutil */}
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}