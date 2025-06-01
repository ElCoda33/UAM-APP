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
  Textarea,
  Divider,
} from "@nextui-org/react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react"; // Importar useSession
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import AvatarUpload from "@/app/dashboard/profile/components/avatarUpload";

// Interfaces (sin cambios)
interface UserData {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  status: 'active' | 'disabled' | 'on_vacation' | 'pending_approval' | null;
  national_id: string | null;
  birth_date: string | null;
  section_id: number | null;
  role_ids: string | null;
}

interface Section {
  id: number;
  name: string;
}

interface Role {
  id: number;
  name: string;
}

type FormState = Omit<UserData, 'id' | 'role_ids'> & {
  role_ids_set: Set<string>;
};

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data: session, update: updateSession } = useSession(); // Obtener sesión y función de actualización

  const [formData, setFormData] = useState<Partial<FormState>>({
    role_ids_set: new Set(),
    avatar_url: "",
  });
  const [originalUser, setOriginalUser] = useState<UserData | null>(null); // Para comparar si el avatar cambió
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
        setOriginalUser(userData); // Guardar datos originales
        setFormData({
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
    if (name === "role_ids_set") {
      setFormData(prev => ({ ...prev, [name]: keys as Set<string> }));
    } else if (name === "section_id") {
      setFormData(prev => ({ ...prev, [name]: keys ? Number(keys as string) : null }));
    } else if (name === "status") {
      setFormData(prev => ({ ...prev, [name]: keys as UserData["status"] }));
    }
  };

  const handleAvatarUploadSuccess = (newAvatarUrl: string) => {
    setFormData(prev => ({ ...prev, avatar_url: newAvatarUrl }));
    toast.success("Avatar actualizado en el formulario. No olvides guardar todos los cambios.");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const savingToastId = toast.loading('Guardando cambios...');

    const payload = {
      ...formData,
      role_ids: Array.from(formData.role_ids_set || []),
    };
    delete (payload as any).role_ids_set;

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

      toast.success('Usuario actualizado correctamente!', { id: savingToastId });

      // --- INICIO DE LA MODIFICACIÓN ---
      // Verificar si el usuario editado es el usuario logueado
      // y si la URL del avatar en el formulario es diferente a la que tenía originalmente (o la actual de la sesión)
      if (session?.user?.id === id) {
        const newAvatarUrlInForm = payload.avatar_url || ""; // La URL que se acaba de guardar en la DB
        const currentSessionAvatar = session.user.image || "";

        if (newAvatarUrlInForm !== currentSessionAvatar) {
          console.log(`EDIT_USER_PAGE (handleSubmit): El avatar del usuario logueado (${id}) cambió. Actualizando sesión.`);
          console.log(`   URL anterior en sesión: ${currentSessionAvatar}`);
          console.log(`   Nueva URL guardada: ${newAvatarUrlInForm}`);
          await updateSession({ image: newAvatarUrlInForm });
          toast.success('Tu foto de perfil en la sesión ha sido actualizada.');
        }
      }
      // --- FIN DE LA MODIFICACIÓN ---

      router.push(`/dashboard/users/${id}`);
      router.refresh(); // Importante para que otras partes de la UI que dependen de datos del servidor se actualicen.
    } catch (err: any) {
      console.error("Error updating user:", err);
      toast.error(err.message || "Ocurrió un error al guardar.", { id: savingToastId });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Spinner label="Cargando formulario..." /></div>;
  }
  if (error && !originalUser) {
    return <div className="container mx-auto p-4 text-center"><p className="text-danger">{error}</p></div>;
  }
  if (!originalUser && !isLoading) { // Cubre el caso donde el fetch inicial falla o el usuario no existe
    return <div className="container mx-auto p-4 text-center"><p>Usuario no encontrado o error al cargar datos.</p></div>;
  }


  return (
    <div className="container mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Button as={NextUILink} href={originalUser ? `/dashboard/users/${id}` : '/dashboard/users'} variant="light" startContent={<ArrowLeftIcon className="mr-1" />}>
          {originalUser ? "Volver a Detalles del Usuario" : "Volver a la Lista"}
        </Button>
      </div>
      <Card className="shadow-xl">
        <CardHeader>
          <h1 className="text-2xl font-bold text-foreground">
            Editar Usuario: {originalUser?.first_name} {originalUser?.last_name || id}
          </h1>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="flex flex-col items-center space-y-3 p-4 border border-default-200 rounded-medium">
              <h3 className="text-lg font-medium text-foreground-600 self-start">Foto de Perfil</h3>
              <AvatarUpload
                userId={id!}
                currentAvatarUrl={formData.avatar_url || ""}
                onUploadSuccess={handleAvatarUploadSuccess}
              />
              <Textarea
                name="avatar_url"
                label="URL del Avatar"
                value={formData.avatar_url || ""}
                onChange={handleChange}
                variant="bordered"
                placeholder="https://example.com/avatar.png"
                description="Puedes pegar una URL directamente o usar el botón de arriba para subir una imagen."
                minRows={1}
                maxRows={3}
                disabled={isSaving}
              />
            </div>

            <Divider className="my-4" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input name="first_name" label="Nombre(s)" value={formData.first_name || ""} onChange={handleChange} variant="bordered" disabled={isSaving} />
              <Input name="last_name" label="Apellido(s)" value={formData.last_name || ""} onChange={handleChange} variant="bordered" disabled={isSaving} />
            </div>
            <Input name="email" type="email" label="Email" value={formData.email || ""} onChange={handleChange} variant="bordered"
              description="Cambiar el email puede requerir una nueva verificación." disabled={isSaving} />
            <Input name="national_id" label="ID Nacional (CI)" value={formData.national_id || ""} onChange={handleChange} variant="bordered" disabled={isSaving} />
            <Input
              name="birth_date"
              type="date"
              label="Fecha de Nacimiento"
              value={formData.birth_date ? formData.birth_date.split('T')[0] : ""}
              onChange={handleChange}
              variant="bordered"
              placeholder="YYYY-MM-DD"
              disabled={isSaving}
            />

            <Select
              label="Estado"
              name="status"
              placeholder="Seleccionar estado"
              selectedKeys={formData.status ? [formData.status] : []}
              onSelectionChange={(keys) => handleSelectChange("status", Array.from(keys as Set<string>)[0] as string)}
              variant="bordered"
              disabled={isSaving}
            >
              {['active', 'disabled', 'on_vacation', 'pending_approval'].map((s) => (
                <SelectItem key={s} value={s} textValue={s.replace("_", " ")}>
                  {s.replace("_", " ").charAt(0).toUpperCase() + s.replace("_", " ").slice(1)}
                </SelectItem>
              ))}
            </Select>

            <Select
              label="Sección"
              name="section_id"
              placeholder="Seleccionar sección"
              selectedKeys={formData.section_id ? [String(formData.section_id)] : []}
              onSelectionChange={(keys) => handleSelectChange("section_id", Array.from(keys as Set<string>)[0] as string)}
              variant="bordered"
              disabled={isSaving}
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
              disabled={isSaving}
            >
              {roles.map((role) => (
                <SelectItem key={String(role.id)} value={String(role.id)} textValue={role.name}>
                  {role.name}
                </SelectItem>
              ))}
            </Select>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="flat" onPress={() => router.back()} isDisabled={isSaving}>Cancelar</Button>
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