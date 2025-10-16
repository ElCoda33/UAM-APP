// app/dashboard/assets/components/MovementForm.tsx
"use client";

import React, { useEffect, useState, FormEvent, useContext } // Quita useContext si ya no es necesario
  from "react";
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
// import { UserContext } from "@/app/providers"; // <--- Ya no usaremos UserContext aquí
import { useSession } from "next-auth/react"; // <--- IMPORTA useSession
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

interface MovementFormProps {
  asset: AssetMinDetails;
  onMoveSuccess: () => void;
  onCancel: () => void;
}

const tipoDeUbicaciones = ['Interna', 'Externa', 'Dar de baja'];

export default function MovementForm({ asset, onMoveSuccess, onCancel }: MovementFormProps) {
  // const UserLogin = useContext<any>(UserContext); // <--- Ya no se usa
  const { data: session, status: sessionStatus } = useSession(); // <--- USA useSession

  const [targetSectionName, setTargetSectionName] = useState<string | null>(null);
  const [targetLocationName, setTargetLocationName] = useState<string | null>(null);
  const [receivingPersonCI, setReceivingPersonCI] = useState("");
  const [movementType, setMovementType] = useState<string>(tipoDeUbicaciones[0]);

  const currentDateTime = now(getLocalTimeZone());
  const [movementDate, setMovementDate] = useState<DateValue>(currentDateTime);
  const [receivedDate, setReceivedDate] = useState<DateValue>(currentDateTime);
  const [notes, setNotes] = useState("");

  const [allSections, setAllSections] = useState<Section[]>([]);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);

  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchInitialSections = async () => {
      setIsLoadingSections(true);
      try {
        const res = await fetch("/api/sections");
        if (!res.ok) throw new Error("Error al cargar secciones desde API");
        const data = await res.json();
        setAllSections(data || []);
      } catch (error) {
        toast.error("No se pudieron cargar las secciones.");
        console.error(error);
      } finally {
        setIsLoadingSections(false);
      }
    };
    fetchInitialSections();
  }, []);

  useEffect(() => {
    if (targetSectionName) {
      const fetchLocationsForSection = async () => {
        setIsLoadingLocations(true);
        setAvailableLocations([]);
        setTargetLocationName(null);
        try {
          const res = await fetch(`/api/locations?sectionName=${encodeURIComponent(targetSectionName)}`);
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || `Error al cargar lugares para ${targetSectionName}`);
          }
          const locationsData = await res.json();
          setAvailableLocations(locationsData || []);
        } catch (error: any) {
          toast.error(error.message || `No se pudieron cargar lugares para la sección ${targetSectionName}.`);
          console.error(error);
        } finally {
          setIsLoadingLocations(false);
        }
      };
      fetchLocationsForSection();
    } else {
      setAvailableLocations([]);
      setTargetLocationName(null);
    }
  }, [targetSectionName]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    // Verifica que la sesión esté cargada y que el usuario exista
    if (sessionStatus === "loading") {
      toast.error("Esperando información de sesión, por favor inténtalo de nuevo en un momento.");
      return;
    }

    // Usa session.user para obtener los datos
    // Tu session.user tiene national_id para el CI y section_name para la sección.
    // types/next-auth.d.ts
    if (!session?.user?.national_id || !session?.user?.section_name) {
      toast.error("No se pudo obtener la información completa del usuario logueado (CI o sección).");
      return;
    }
    if (!asset) {
      toast.error("Error: Faltan datos del activo a mover.");
      return;
    }
    if (!targetSectionName || !targetLocationName || !receivingPersonCI || !movementType) {
      toast.error("Por favor, complete todos los campos obligatorios del formulario.");
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading("Procesando movimiento...");

    const payload = {
      lugar_destino_name: targetLocationName,
      persona_recibe_ci: receivingPersonCI,
      tipo_ubicacion: movementType,
      dependencia_destino_name: targetSectionName,

      ci_usuario_autoriza: session.user.national_id, // <-- De la sesión de NextAuth
      seccion_transfiere_name: session.user.section_name, // <-- De la sesión de NextAuth
      fecha_movimiento_str: (movementDate as CalendarDateTime).toDate(getLocalTimeZone()).toISOString(),
      fecha_recibido_str: (receivedDate as CalendarDateTime).toDate(getLocalTimeZone()).toISOString(),
    };

    try {
      const response = await fetch(`/api/assets/${asset.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al procesar el movimiento del activo.');
      }
      toast.success(result.message || "Movimiento realizado correctamente.", { id: toastId });
      onMoveSuccess();
    } catch (error: any) {
      console.error("Error en handleSubmit MovementForm:", error);
      toast.error(error.message || "No se pudo completar el movimiento.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionStatus === "loading" && !session) { // Muestra un spinner mientras carga la sesión la primera vez
    return <div className="flex justify-center items-center p-8"><Spinner label="Cargando información de usuario..." /></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Autocomplete
        isRequired
        label="Sección de Destino (Dependencia)"
        placeholder="Seleccione la sección de destino"
        items={allSections}
        selectedKey={targetSectionName}
        onSelectionChange={(key) => setTargetSectionName(key as string)}
        isLoading={isLoadingSections}
        isDisabled={isSubmitting || isLoadingSections}
        variant="bordered"
        aria-label="Sección de Destino"
        name="dependencia_destino_name"
      >
        {(section) => (
          <AutocompleteItem key={section.name} textValue={section.name}>
            {section.name}
          </AutocompleteItem>
        )}
      </Autocomplete>

      <Autocomplete
        isRequired
        label="Destino Físico (Lugar)"
        placeholder={!targetSectionName ? "Seleccione una sección primero" : "Seleccione el lugar de destino"}
        items={availableLocations}
        selectedKey={targetLocationName}
        onSelectionChange={(key) => setTargetLocationName(key as string)}
        isLoading={isLoadingLocations}
        isDisabled={isSubmitting || !targetSectionName || isLoadingLocations || availableLocations.length === 0}
        variant="bordered"
        aria-label="Destino Físico"
        name="lugar_destino_name"
      >
        {(location) => (
          <AutocompleteItem key={location.name} textValue={location.name}>
            {location.name}
          </AutocompleteItem>
        )}
      </Autocomplete>

      <Input
        isRequired
        name="receivingPersonCI"
        label="CI Persona que Recibe"
        value={receivingPersonCI}
        onValueChange={setReceivingPersonCI}
        placeholder="Ingrese Cédula de Identidad"
        variant="bordered"
        isDisabled={isSubmitting}
      />

      <Select
        isRequired
        label="Tipo de Movimiento"
        name="movementType"
        selectedKeys={movementType ? [movementType] : []}
        onSelectionChange={(keys) => setMovementType(Array.from(keys as Set<string>)[0])}
        placeholder="Seleccione el tipo"
        variant="bordered"
        isDisabled={isSubmitting}
      >
        {tipoDeUbicaciones.map((tipo) => (
          <SelectItem key={tipo} value={tipo}>
            {tipo}
          </SelectItem>
        ))}
      </Select>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DatePicker
          isRequired
          label="Fecha y Hora del Movimiento"
          value={movementDate}
          onChange={setMovementDate as (date: DateValue) => void}
          granularity="minute"
          variant="bordered"
          isDisabled={isSubmitting}
          hideTimeZone
        />
        <DatePicker
          isRequired
          label="Fecha y Hora de Recepción"
          value={receivedDate}
          onChange={setReceivedDate as (date: DateValue) => void}
          granularity="minute"
          variant="bordered"
          isDisabled={isSubmitting}
          hideTimeZone
        />
      </div>

      <Textarea
        name="notes"
        label="Notas Adicionales (Opcional)"
        value={notes}
        onValueChange={setNotes}
        placeholder="Ingrese cualquier observación relevante para el movimiento"
        variant="bordered"
        minRows={2}
        isDisabled={isSubmitting}
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="flat" onPress={onCancel} isDisabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" color="primary" isLoading={isSubmitting} isDisabled={isSubmitting}>
          {isSubmitting ? <Spinner size="sm" color="current" /> : "Confirmar Movimiento"}
        </Button>
      </div>
    </form>
  );
}