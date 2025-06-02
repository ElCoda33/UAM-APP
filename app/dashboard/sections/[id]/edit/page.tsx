// app/dashboard/sections/[id]/edit/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardBody,
  Spinner,
  Button,
  Link as HeroUILink,
  Divider
} from "@heroui/react";
import { toast } from "react-hot-toast";
import SectionForm from "@/app/dashboard/sections/components/sectionForm";
import type { SectionRecord } from "@/app/api/sections/route";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";

export default function EditSectionPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const sectionId = parseInt(id || "0", 10);

  const [sectionData, setSectionData] = useState<SectionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sectionId) {
      setError("ID de sección no válido.");
      setIsLoading(false);
      return;
    }

    const fetchSectionData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/sections/${sectionId}`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || "Error al cargar datos de la sección");
        }
        const data: SectionRecord = await response.json();
        setSectionData(data);
      } catch (err: any) {
        setError(err.message);
        toast.error(err.message || "No se pudieron cargar los datos de la sección.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSectionData();
  }, [sectionId]);

  const handleSuccess = (updatedSection: SectionRecord) => {
    // Podrías redirigir a la lista o a una página de detalles de la sección
    router.push("/dashboard/sections");
    // Opcional: forzar un refresh de datos en la página de lista si es necesario,
    // aunque si la lista se recarga al montar, esto podría ser suficiente.
    // router.refresh(); 
  };

  const handleCancel = () => {
    router.back(); // O router.push("/dashboard/sections");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Spinner label="Cargando datos de la sección..." color="primary" size="lg" />
      </div>
    );
  }

  if (error || !sectionData) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-danger-500">Error</h1>
        <p className="mb-6">{error || "No se encontró la sección o no se pudieron cargar los datos."}</p>
        <Button as={HeroUILink} href="/dashboard/sections" startContent={<ArrowLeftIcon />}>
          Volver a la Lista de Secciones
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Button
          as={HeroUILink}
          href="/dashboard/sections"
          variant="light"
          startContent={<ArrowLeftIcon className="mr-1" />}
        >
          Volver a la Lista de Secciones
        </Button>
      </div>
      <Card className="shadow-xl">
        <CardHeader>
          <h1 className="text-2xl font-bold text-foreground">
            Editar Sección: {sectionData?.name || `ID ${sectionId}`}
          </h1>
        </CardHeader>
        <Divider />
        <CardBody>
          <SectionForm
            initialData={sectionData}
            isEditMode={true}
            sectionId={sectionId}
            onSubmitSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardBody>
      </Card>
    </div>
  );
}