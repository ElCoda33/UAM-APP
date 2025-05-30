"use client"; // ¡Importante! Declara este archivo como Componente de Cliente

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation"; // useParams para obtener el ID del cliente
import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Link as NextUILink,
  Spinner, // Para el estado de carga
} from "@nextui-org/react";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import { EditIcon } from "@/components/icons/EditIcon";

// Interfaz para los datos del usuario (la misma que definimos para la API)
interface UserDetails {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  status: 'active' | 'disabled' | 'on_vacation' | 'pending_approval' | null;
  national_id: string | null;
  birth_date: string | null; // YYYY-MM-DD
  email_verified_at: string | null; // ISO Timestamp
  created_at: string; // ISO Timestamp
  updated_at: string; // ISO Timestamp
  section_name: string | null;
  roles: string | null; // Comma-separated string of role names
}

const statusColorMap: Record<string, "success" | "danger" | "warning" | "primary" | "default"> = {
  active: "success",
  disabled: "danger",
  on_vacation: "warning",
  pending_approval: "primary",
};

export default function UserProfilePageClient() {
  const params = useParams(); // Hook para acceder a los parámetros de la ruta
  const router = useRouter(); // Para navegación programática si es necesario

  // El ID puede ser un string o un array de strings si es una ruta catch-all.
  // Aquí asumimos que es un solo string.
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [user, setUser] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      // Esto podría pasar si los params no están listos o la ruta es incorrecta
      setError("ID de usuario no proporcionado en la URL.");
      setIsLoading(false);
      return;
    }

    const fetchUserDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/users/${id}`); // Llamada a la API desde el cliente

        if (res.status === 404) {
          // setError("Usuario no encontrado."); // Puedes usar esto o el setUser(null)
          setUser(null); // Establece el usuario a null para mostrar "Usuario no Encontrado"
          // No es necesario lanzar un error aquí si quieres que la UI maneje el estado de "no encontrado"
        } else if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: `Error ${res.status}` }));
          throw new Error(errorData.message || `Fallo al obtener detalles del usuario: ${res.status}`);
        } else {
          const data: UserDetails = await res.json();
          setUser(data);
        }
      } catch (err: any) {
        console.error(`Error fetching user details for ID ${id}:`, err);
        setError(err.message || "Ocurrió un error al cargar los datos del usuario.");
        setUser(null); // Asegúrate de que no haya datos de usuario si hay un error
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDetails();
  }, [id]); // El efecto se re-ejecuta si el 'id' cambia

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]"> {/* Ajusta altura */}
        <Spinner label="Cargando detalles del usuario..." color="primary" labelColor="primary" size="lg" />
      </div>
    );
  }

  if (error && !user) { // Mostrar error solo si no hay datos de usuario (ej. error de red)
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-danger-500">Error</h1>
        <p className="mb-6">{error}</p>
        <Button as={NextUILink} href="/dashboard/users" startContent={<ArrowLeftIcon />}>
          Volver a la Lista
        </Button>
      </div>
    );
  }

  if (!user) { // Esto cubrirá el caso de 404 o si el usuario es null después de un error
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Usuario no Encontrado</h1>
        <p className="mb-6">El usuario con ID {id} no pudo ser encontrado.</p>
        <Button as={NextUILink} href="/dashboard/users" startContent={<ArrowLeftIcon />}>
          Volver a la Lista
        </Button>
      </div>
    );
  }

  // El JSX para mostrar los detalles del usuario es el mismo que antes
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Usuario Sin Nombre";
  const rolesArray = (user.roles || "").split(',').map(r => r.trim()).filter(r => r);

  const detailItem = (label: string, value: string | null | undefined, isChip: boolean = false, chipColor?: "success" | "danger" | "warning" | "primary" | "secondary" | "default") => {
    // ... (la función helper detailItem se mantiene igual que en la respuesta anterior) ...
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === "")) return null;
    return (
      <div>
        <dt className="text-sm font-medium text-default-500">{label}</dt>
        {isChip ? (
          <Chip color={chipColor || "default"} variant="flat" size="sm" className="mt-1 capitalize">
            {value.replace(/_/g, " ")}
          </Chip>
        ) : (
          <dd className="mt-1 text-sm text-foreground">{value}</dd>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Button as={NextUILink} href="/dashboard/users" variant="light" startContent={<ArrowLeftIcon className="mr-1" />}>
          Volver a la Lista de users
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6">
          <Avatar src={user.avatar_url || undefined} name={fullName.charAt(0)} className="w-24 h-24 sm:w-28 sm:h-28 text-large border-2 border-primary" />
          <div className="flex-grow">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{fullName}</h1>
            <p className="text-default-600">{user.email}</p>
            {rolesArray.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {rolesArray.map(role => (
                  <Chip key={role} color="secondary" variant="flat" size="sm">{role}</Chip>
                ))}
              </div>
            )}
          </div>
          <Button
            as={NextUILink}
            href={`/dashboard/users/${user.id}/edit`}
            color="primary"
            variant="flat"
            startContent={<EditIcon />}
          >
            Editar Perfil
          </Button>
        </CardHeader>
        <Divider />
        <CardBody className="p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
            {detailItem("Nombre(s)", user.first_name)}
            {detailItem("Apellido(s)", user.last_name)}
            {detailItem("ID Nacional (CI)", user.national_id)}
            {detailItem("Estado", user.status, true, statusColorMap[user.status || "default"] || "default")}
            {detailItem("Sección", user.section_name)}
            {detailItem("Fecha de Nacimiento", user.birth_date ? new Date(user.birth_date + 'T00:00:00Z').toLocaleDateString() : null)}
            {detailItem("Email Verificado", user.email_verified_at ? `Sí (${new Date(user.email_verified_at).toLocaleDateString()})` : "No")}
            {detailItem("Miembro Desde", user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A')}
            {detailItem("Última Actualización", user.updated_at ? new Date(user.updated_at).toLocaleString() : 'N/A')}
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}