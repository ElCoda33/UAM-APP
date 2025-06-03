// app/dashboard/users/[id]/edit/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
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
import UserForm, { UserFormData } from "../../components/usersForm"; // Ajusta la ruta si UserForm está en otro lugar
import type { UserDetailsFromDB } from "@/lib/data/users";
 // Tipo del estado del formulario UserForm

// Helper para convertir YYYY-MM-DD string a DateValue, si no lo importas del form.
import { parseDate, CalendarDate, DateValue } from "@internationalized/date";

const stringToDateValueHelper = (dateString: string | null | undefined): DateValue | null => {
  if (!dateString) return null;
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new CalendarDate(year, month, day);
    }
    return parseDate(dateString);
  } catch (e) {
    console.warn("EditUserPage: Error parsing date string for DatePicker:", dateString, e);
    return null;
  }
};

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const userId = id; // userId es string en el form

  const [initialUserData, setInitialUserData] = useState<Partial<UserFormData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");


  useEffect(() => {
    if (!userId) {
      setError("ID de usuario no válido.");
      setIsLoading(false);
      toast.error("ID de usuario no válido.");
      router.push("/dashboard/users");
      return;
    }

    const fetchUserData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Error al cargar datos del usuario (ID: ${userId})`);
        }
        const data: UserDetailsFromDB = await response.json(); // UserDetailsFromDB tiene role_ids como string y roles como string

        setUserName(`${data.first_name || ""} ${data.last_name || ""}`.trim() || data.email || `ID ${data.id}`);

        // Transformar datos de API a datos de UserFormData
        // UserFormData espera role_ids_set como Set<string>
        const roleIdsArray = data.role_ids ? data.role_ids.split(',').map(idStr => idStr.trim()).filter(Boolean) : [];

        setInitialUserData({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          national_id: data.national_id,
          status: data.status,
          birth_date_value: stringToDateValueHelper(data.birth_date), // Convertir string a DateValue
          section_id: data.section_id,
          avatar_url: data.avatar_url,
          role_ids_set: new Set(roleIdsArray), // Convertir string de IDs a Set de strings
          // No se pasa password ni confirmPassword para edición
        });
      } catch (err: any) {
        setError(err.message);
        toast.error(err.message || "No se pudieron cargar los datos del usuario.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, [userId, router]);

  const handleEditSuccess = (updatedUser: UserDetailsFromDB) => {
    router.push('/dashboard/users'); // O a la página de detalles: /dashboard/users/${userId}
    router.refresh();
  };

  const handleCancel = () => {
    router.push('/dashboard/users');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Spinner label="Cargando datos del usuario..." color="primary" size="lg" />
      </div>
    );
  }

  if (error || !initialUserData) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-danger-500">Error</h1>
        <p className="mb-6">{error || "No se encontró el usuario o no se pudieron cargar los datos."}</p>
        <Button as={NextUILink} href="/dashboard/users" startContent={<ArrowLeftIcon />}>
          Volver a Lista de Usuarios
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Button
          as={NextUILink}
          href="/dashboard/users" // Podría ser a /dashboard/users/[id] si existiera una página de detalles
          variant="light"
          startContent={<ArrowLeftIcon className="mr-1" />}
        >
          Volver a Lista de Usuarios
        </Button>
      </div>
      <Card className="shadow-xl">
        <CardHeader>
          <h1 className="text-2xl font-bold text-foreground">
            Editar Usuario: {userName}
          </h1>
        </CardHeader>
        <Divider />
        <CardBody>
          <UserForm
            isEditMode={true}
            userId={String(userId)} // UserForm espera string | number
            initialData={initialUserData}
            onSubmitSuccess={handleEditSuccess}
            onCancel={handleCancel}
          />
        </CardBody>
      </Card>
    </div>
  );
}