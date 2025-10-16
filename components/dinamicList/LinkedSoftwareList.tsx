// app/dashboard/assets/components/LinkedSoftwareList.tsx
"use client";

import React, { useEffect, useState, useCallback } from 'react'; // Añadido useCallback
import {
    Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
    Button, Link as HeroUILink, Tooltip, Spinner
} from "@heroui/react";
import { EyeIcon } from "@/components/icons/EyeIcon";
import { formatLicenseType } from "@/app/dashboard/softwareLicenses/components/softwareLicenseList/utils"; //
import { toast } from 'react-hot-toast'; // Para notificaciones de error si es necesario

// Interfaz para los datos de las licencias vinculadas
// Esta debe coincidir con lo que devuelve tu API: GET /api/assets/[assetId]/software-licenses
export interface AssetLinkedSoftwareLicense {
  software_license_id: number;
  software_name: string;
  software_version: string | null;
  license_key: string | null;
  license_type: string;
  seats: number | null;
  expiry_date: string | null; // Formato YYYY-MM-DD
  installation_date_on_asset: string | null; // Formato YYYY-MM-DD
  assignment_notes: string | null;
}

interface LinkedSoftwareListProps {
  assetId: number | null; // ID del activo para el cual cargar las licencias
}

// Formateador de fecha simple (puedes reemplazarlo con tu utilidad global de lib/utils.ts)
const formatDateSimple = (dateString: string | null | undefined): string => {
    if (!dateString) return "N/A";
    try {
        // Asume que las fechas YYYY-MM-DD son UTC para evitar problemas de zona horaria con new Date()
        const date = new Date(dateString + 'T00:00:00Z');
        return date.toLocaleDateString('es-UY', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' });
    } catch (e) {
        return "Fecha Inválida";
    }
};

const LinkedSoftwareList: React.FC<LinkedSoftwareListProps> = ({ assetId }) => {
  const [licenses, setLicenses] = useState<AssetLinkedSoftwareLicense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) {
      setIsLoading(false);
      // setError("ID de activo no proporcionado para cargar software vinculado."); // Opcional: manejar esto
      setLicenses([]); // Limpiar licencias si no hay assetId
      return;
    }


    const fetchLinkedSoftware = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/assets/${assetId}/software-licenses`);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Error ${response.status} al cargar licencias vinculadas.`);
        }
        const data: AssetLinkedSoftwareLicense[] = await response.json();
        setLicenses(data);
      } catch (err: any) {
        setError(err.message);
        setLicenses([]); // Limpiar en caso de error
        // Opcional: mostrar un toast, pero puede ser mucho si hay varios componentes fallando
        // toast.error(`Error cargando software: ${err.message}`);
        console.error("Error en LinkedSoftwareList fetching software:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLinkedSoftware();
  }, [assetId]); // Se ejecuta cuando assetId cambia

  const softwareColumns = [
    { uid: "software_name", name: "Software" },
    { uid: "license_type", name: "Tipo Lic." },
    { uid: "expiry_date", name: "Vencimiento Lic." },
    { uid: "installation_date_on_asset", name: "Instalado/Asignado el" },
    { uid: "actions", name: "Acciones" },
  ];

  const renderCell = useCallback((item: AssetLinkedSoftwareLicense, columnKey: React.Key) => {
    const cellValue = item[columnKey as keyof AssetLinkedSoftwareLicense];

    switch (columnKey) {
      case "software_name":
        return (
          <div>
            <p className="font-medium">{item.software_name}</p>
            {item.software_version && <p className="text-xs text-default-500">Versión: {item.software_version}</p>}
          </div>
        );
      case "license_type":
        return formatLicenseType(item.license_type);
      case "expiry_date":
        return formatDateSimple(item.expiry_date) || "Perpetua";
      case "installation_date_on_asset":
        return formatDateSimple(item.installation_date_on_asset);
      case "actions":
        return (
          <Tooltip content="Ver detalles de la licencia de software">
            <Button
              as={HeroUILink}
              href={`/dashboard/softwareLicenses/${item.software_license_id}`}
              isIconOnly
              variant="light"
              size="sm"
              aria-label="Ver detalles de la licencia"
            >
              <EyeIcon className="text-lg text-default-500" />
            </Button>
          </Tooltip>
        );
      default:
        return String(cellValue ?? "N/A");
    }
  }, []);


  if (isLoading) {
    return <div className="flex justify-center p-4"><Spinner label="Cargando software vinculado..." size="sm" /></div>;
  }

  if (error) {
    return <p className="text-danger text-center p-4">Error cargando software vinculado: {error}</p>;
  }


  

  return (
    <Table
      aria-label="Tabla de Software Vinculado al Activo"
      selectionMode="none"
      className="min-w-full"
    >
      <TableHeader columns={softwareColumns}>
        {(column) => <TableColumn key={column.uid} className="bg-default-100 text-default-700">{column.name}</TableColumn>}
      </TableHeader>
      <TableBody
        items={licenses}
        emptyContent={"No hay software vinculado a este activo."}
      >
        {(item) => (
          <TableRow key={item.software_license_id}>
            {(columnKey) => <TableCell className="py-2 px-3 text-sm">{renderCell(item, columnKey)}</TableCell>}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

export default LinkedSoftwareList;