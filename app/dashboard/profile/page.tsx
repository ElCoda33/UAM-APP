"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Avatar as NextUIAvatar,
  Card,
  CardHeader,
  CardBody,
  Divider,
  Chip,
  Spinner,
  Button,
} from "@nextui-org/react";

import AvatarUpload from "./components/avatarUpload"; // Asegúrate que la ruta sea correcta
import ProfileForm from "./components/profileForm";   // Stub
import ChangePasswordForm from "./components/changePasswordForm"; // Stub

const statusColorMap: Record<string, "success" | "danger" | "warning" | "primary" | "default"> = {
  active: "success",
  disabled: "danger",
  on_vacation: "warning",
  pending_approval: "primary",
};

export default function ProfilePageClient() {
  const { data: session, status } = useSession(); // No necesitamos `updateSession` aquí, AvatarUpload lo maneja
  const router = useRouter();

  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/dashboard/profile");
    }
    // Sincronizar el avatar local con el de la sesión cuando la sesión cambie
    if (session?.user?.image !== currentUserAvatar) {
      setCurrentUserAvatar(session?.user?.image);
    }
  }, [status, router, session?.user?.image, currentUserAvatar]); // Añadir currentUserAvatar a dependencias

  if (status === "loading" || (status === "authenticated" && !session?.user)) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Spinner label="Cargando perfil..." color="primary" labelColor="primary" size="lg" />
      </div>
    );
  }

  // Este caso es si status es "unauthenticated" y el redirect del useEffect aún no ha ocurrido
  if (!session?.user) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <p>Redirigiendo a login...</p>
        <Spinner />
      </div>
    )
  }

  const user = session.user;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.name || "Usuario";

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    // El componente AvatarUpload ya actualizó la sesión de NextAuth.
    // Aquí actualizamos el estado local para que la <NextUIAvatar> en *esta* página refleje el cambio inmediatamente.
    setCurrentUserAvatar(newAvatarUrl);
    console.log("Avatar actualizado en ProfilePageClient y reflejado en UI local:", newAvatarUrl);
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-center">
          Mi Perfil
        </h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardBody className="items-center text-center p-6">
              <NextUIAvatar
                src={currentUserAvatar || undefined} // Usa el estado local del avatar
                name={fullName.charAt(0) || undefined}
                className="w-32 h-32 md:w-40 md:h-40 text-large mb-4 border-2 border-primary"
              />
              <h2 className="text-2xl font-semibold text-foreground">{fullName}</h2>
              <p className="text-sm text-default-500">{user.email}</p>

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
            </CardBody>
          </Card>

          <AvatarUpload
            userId={user.id}
            currentAvatarUrl={currentUserAvatar} // Pasa el estado local
            onUploadSuccess={handleAvatarUpdate}
          />
        </div>

        <div className="md:col-span-2 space-y-6">
          <ProfileForm
            currentUser={{
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
            }}
          />
          <Divider className="my-6" />
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}