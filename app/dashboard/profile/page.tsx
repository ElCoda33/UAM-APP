"use client"

// app/dashboard/profile/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Ajusta la ruta a tu archivo authOptions
import { redirect } from "next/navigation";
import {
  Avatar as NextUIAvatar,
  Card,
  CardHeader,
  CardBody,
  Divider,
  Chip,
} from "@nextui-org/react";

// Importa los componentes de cliente
import AvatarUpload from "./components/avatarUpload";
import ProfileForm from "./components/profileForm";
import ChangePasswordForm from "./components/changePasswordForm";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  // El middleware ya debería proteger esta ruta, pero una doble verificación no está de más.
  if (!session || !session.user) {
    redirect("/login?callbackUrl=/dashboard/profile");
  }

  const user = session.user; // El tipo de 'user' viene de tu next-auth.d.ts

  // Construir nombre completo
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || "Usuario";

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-center">
          Mi Perfil
        </h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna de Información Básica y Avatar */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardBody className="items-center text-center p-6">
              <NextUIAvatar
                src={user.image || undefined} // URL del avatar
                className="w-32 h-32 md:w-40 md:h-40 text-large mb-4 border-2 border-primary"
                name={fullName.charAt(0)} // Fallback si no hay imagen
              />
              <h2 className="text-2xl font-semibold text-foreground">{fullName}</h2>
              <p className="text-sm text-default-500">{user.email}</p>
              {user.roles && user.roles.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {user.roles.map((role: any) => (
                    <Chip key={role} color="secondary" variant="flat" size="sm">
                      {role}
                    </Chip>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
          <AvatarUpload currentAvatarUrl={user.image} userId={user.id} />
        </div>

        {/* Columna de Formularios de Edición */}
        <div className="md:col-span-2 space-y-6">
          <ProfileForm
            currentUser={{
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
            }}
          />
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}