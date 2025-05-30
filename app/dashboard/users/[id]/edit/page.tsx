"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Input,
  Button,
  Card,
  CardHeader,
  CardBody,
  Select,
  SelectItem,
  Spinner,
  Link as NextUILink,
  Textarea, // Opcional para avatar_url si quieres un campo más grande
} from "@nextui-org/react";
import { toast } from "react-hot-toast";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";

// Interfaz para los datos del usuario que esperamos de GET /api/users/[id]
interface UserData {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  status: 'active' | 'disabled' | 'on_vacation' | 'pending_approval' | null;
  national_id: string | null;
  birth_date: string | null; // YYYY-MM-DD
  section_id: number | null;
  role_ids: string | null; // Comma-separated string of role IDs
  // No necesitamos todos los campos para el formulario, solo los editables
}

interface Section {
  id: number;
  name: string;
}

interface Role {
  id: number;
  name: string;
}

// Definimos un tipo para el estado del formulario
type FormState = Omit<UserData, 'id' | 'role_ids'> & { // Quitamos id y manejamos role_ids como Set<string>
  role_ids_set: Set<string>; // Para el Select múltiple de NextUI
};


export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [formData, setFormData] = useState<Partial<FormState>>({
    role_ids_set: new Set(), // Inicializar role_ids_set como un Set vacío
  });
  const [originalUser, setOriginalUser] = useState<UserData | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("ID de usuario no válido.");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [userRes, sectionsRes, rolesRes] = await Promise.all([
          fetch(`/api/users/${id}`),
          fetch('/api/sections'),
          fetch('/api/roles'),
        ]);

        if (!userRes.ok) throw new Error(`Error al cargar usuario: ${userRes.statusText}`);
        const userData: UserData = await userRes.json();
        setOriginalUser(userData); // Guardar datos originales para comparar o resetear
        setFormData({ // Inicializar formulario
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          email: userData.email || "",
          national_id: userData.national_id || "",
          status: userData.status || "active",
          birth_date: userData.birth_date || "",
          section_id: userData.section_id || null,
          avatar_url: userData.avatar_url || "",
          role_ids_set: new Set((userData.role_ids || "").split(',').filter(Boolean).map(String)),
        });

        if (!sectionsRes.ok) throw new Error('Error al cargar secciones');
        setSections(await sectionsRes.json());

        if (!rolesRes.ok) throw new Error('Error al cargar roles');
        setRoles(await rolesRes.json());

      } catch (err: any) {
        console.error("Error fetching data for edit page:", err);
        setError(err.message || "Ocurrió un error al cargar datos.");
        toast.error(err.message || "Ocurrió un error al cargar datos.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, keys: Set<string> | string) => {
    // Para Select múltiple (roles), 'keys' es un Set. Para Select simple (sección), es un string.
    if (name === "role_ids_set") {
      setFormData(prev => ({ ...prev, [name]: keys as Set<string> }));
    } else if (name === "section_id") {
      setFormData(prev => ({ ...prev, [name]: keys ? Number(keys as string) : null }));
    } else if (name === "status") {
      setFormData(prev => ({ ...prev, [name]: keys as UserData["status"] }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    toast.loading('Guardando cambios...', { id: 'savingUser' });

    const payload = {
      ...formData,
      role_ids: Array.from(formData.role_ids_set || []), // Convertir Set a array para la API
    };
    delete (payload as any).role_ids_set; // Eliminar la propiedad del Set

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Error ${res.status}: Fallo al actualizar usuario`);
      }

      toast.success('Usuario actualizado correctamente!', { id: 'savingUser' });
      router.push(`/dashboard/users/${id}`); // Redirigir a la página de detalles
      // O router.push('/dashboard/users'); para ir a la lista
      router.refresh(); // Para asegurar que los datos se recarguen si vuelves a la lista
    } catch (err: any) {
      console.error("Error updating user:", err);
      toast.error(err.message || "Ocurrió un error al guardar.", { id: 'savingUser' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner label="Cargando formulario..." /></div>;
  }
  if (error && !originalUser) { // Mostrar error solo si no se pudieron cargar los datos iniciales
    return <div className="container mx-auto p-4 text-center"><p className="text-danger">{error}</p></div>;
  }
  if (!originalUser && !isLoading) { // Si no está cargando y no hay usuario original
    return <div className="container mx-auto p-4 text-center"><p>Usuario no encontrado.</p></div>;
  }


  return (
    <div className="container mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Button as={NextUILink} href={`/dashboard/users/${id}`} variant="light" startContent={<ArrowLeftIcon className="mr-1" />}>
          Volver a Detalles del Usuario
        </Button>
      </div>
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold text-foreground">Editar Usuario: {originalUser?.first_name} {originalUser?.last_name}</h1>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input name="first_name" label="Nombre(s)" value={formData.first_name || ""} onChange={handleChange} variant="bordered" />
              <Input name="last_name" label="Apellido(s)" value={formData.last_name || ""} onChange={handleChange} variant="bordered" />
            </div>
            <Input name="email" type="email" label="Email" value={formData.email || ""} onChange={handleChange} variant="bordered"
              description="Cambiar el email puede requerir una nueva verificación." />
            <Input name="national_id" label="ID Nacional (CI)" value={formData.national_id || ""} onChange={handleChange} variant="bordered" />
            <Input name="birth_date" type="date" label="Fecha de Nacimiento" value={formData.birth_date || ""} onChange={handleChange} variant="bordered" placeholder="YYYY-MM-DD" />

            <Select
              label="Estado"
              name="status"
              placeholder="Seleccionar estado"
              selectedKeys={formData.status ? [formData.status] : []}
              onSelectionChange={(keys) => handleSelectChange("status", Array.from(keys)[0] as string)}
              variant="bordered"
            >
              {['active', 'disabled', 'on_vacation', 'pending_approval'].map((s) => (
                <SelectItem key={s} value={s} textValue={s.replace("_", " ")}>
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </Select>

            <Select
              label="Sección"
              name="section_id"
              placeholder="Seleccionar sección"
              selectedKeys={formData.section_id ? [String(formData.section_id)] : []}
              onSelectionChange={(keys) => handleSelectChange("section_id", Array.from(keys)[0] as string)}
              variant="bordered"
            >
              {sections.map((section) => (
                <SelectItem key={section.id} value={String(section.id)} textValue={section.name}>
                  {section.name}
                </SelectItem>
              ))}
            </Select>

            <Select
              label="Roles"
              name="role_ids_set"
              placeholder="Seleccionar roles"
              selectionMode="multiple"
              selectedKeys={formData.role_ids_set || new Set()}
              onSelectionChange={(keys) => handleSelectChange("role_ids_set", keys as Set<string>)}
              variant="bordered"
            >
              {roles.map((role) => (
                <SelectItem key={role.id} value={String(role.id)} textValue={role.name}>
                  {role.name}
                </SelectItem>
              ))}
            </Select>

            <Textarea name="avatar_url" label="URL del Avatar" value={formData.avatar_url || ""} onChange={handleChange} variant="bordered" placeholder="https://example.com/avatar.png" />

            <div className="flex justify-end gap-3">
              <Button variant="flat" onPress={() => router.back()}>Cancelar</Button>
              <Button type="submit" color="primary" isLoading={isSaving} isDisabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}