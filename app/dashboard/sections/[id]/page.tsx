// app/dashboard/sections/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card, CardHeader, CardBody, CardFooter,
  Divider,
  Chip,
  Spinner,
  Button,
  Link as HeroUILink,
  User as HeroUIUser, // Para mostrar usuarios
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell
} from "@heroui/react";
import { toast } from "react-hot-toast";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import { EditIcon } from "@/components/icons/EditIcon";
import type { SectionRecord } from "@/app/api/sections/route"; // Desde el endpoint principal de secciones
import type { SectionUserRecord } from "@/app/api/sections/[id]/users/route";
import type { SubSectionRecord } from "@/app/api/sections/[id]/subsections/route";

const DetailItem = ({ label, value }: { label: string; value: string | number | null | undefined }) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  return (
    <div>
      <dt className="text-sm font-medium text-default-500">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{String(value)}</dd>
    </div>
  );
};

const userListColumns = [
  { uid: "name", name: "Nombre Completo" },
  { uid: "email", name: "Email" },
  // Podrías añadir "Roles" si lo incluyes en SectionUserRecord
];

const subSectionListColumns = [
  { uid: "name", name: "Nombre Subsección" },
  { uid: "management_level", name: "Nivel" },
  { uid: "email", name: "Email" },
  { uid: "actions", name: "Ver" },
];


export default function SectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const sectionId = parseInt(id || "0", 10);

  const [section, setSection] = useState<SectionRecord | null>(null);
  const [users, setUsers] = useState<SectionUserRecord[]>([]);
  const [subsections, setSubsections] = useState<SubSectionRecord[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sectionId) {
      setError("ID de sección no válido.");
      setIsLoading(false);
      return;
    }

    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [sectionRes, usersRes, subsectionsRes] = await Promise.all([
          fetch(`/api/sections/${sectionId}`),
          fetch(`/api/sections/${sectionId}/users`),
          fetch(`/api/sections/${sectionId}/subsections`),
        ]);

        if (!sectionRes.ok) {
          const errData = await sectionRes.json().catch(() => ({}));
          throw new Error(errData.message || `Error al cargar datos de la sección: ${sectionRes.statusText}`);
        }
        setSection(await sectionRes.json());

        if (!usersRes.ok) {
          console.warn(`Advertencia al cargar usuarios de la sección ${sectionId}: ${usersRes.statusText}`);
          // No lanzar error fatal, podría no haber usuarios
        } else {
          setUsers(await usersRes.json());
        }


        if (!subsectionsRes.ok) {
          console.warn(`Advertencia al cargar subsecciones para ${sectionId}: ${subsectionsRes.statusText}`);
          // No lanzar error fatal, podría no haber subsecciones
        } else {
          setSubsections(await subsectionsRes.json());
        }

      } catch (err: any) {
        setError(err.message);
        toast.error(err.message || "No se pudieron cargar todos los datos.");
        console.error("Error fetching section details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [sectionId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Spinner label="Cargando detalles de la sección..." color="primary" size="lg" />
      </div>
    );
  }

  if (error || !section) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-danger-500">Error</h1>
        <p className="mb-6">{error || `Sección con ID ${sectionId} no encontrada.`}</p>
        <Button as={HeroUILink} href="/dashboard/sections" startContent={<ArrowLeftIcon />}>
          Volver a la Lista de Secciones
        </Button>
      </div>
    );
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString('es-UY', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Montevideo' });
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <Button as={HeroUILink} href="/dashboard/sections" variant="light" startContent={<ArrowLeftIcon />}>
          Volver a Secciones
        </Button>
        <Button as={HeroUILink} color="primary" href={`/dashboard/sections/${section.id}/edit`} startContent={<EditIcon />}>
          Editar Sección
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{section.name}</h1>
        </CardHeader>
        <Divider />
        <CardBody>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <DetailItem label="ID" value={section.id} />
            <DetailItem label="Nivel de Conducción" value={section.management_level} />
            <DetailItem label="Email de Contacto" value={section.email} />
            <DetailItem label="Dependencia (Sección Padre)" value={section.parent_section_name || "Ninguna (Nivel Superior)"} />
            <DetailItem label="Fecha de Creación" value={formatDate(section.created_at)} />
            <DetailItem label="Última Actualización" value={formatDate(section.updated_at)} />
          </dl>
        </CardBody>
      </Card>

      {/* Usuarios en esta Sección */}
      <Card className="shadow-lg">
        <CardHeader>
          <h2 className="text-xl font-semibold text-foreground">Usuarios en esta Sección</h2>
        </CardHeader>
        <Divider />
        <CardBody>
          {users.length > 0 ? (
            <Table aria-label="Usuarios de la sección" removeWrapper>
              <TableHeader columns={userListColumns}>
                {(column) => <TableColumn key={column.uid}>{column.name}</TableColumn>}
              </TableHeader>
              <TableBody items={users} emptyContent={"No hay usuarios en esta sección."}>
                {(item) => (
                  <TableRow key={item.user_id}>
                    {(columnKey) => {
                      const cellValue = item[columnKey as keyof SectionUserRecord];
                      if (columnKey === "name") {
                        return <TableCell>
                          <HeroUIUser
                            name={`${item.first_name || ''} ${item.last_name || ''}`.trim()}
                            description={item.email || ''}
                            avatarProps={{ src: item.avatar_url || undefined, size: "sm" }}
                          />
                        </TableCell>;
                      }
                      return <TableCell>{cellValue != null ? String(cellValue) : "N/A"}</TableCell>;
                    }}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <p className="text-default-500">No hay usuarios asignados directamente a esta sección.</p>
          )}
        </CardBody>
      </Card>

      {/* Sub-Secciones */}
      <Card className="shadow-lg">
        <CardHeader>
          <h2 className="text-xl font-semibold text-foreground">Sub-Secciones (Dependen de esta)</h2>
        </CardHeader>
        <Divider />
        <CardBody>
          {subsections.length > 0 ? (
            <Table aria-label="Sub-secciones" removeWrapper>
              <TableHeader columns={subSectionListColumns}>
                {(column) => <TableColumn key={column.uid}>{column.name}</TableColumn>}
              </TableHeader>
              <TableBody items={subsections} emptyContent={"Esta sección no tiene sub-secciones directas."}>
                {(item) => (
                  <TableRow key={item.id}>
                    {(columnKey) => {
                      const cellValue = item[columnKey as keyof SubSectionRecord];
                      if (columnKey === "actions") {
                        return <TableCell>
                          <Button size="sm" variant="light" as={HeroUILink} href={`/dashboard/sections/${item.id}`}>
                            Ver
                          </Button>
                        </TableCell>;
                      }
                      return <TableCell>{cellValue != null ? String(cellValue) : "N/A"}</TableCell>;
                    }}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <p className="text-default-500">Esta sección no tiene sub-secciones directas.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}