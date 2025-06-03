// app/dashboard/users/add/page.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
    Button,
    Card,
    CardHeader,
    CardBody,
    Link as NextUILink,
    Divider
} from "@heroui/react";
// Asumimos que UserForm estará en ../components/UserForm.tsx relativo a esta página
// o ajusta la ruta según donde lo coloques.
// Idealmente, los componentes reutilizables como UserForm estarían en una carpeta 
// como app/dashboard/users/components/UserForm.tsx
import UserForm from "../components/usersForm"; // Nueva ruta al formulario
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import type { UserDetailsFromDB } from "@/lib/data/users"; // Para el tipo de data en onSubmitSuccess

export default function AddUserPage() {
    const router = useRouter();

    const handleAddSuccess = (newUser: UserDetailsFromDB) => {
        // El toast de éxito ya se maneja en el UserForm o en la API.
        router.push('/dashboard/users'); // Redirigir a la lista de usuarios
        router.refresh(); // Opcional: para asegurar que la lista se actualice si se navega hacia atrás
    };

    const handleCancel = () => {
        router.push('/dashboard/users');
    };

    return (
        <div className="container mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
                <Button
                    as={NextUILink}
                    href="/dashboard/users"
                    variant="light"
                    startContent={<ArrowLeftIcon className="mr-1" />}
                >
                    Volver a Lista de Usuarios
                </Button>
            </div>
            <Card className="shadow-xl">
                <CardHeader>
                    <h1 className="text-2xl font-bold text-foreground">
                        Agregar Nuevo Usuario
                    </h1>
                </CardHeader>
                <Divider />
                <CardBody>
                    <UserForm
                        isEditMode={false}
                        onSubmitSuccess={handleAddSuccess}
                        onCancel={handleCancel}
                    />
                </CardBody>
            </Card>
        </div>
    );
}