// app/dashboard/softwareLicenses/add/page.tsx
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
import { toast } from "react-hot-toast";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import SoftwareLicenseForm from "../components/SoftwareLicenseForm"; // Asumiendo que el form está en ../components/
import type { SoftwareLicenseAPIRecord } from "@/app/api/softwareLicenses/route"; // Tipo desde la API

export default function AddSoftwareLicensePage() {
    const router = useRouter();

    const handleAddSuccess = (newLicense: SoftwareLicenseAPIRecord) => {
        // El toast de éxito ya se maneja en el formulario o en la API.
        // Aquí podrías añadir un toast adicional si quieres.
        // toast.success(`Licencia "${newLicense.software_name}" agregada con ID: ${newLicense.id}`);
        router.push('/dashboard/softwareLicenses');
        router.refresh(); // Para asegurar que la lista se actualice si el usuario navega hacia atrás.
    };

    const handleCancel = () => {
        router.push('/dashboard/softwareLicenses');
    };

    return (
        <div className="container mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
                <Button
                    as={NextUILink}
                    href="/dashboard/softwareLicenses"
                    variant="light"
                    startContent={<ArrowLeftIcon className="mr-1" />}
                >
                    Volver a Lista de Licencias
                </Button>
            </div>
            <Card className="shadow-xl">
                <CardHeader>
                    <h1 className="text-2xl font-bold text-foreground">
                        Agregar Nueva Licencia de Software
                    </h1>
                </CardHeader>
                <Divider />
                <CardBody>
                    <SoftwareLicenseForm
                        isEditMode={false}
                        onSubmitSuccess={handleAddSuccess}
                        onCancel={handleCancel}
                    />
                </CardBody>
            </Card>
        </div>
    );
}