// app/dashboard/assets/components/MovementForm.tsx
"use client";

import React, { useEffect, useState, FormEvent, Key } from "react";
import {
  Input,
  Button,
  Select,
  SelectItem,
  Autocomplete,
  AutocompleteItem,
  DatePicker,
  Textarea,
  Spinner
} from "@heroui/react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { DateValue, CalendarDateTime, now, getLocalTimeZone } from "@internationalized/date";

interface AssetMinDetails {
  id: number;
  product_name: string | null;
}

interface Section {
  id: number;
  name: string;
}

interface Location {
  id: number;
  name: string;
}

// Interfaz para el buscador de usuarios
interface UserOption {
  id: number;
  name: string;
}

interface MovementFormProps {
  asset: AssetMinDetails;
  onMoveSuccess: () => void;
  onCancel: () => void;
}

const tipoDeUbicaciones = ['Interna', 'Externa', 'Dar de baja'];

export default function MovementForm({ asset, onMoveSuccess, onCancel }: MovementFormProps) {
  const { data: session, status: sessionStatus } = useSession();

  const [targetSectionName, setTargetSectionName] = useState<string | null>(null);
  const [targetLocationName, setTargetLocationName] = useState<string | null>(null);

  // Nuevo estado: ID del usuario seleccionado en el buscador
  const [selectedReceiverId, setSelectedReceiverId] = useState<Key | null>(null);

  const [movementType, setMovementType] = useState<string>(tipoDeUbicaciones[0]);
  const currentDateTime = now(getLocalTimeZone());
  const [movementDate, setMovementDate] = useState<DateValue>(currentDateTime);
  const [receivedDate, setReceivedDate] = useState<DateValue>(currentDateTime);
  const [notes, setNotes] = useState("");

  const [allSections, setAllSections] = useState<Section[]>([]);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]); // Lista de usuarios para el buscador

  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar datos iniciales (Secciones y Usuarios)
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingSections(true);
      setIsLoadingUsers(true);
      try {
        const [sectionsRes, usersRes] = await Promise.all([
          fetch("/api/sections"),
          fetch("/api/users")
        ]);

        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          setAllSections(sectionsData.filter((s: any) => s.deleted_at === null) || []);
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          // Formatear usuarios para el buscador: Nombre Apellido (Email)
          setAllUsers(usersData.map((u: any) => ({
            id: u.id,
            name: `${u.first_name || ''} ${u.last_name || ''} (${u.email})`.trim()
          })));
        }
      } catch (error: any) {
        console.error("Error cargando datos:", error);
        toast.error("Error cargando listas desplegables.");
      } finally {
        setIsLoadingSections(false);
        setIsLoadingUsers(false);
      }
    };
    fetchInitialData();
  }, []);

  // Cargar ubicaciones al seleccionar sección
  useEffect(() => {
    if (targetSectionName) {
      const fetchLocations = async () => {
        setIsLoadingLocations(true);
        setAvailableLocations([]);
        setTargetLocationName(null);
        try {
          // Buscar ID de la sección seleccionada
          const sectionObj = allSections.find(s => s.name === targetSectionName);
          const queryParam = sectionObj ? `sectionId=${sectionObj.id}` : `sectionName=${encodeURIComponent(targetSectionName)}`;

          const res = await fetch(`/api/locations?${queryParam}`);
          if (res.ok) {
            const data = await res.json();
            setAvailableLocations(data || []);
          }
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoadingLocations(false);
        }
      };
      fetchLocations();
    } else {
      setAvailableLocations([]);
      setTargetLocationName(null);
    }
  }, [targetSectionName, allSections]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (sessionStatus === "loading") return;

    // Eliminada la validación de session.user.national_id que causaba el error.
    // El backend ahora usa el ID de usuario de la sesión directamente.

    if (!asset) {
      toast.error("Error: Faltan datos del activo.");
      return;
    }

    if (!targetSectionName || !targetLocationName || !selectedReceiverId || !movementType) {
      toast.error("Por favor complete todos los campos obligatorios.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Procesando movimiento...");

    const payload = {
      lugar_destino_name: targetLocationName,
      persona_recibe_id: Number(selectedReceiverId), // Enviamos el ID numérico
      tipo_ubicacion: movementType,
      dependencia_destino_name: targetSectionName,
      fecha_movimiento_str: (movementDate as CalendarDateTime).toDate(getLocalTimeZone()).toISOString(),
      fecha_recibido_str: (receivedDate as CalendarDateTime).toDate(getLocalTimeZone()).toISOString(),
      notes: notes
    };

    try {
      const response = await fetch(`/api/assets/${asset.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al mover el activo.');
      }
      toast.success("Movimiento realizado correctamente.", { id: toastId });
      onMoveSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Error al procesar el movimiento.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionStatus === "loading") {
    return <div className="flex justify-center p-8"><Spinner label="Cargando..." /></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Autocomplete
        isRequired
        label="Sección de Destino"
        placeholder="Seleccione sección"
        items={allSections}
        selectedKey={targetSectionName}
        onSelectionChange={(key) => setTargetSectionName(key as string)}
        isLoading={isLoadingSections}
        isDisabled={isSubmitting}
        variant="bordered"
      >
        {(section) => <AutocompleteItem key={section.name}>{section.name}</AutocompleteItem>}
      </Autocomplete>

      <Autocomplete
        isRequired
        label="Ubicación de Destino"
        placeholder={!targetSectionName ? "Seleccione una sección primero" : "Seleccione ubicación"}
        items={availableLocations}
        selectedKey={targetLocationName}
        onSelectionChange={(key) => setTargetLocationName(key as string)}
        isLoading={isLoadingLocations}
        isDisabled={isSubmitting || !targetSectionName || isLoadingLocations}
        variant="bordered"
      >
        {(location) => <AutocompleteItem key={location.name}>{location.name}</AutocompleteItem>}
      </Autocomplete>

      {/* Buscador de Persona que Recibe (Nombre/Email) */}
      <Autocomplete
        isRequired
        label="Persona que Recibe"
        placeholder="Buscar por nombre o email..."
        items={allUsers}
        selectedKey={selectedReceiverId}
        onSelectionChange={setSelectedReceiverId}
        isLoading={isLoadingUsers}
        isDisabled={isSubmitting}
        variant="bordered"
        allowsCustomValue={false}
      >
        {(user) => <AutocompleteItem key={user.id} textValue={user.name}>{user.name}</AutocompleteItem>}
      </Autocomplete>

      <Select
        isRequired
        label="Tipo de Movimiento"
        selectedKeys={movementType ? [movementType] : []}
        onSelectionChange={(keys) => setMovementType(Array.from(keys as Set<string>)[0])}
        variant="bordered"
        isDisabled={isSubmitting}
      >
        {tipoDeUbicaciones.map((tipo) => (
          <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
        ))}
      </Select>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DatePicker
          isRequired
          label="Fecha Movimiento"
          value={movementDate}
          onChange={setMovementDate as (date: DateValue) => void}
          granularity="minute"
          variant="bordered"
          isDisabled={isSubmitting}
          hideTimeZone
        />
        <DatePicker
          isRequired
          label="Fecha Recepción"
          value={receivedDate}
          onChange={setReceivedDate as (date: DateValue) => void}
          granularity="minute"
          variant="bordered"
          isDisabled={isSubmitting}
          hideTimeZone
        />
      </div>

      <Textarea
        label="Notas (Opcional)"
        value={notes}
        onValueChange={setNotes}
        variant="bordered"
        minRows={2}
        isDisabled={isSubmitting}
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="flat" onPress={onCancel} isDisabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" color="primary" isLoading={isSubmitting}>
          Confirmar
        </Button>
      </div>
    </form>
  );
}