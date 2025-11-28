// app/dashboard/assets/components/BulkMovementModal.tsx
"use client";

import React, { useEffect, useState, FormEvent, Key } from "react";
import {
    Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
    Button, Select, SelectItem, Autocomplete, AutocompleteItem,
    DatePicker, Textarea, Spinner
} from "@heroui/react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { DateValue, CalendarDateTime, now, getLocalTimeZone } from "@internationalized/date";

interface Section {
    id: number;
    name: string;
}

interface Location {
    id: number;
    name: string;
}

interface UserOption {
    id: number;
    name: string;
}

interface BulkMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    assetIds: (string | number)[];
    onSuccess: () => void;
}

const tipoDeUbicaciones = ['Interna', 'Externa', 'Dar de baja'];

export default function BulkMovementModal({ isOpen, onClose, assetIds, onSuccess }: BulkMovementModalProps) {
    const { data: session, status: sessionStatus } = useSession();

    const [targetSectionId, setTargetSectionId] = useState<Key | null>(null);
    const [targetLocationId, setTargetLocationId] = useState<Key | null>(null);
    const [selectedReceiverId, setSelectedReceiverId] = useState<Key | null>(null);
    const [movementType, setMovementType] = useState<string>(tipoDeUbicaciones[0]);

    const currentDateTime = now(getLocalTimeZone());
    const [movementDate, setMovementDate] = useState<DateValue>(currentDateTime);
    const [receivedDate, setReceivedDate] = useState<DateValue>(currentDateTime);
    const [notes, setNotes] = useState("");

    const [allSections, setAllSections] = useState<Section[]>([]);
    const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
    const [allUsers, setAllUsers] = useState<UserOption[]>([]);

    const [isLoadingSections, setIsLoadingSections] = useState(false);
    const [isLoadingLocations, setIsLoadingLocations] = useState(false);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cargar datos iniciales
    useEffect(() => {
        if (isOpen) {
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
        }
    }, [isOpen]);

    // Cargar ubicaciones al seleccionar sección
    useEffect(() => {
        if (targetSectionId) {
            const fetchLocations = async () => {
                setIsLoadingLocations(true);
                setAvailableLocations([]);
                setTargetLocationId(null);
                try {
                    const res = await fetch(`/api/locations?sectionId=${targetSectionId}`);
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
            setTargetLocationId(null);
        }
    }, [targetSectionId]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();

        if (sessionStatus === "loading") return;

        if (!targetSectionId || !targetLocationId || !selectedReceiverId || !movementType) {
            toast.error("Por favor complete todos los campos obligatorios.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading(`Procesando movimiento de ${assetIds.length} activos...`);

        const payload = {
            assetIds: assetIds,
            lugar_destino_id: Number(targetLocationId),
            persona_recibe_id: Number(selectedReceiverId),
            tipo_ubicacion: movementType,
            dependencia_destino_id: Number(targetSectionId),
            fecha_movimiento_str: (movementDate as CalendarDateTime).toDate(getLocalTimeZone()).toISOString(),
            fecha_recibido_str: (receivedDate as CalendarDateTime).toDate(getLocalTimeZone()).toISOString(),
            notes: notes
        };

        try {
            const response = await fetch(`/api/assets/bulk-move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Error al mover los activos.');
            }

            toast.success(`${assetIds.length} activos movidos correctamente.`, { id: toastId });
            onSuccess();
            onClose();

            // Reset form
            setTargetSectionId(null);
            setTargetLocationId(null);
            setSelectedReceiverId(null);
            setMovementType(tipoDeUbicaciones[0]);
            setNotes("");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al procesar el movimiento masivo.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
            scrollBehavior="inside"
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            Mover {assetIds.length} Activos
                        </ModalHeader>
                        <ModalBody>
                            <form onSubmit={handleSubmit} id="bulk-movement-form" className="space-y-4">
                                <Autocomplete
                                    isRequired
                                    label="Sección de Destino"
                                    placeholder="Seleccione sección"
                                    items={allSections}
                                    selectedKey={targetSectionId as any}
                                    onSelectionChange={setTargetSectionId}
                                    isLoading={isLoadingSections}
                                    isDisabled={isSubmitting}
                                    variant="bordered"
                                >
                                    {(section) => <AutocompleteItem key={section.id}>{section.name}</AutocompleteItem>}
                                </Autocomplete>

                                <Autocomplete
                                    isRequired
                                    label="Ubicación de Destino"
                                    placeholder={!targetSectionId ? "Seleccione una sección primero" : "Seleccione ubicación"}
                                    items={availableLocations}
                                    selectedKey={targetLocationId as any}
                                    onSelectionChange={setTargetLocationId}
                                    isLoading={isLoadingLocations}
                                    isDisabled={isSubmitting || !targetSectionId || isLoadingLocations}
                                    variant="bordered"
                                >
                                    {(location) => <AutocompleteItem key={location.id}>{location.name}</AutocompleteItem>}
                                </Autocomplete>

                                <Autocomplete
                                    isRequired
                                    label="Persona que Recibe"
                                    placeholder="Buscar por nombre o email..."
                                    items={allUsers}
                                    selectedKey={selectedReceiverId as any}
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
                                        <SelectItem key={tipo}>{tipo}</SelectItem>
                                    ))}
                                </Select>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <DatePicker
                                        isRequired
                                        label="Fecha Movimiento"
                                        value={movementDate as any}
                                        onChange={setMovementDate as any}
                                        granularity="minute"
                                        variant="bordered"
                                        isDisabled={isSubmitting}
                                        hideTimeZone
                                    />
                                    <DatePicker
                                        isRequired
                                        label="Fecha Recepción"
                                        value={receivedDate as any}
                                        onChange={setReceivedDate as any}
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
                            </form>
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="flat" onPress={onClose} isDisabled={isSubmitting}>
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                form="bulk-movement-form"
                                color="primary"
                                isLoading={isSubmitting}
                            >
                                Mover {assetIds.length} Activos
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
