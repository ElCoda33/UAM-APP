// app/dashboard/assets/[id]/move/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Link as HeroUILink,
} from "@heroui/react";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
// Importa el nuevo formulario:
import MovementForm from "@/app/dashboard/assets/components/MovementForm";
import { toast } from "react-hot-toast";

interface AssetDetails {
  id: number;
  product_name: string | null;
  serial_number: string | null;
  inventory_code: string | null;
}

export default function MoveAssetPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [asset, setAsset] = useState<AssetDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("ID de activo no válido.");
      setIsLoading(false);
      return;
    }

    const fetchAssetDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/assets/${id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Activo no encontrado.");
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `Error al cargar detalles: ${res.statusText}`);
        }
        const data: AssetDetails = await res.json();
        setAsset(data);
      } catch (err: any) {
        console.error(`Error fetching asset (ID ${id}) for move page:`, err);
        setError(err.message);
        // No mostramos toast aquí, el error se muestra en la UI de la página.
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssetDetails();
  }, [id]);

  const handleMoveSuccess = () => {
    // La notificación de éxito ya la maneja el MovementForm.
    // Aquí solo redirigimos.
    router.push("/dashboard/assets");
    router.refresh();
  };

  const handleCancelMove = () => {
    router.back(); // O a /dashboard/assets
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Spinner label="Cargando datos del activo..." color="primary" size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-danger-500">Error</h1>
        <p className="mb-6">{error}</p>
        <Button as={HeroUILink} href="/dashboard/assets" startContent={<ArrowLeftIcon />}>
          Volver a la Lista de Activos
        </Button>
      </div>
    );
  }

  if (!asset) {
    // Esto podría pasar si el fetch inicial falla sin un error explícito o si id es inválido inicialmente.
    // O si el fetch devuelve 404 y setError no fue llamado.
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Activo no Encontrado</h1>
        <p className="mb-6">El activo con ID {id} no pudo ser encontrado o los datos no están disponibles.</p>
        <Button as={HeroUILink} href="/dashboard/assets" startContent={<ArrowLeftIcon />}>
          Volver a la Lista de Activos
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Button
          as={HeroUILink}
          href="/dashboard/assets"
          variant="light"
          startContent={<ArrowLeftIcon className="mr-1" />}
        >
          Volver a Lista de Activos
        </Button>
      </div>
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-foreground">
              Mover Activo: {asset.product_name || "N/A"}
            </h1>
            {(asset.serial_number || asset.inventory_code) && (
              <p className="text-sm text-default-500">
                {asset.serial_number ? `S/N: ${asset.serial_number}` : ''}
                {asset.serial_number && asset.inventory_code ? ' - ' : ''}
                {asset.inventory_code ? `Inv: ${asset.inventory_code}` : ''}
              </p>
            )}
          </div>
        </CardHeader>
        <CardBody>
          <MovementForm
            asset={asset}
            onMoveSuccess={handleMoveSuccess}
            onCancel={handleCancelMove}
          />
        </CardBody>
      </Card>
    </div>
  );
}