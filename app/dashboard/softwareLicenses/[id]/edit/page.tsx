// app/dashboard/softwareLicenses/[id]/edit/page.tsx
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
import SoftwareLicenseForm from "../../components/SoftwareLicenseForm"; // Ajusta la ruta si es necesario
import type { SoftwareLicenseAPIRecord } from "@/app/api/softwareLicenses/route";
import type { SoftwareLicenseFormData } from "../../components/SoftwareLicenseForm"; // Tipo del estado del formulario

// Helper para convertir YYYY-MM-DD string a DateValue, si no lo importas del form.
// Lo ideal es que esta lógica esté centralizada o en el propio form para la inicialización.
import { parseDate, CalendarDate, DateValue } from "@internationalized/date";

const stringToDateValueHelper = (dateString: string | null | undefined): DateValue | null => {
    if (!dateString) return null;
    try {
        const [year, month, day] = dateString.split('-').map(Number);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            return new CalendarDate(year, month, day);
        }
        return parseDate(dateString);
    } catch (e) {
        console.warn("Helper: Error parsing date string for DatePicker:", dateString, e);
        return null;
    }
};


export default function EditSoftwareLicensePage() {
    const params = useParams();
    const router = useRouter();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const licenseId = parseInt(id || "0", 10);

    const [initialLicenseData, setInitialLicenseData] = useState<Partial<SoftwareLicenseFormData> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [licenseName, setLicenseName] = useState<string>("");


    useEffect(() => {
        if (!licenseId) {
            setError("ID de licencia no válido.");
            setIsLoading(false);
            toast.error("ID de licencia no válido.");
            router.push("/dashboard/softwareLicenses");
            return;
        }

        const fetchLicenseData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/softwareLicenses/${licenseId}`);
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.message || `Error al cargar datos de la licencia (ID: ${licenseId})`);
                }
                const data: SoftwareLicenseAPIRecord = await response.json();
                
                setLicenseName(data.software_name || `ID ${data.id}`);
                // Transformar datos de API a datos de formulario (especialmente fechas)
                setInitialLicenseData({
                    asset_id: data.asset_id,
                    software_name: data.software_name,
                    software_version: data.software_version,
                    license_key: data.license_key,
                    license_type: data.license_type as SoftwareLicenseFormData['license_type'],
                    seats: data.seats,
                    purchase_date_value: stringToDateValueHelper(data.purchase_date),
                    purchase_cost: data.purchase_cost,
                    expiry_date_value: stringToDateValueHelper(data.expiry_date),
                    supplier_company_id: data.supplier_company_id,
                    invoice_number: data.invoice_number,
                    assigned_to_user_id: data.assigned_to_user_id,
                    notes: data.notes,
                });
            } catch (err: any) {
                setError(err.message);
                toast.error(err.message || "No se pudieron cargar los datos de la licencia.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchLicenseData();
    }, [licenseId, router]);

    const handleEditSuccess = (updatedLicense: SoftwareLicenseAPIRecord) => {
        // El toast de éxito ya se maneja en el formulario o en la API.
        router.push('/dashboard/softwareLicenses');
        router.refresh();
    };

    const handleCancel = () => {
        router.push('/dashboard/softwareLicenses');
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-100px)]">
                <Spinner label="Cargando datos de la licencia..." color="primary" size="lg" />
            </div>
        );
    }

    if (error || !initialLicenseData) {
        return (
            <div className="container mx-auto p-8 text-center">
                <h1 className="text-2xl font-bold mb-4 text-danger-500">Error</h1>
                <p className="mb-6">{error || "No se encontró la licencia o no se pudieron cargar los datos."}</p>
                <Button as={NextUILink} href="/dashboard/softwareLicenses" startContent={<ArrowLeftIcon />}>
                    Volver a Lista de Licencias
                </Button>
            </div>
        );
    }

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
                        Editar Licencia de Software: {licenseName}
                    </h1>
                </CardHeader>
                <Divider />
                <CardBody>
                    <SoftwareLicenseForm
                        isEditMode={true}
                        licenseId={licenseId}
                        initialData={initialLicenseData}
                        onSubmitSuccess={handleEditSuccess}
                        onCancel={handleCancel}
                    />
                </CardBody>
            </Card>
        </div>
    );
}