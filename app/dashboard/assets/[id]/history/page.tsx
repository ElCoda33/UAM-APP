// app/dashboard/assets/[id]/history/page.tsx
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
  Divider
} from "@heroui/react";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon"; //
import AssetMovementsHistoryList from "@/app/dashboard/assets/components/AssetMovementsHistoryList";
import { toast } from "react-hot-toast";

interface AssetBasicDetails {
  id: number;
  product_name: string | null;
  serial_number: string | null;
  inventory_code: string | null;
}

export default function AssetHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const assetId = parseInt(id || "0", 10);

  const [asset, setAsset] = useState<AssetBasicDetails | null>(null);
  const [isLoadingAsset, setIsLoadingAsset] = useState(true);
  const [errorAsset, setErrorAsset] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) {
      setErrorAsset("ID de activo no válido.");
      setIsLoadingAsset(false);
      return;
    }

    const fetchAssetDetails = async () => {
      setIsLoadingAsset(true);
      setErrorAsset(null);
      try {
        const res = await fetch(`/api/assets/${assetId}`); // API para obtener detalles del activo
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Error al cargar detalles del activo: ${res.statusText}`);
        }
        const data: AssetBasicDetails = await res.json();
        setAsset(data);
      } catch (err: any) {
        console.error(`Error fetching asset details (ID ${assetId}) for history page:`, err);
        setErrorAsset(err.message);
        toast.error(err.message || "Error al cargar datos del activo.");
      } finally {
        setIsLoadingAsset(false);
      }
    };

    fetchAssetDetails();
  }, [assetId]);

  if (isLoadingAsset) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Spinner label="Cargando datos del activo..." color="primary" size="lg" />
      </div>
    );
  }

  if (errorAsset || !asset) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-danger-500">Error</h1>
        <p className="mb-6">{errorAsset || `Activo con ID ${assetId} no encontrado.`}</p>
        <Button as={HeroUILink} href="/dashboard/assets" startContent={<ArrowLeftIcon />}>
          Volver a la Lista de Activos
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      {/* ... (Botón de volver y CardHeader como antes) ... */}
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-foreground">
              Historial de Movimientos: {asset.product_name || "N/A"}
            </h1>
            <p className="text-sm text-default-500">
              {asset.serial_number ? `S/N: ${asset.serial_number}` : ''}
              {asset.serial_number && asset.inventory_code ? ' - ' : ''}
              {asset.inventory_code ? `Inv: ${asset.inventory_code}` : ''}
            </p>
          </div>
        </CardHeader>
        <Divider className="my-0" />
        <CardBody>
          {assetId ? (
            <AssetMovementsHistoryList
              assetId={assetId}
              assetName={asset.product_name || asset.serial_number || asset.inventory_code || `ID ${assetId}`}
            />
          ) : (
            <p>ID de activo no especificado.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );

}