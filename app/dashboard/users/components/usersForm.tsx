// app/dashboard/users/components/UserForm.tsx
"use client";

import React, { useEffect, useState, FormEvent, Key, useRef, ChangeEvent } from "react";
import {
    Input, Button, Select, SelectItem, Textarea, DatePicker,
    Spinner, Autocomplete, AutocompleteItem, Avatar as HeroUIAvatar, Progress, // Añadido Avatar y Progress
    Card,
    CardHeader,
    CardBody,
    Divider
} from "@heroui/react";
import { toast } from "react-hot-toast";
import {
    createUserSchema, updateUserSchema, userStatusEnum,
    type createUserSchema as CreateUserZodSchema,
    type updateUserSchema as UpdateUserZodSchema
} from "@/lib/schema";
import { DateValue, parseDate, CalendarDate } from "@internationalized/date";
import type { z } from "zod";
import { EyeFilledIcon } from "@/components/inputs/icons/EyeSlashFilledIcon";
import { EyeSlashFilledIcon } from "@/app/EyeSlashFilledlcon";
import AvatarUpload from "@/app/dashboard/profile/components/avatarUpload";
import { EditIcon } from "@/components/icons/EditIcon"; // Para el botón de cambiar imagen

// Tipos para datos de dropdowns/autocompletes
interface SectionOption { id: number; name: string; }
interface RoleOption { id: number; name: string; }

type UserFormData = Omit<z.infer<typeof CreateUserZodSchema>, 'birth_date' | 'role_ids' | 'password' | 'confirmPassword'> &
    Omit<z.infer<typeof UpdateUserZodSchema>, 'birth_date' | 'role_ids'> & {
        birth_date_value: DateValue | null;
        role_ids_set: Set<string>;
        password?: string;
        confirmPassword?: string;
    };

interface UserFormProps {
    initialData?: Partial<UserFormData>;
    isEditMode: boolean;
    userId?: string | number;
    onSubmitSuccess: (data: any) => void;
    onCancel: () => void;
}

const stringToDateValue = (dateString: string | null | undefined): DateValue | null => {
    if (!dateString) return null;
    try {
        const [year, month, day] = dateString.split('-').map(Number);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return new CalendarDate(year, month, day);
        }
        return parseDate(dateString);
    } catch (e) {
        console.warn("UserForm: Error parsing date string for DatePicker:", dateString, e);
        return null;
    }
};

const dateValueToString = (dateValue: DateValue | null | undefined): string | null => {
    if (!dateValue) return null;
    return `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
};

const userStatusOptions = userStatusEnum.options.map(option => ({
    key: option,
    label: option.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}));

export default function UserForm({
    initialData,
    isEditMode,
    userId,
    onSubmitSuccess,
    onCancel,
}: UserFormProps) {
    const defaultFormData: UserFormData = {
        first_name: "", lastName: "", email: "", national_id: null, status: 'active',
        birth_date_value: null, section_id: null, role_ids_set: new Set(), avatar_url: null,
        password: "", confirmPassword: "",
        ...(initialData && {
            ...initialData,
            birth_date_value: stringToDateValue(initialData.birth_date_value as unknown as string),
            role_ids_set: new Set(initialData.role_ids_set ? Array.from(initialData.role_ids_set).map(String) : []),
        }),
    };

    const [formData, setFormData] = useState<UserFormData>(defaultFormData);
    const [sections, setSections] = useState<SectionOption[]>([]);
    const [roles, setRoles] = useState<RoleOption[]>([]);
    const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    // --- Estados para la subida de avatar en modo CREACIÓN ---
    const [selectedAvatarFileCreate, setSelectedAvatarFileCreate] = useState<File | null>(null);
    const [avatarPreviewCreate, setAvatarPreviewCreate] = useState<string | null>(initialData?.avatar_url || null);
    const [isUploadingAvatarCreate, setIsUploadingAvatarCreate] = useState(false);
    const [uploadProgressCreate, setUploadProgressCreate] = useState(0);
    const avatarCreateFileInputRef = useRef<HTMLInputElement>(null);
    // --- Fin estados para subida de avatar en modo CREACIÓN ---

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData,
                birth_date_value: stringToDateValue(initialData.birth_date_value as unknown as string | undefined),
                role_ids_set: new Set(initialData.role_ids_set ? Array.from(initialData.role_ids_set).map(String) : []),
                avatar_url: initialData.avatar_url || null, // Asegurar que avatar_url se carga
            }));
            if (isEditMode) { // Si es modo edición, el preview del AvatarUpload se maneja internamente
                // No necesitamos setAvatarPreviewCreate aquí para edit mode
            } else {
                setAvatarPreviewCreate(initialData.avatar_url || null);
            }
        }
    }, [initialData, isEditMode]);

    useEffect(() => {
        const fetchDropdownData = async () => { /* ... (sin cambios) ... */
            setIsLoadingDropdowns(true);
            try {
                const [sectionsRes, rolesRes] = await Promise.all([
                    fetch('/api/sections'),
                    fetch('/api/roles')
                ]);

                if (!sectionsRes.ok) throw new Error('Error al cargar secciones');
                const sectionsData = await sectionsRes.json();
                setSections(sectionsData.filter((s: any) => s.deleted_at === null).map((s: any) => ({ id: s.id, name: s.name })));

                if (!rolesRes.ok) throw new Error('Error al cargar roles');
                const rolesData = await rolesRes.json();
                setRoles(rolesData.map((r: any) => ({ id: r.id, name: r.name })));

            } catch (error: any) {
                toast.error(error.message || "No se pudieron cargar las opciones para los selectores.");
                setSections([]);
                setRoles([]);
            } finally {
                setIsLoadingDropdowns(false);
            }
        };
        fetchDropdownData();
    }, []);

    const clearError = (fieldName: keyof UserFormData) => { /* ... (sin cambios) ... */
        if (errors && errors[fieldName]) {
            setErrors(prev => ({ ...prev, [fieldName]: undefined }));
        }
        if (fieldName === 'password' || fieldName === 'confirmPassword') {
            if (errors && errors['confirmPassword' as keyof UserFormData]?.includes("Las contraseñas no coinciden.")) {
                setErrors(prev => ({ ...prev, confirmPassword: undefined }));
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { /* ... (sin cambios) ... */
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        clearError(name as keyof UserFormData);
    };

    const handleSelectChange = (fieldName: keyof UserFormData, selectedKeys: Key | Set<Key> | null) => { /* ... (sin cambios) ... */
        let val: string | number | Set<string> | null = null;
        if (selectedKeys !== null) {
            if (fieldName === 'role_ids_set') {
                val = selectedKeys as Set<string>;
            } else if (fieldName === 'status') {
                val = String(Array.from(selectedKeys as Set<Key>)[0]);
            } else {
                val = Number(Array.from(selectedKeys as Set<Key>)[0]);
            }
        }
        setFormData(prev => ({ ...prev, [fieldName]: val as any }));
        clearError(fieldName);
    };

    const handleDateChange = (date: DateValue | null) => { /* ... (sin cambios) ... */
        setFormData(prev => ({ ...prev, birth_date_value: date }));
        clearError('birth_date_value');
    };

    // Para modo EDICIÓN (usa AvatarUpload)
    const handleAvatarUploadSuccessEdit = (newAvatarUrl: string) => {
        setFormData(prev => ({ ...prev, avatar_url: newAvatarUrl }));
        toast.info("URL del avatar actualizada en el formulario. Recuerda guardar todos los cambios del usuario.");
    };

    // --- Lógica para subida de avatar en modo CREACIÓN ---
    const handleAvatarFileChangeCreate = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                toast.error('Tipo de archivo no permitido.');
                if (avatarCreateFileInputRef.current) avatarCreateFileInputRef.current.value = "";
                return;
            }
            const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSizeInBytes) {
                toast.error(`El archivo es demasiado grande (máx ${maxSizeInBytes / (1024 * 1024)}MB).`);
                if (avatarCreateFileInputRef.current) avatarCreateFileInputRef.current.value = "";
                return;
            }
            setSelectedAvatarFileCreate(file);
            const reader = new FileReader();
            reader.onloadend = () => { setAvatarPreviewCreate(reader.result as string); };
            reader.readAsDataURL(file);
            setFormData(prev => ({ ...prev, avatar_url: null })); // Limpiar URL manual si se selecciona archivo
        } else {
            setSelectedAvatarFileCreate(null);
            setAvatarPreviewCreate(null); // O volver a formData.avatar_url si se limpió y había una URL manual
        }
    };

    const handleUploadAvatarCreate = async () => {
        if (!selectedAvatarFileCreate) {
            toast.error("Selecciona una imagen para subir.");
            return;
        }
        setIsUploadingAvatarCreate(true);
        setUploadProgressCreate(0);
        const toastId = toast.loading("Subiendo avatar...");

        const fileFormData = new FormData();
        fileFormData.append("imageFile", selectedAvatarFileCreate); // "imageFile" es lo que espera /api/uploads/image

        // Simular progreso
        let progressInterval = setInterval(() => {
            setUploadProgressCreate(prev => Math.min(prev + 10, 90));
        }, 200);

        try {
            const response = await fetch("/api/uploads/image", { method: "POST", body: fileFormData });
            clearInterval(progressInterval);
            const result = await response.json();

            if (!response.ok) {
                setUploadProgressCreate(0);
                throw new Error(result.message || "Error al subir la imagen.");
            }
            setUploadProgressCreate(100);
            toast.success("Avatar subido. La URL se guardará con el usuario.", { id: toastId });
            setFormData(prev => ({ ...prev, avatar_url: result.imageUrl })); // Guardar URL absoluta
            setSelectedAvatarFileCreate(null); // Limpiar selección de archivo
            // Mantener el preview con result.imageUrl
            setAvatarPreviewCreate(result.imageUrl);

        } catch (error: any) {
            if (toastId) toast.dismiss(toastId);
            toast.error(error.message || "No se pudo subir el avatar.");
            setUploadProgressCreate(0);
        } finally {
            setIsUploadingAvatarCreate(false);
        }
    };
    // --- Fin lógica subida en modo CREACIÓN ---

    const handleSubmit = async (event: FormEvent) => { /* ... (sin cambios significativos, pero asegurar que avatar_url (absoluta) se envíe) ... */
        event.preventDefault();
        if (isUploadingAvatarCreate) { // No permitir submit si un avatar se está subiendo para el nuevo usuario
            toast.error("Espera a que termine de subir el avatar antes de guardar el usuario.");
            return;
        }
        setIsSubmitting(true);
        setErrors({});

        const dataForZod: any = {
            ...formData,
            birth_date: dateValueToString(formData.birth_date_value),
            role_ids: Array.from(formData.role_ids_set).map(idStr => Number(idStr)),
            avatar_url: formData.avatar_url || null, // Asegurar que se envía la URL del avatar
        };
        delete dataForZod.birth_date_value;
        delete dataForZod.role_ids_set;

        if (!isEditMode) { // Solo incluir password y confirmPassword para Zod en modo creación
            dataForZod.password = formData.password;
            dataForZod.confirmPassword = formData.confirmPassword;
        } else { // No enviar campos de contraseña en modo edición desde este formulario
            delete dataForZod.password;
            delete dataForZod.confirmPassword;
        }


        const schemaToUse = isEditMode ? updateUserSchema : createUserSchema;
        const validationResult = schemaToUse.safeParse(dataForZod);

        if (!validationResult.success) {
            const flatErrors: Partial<Record<keyof UserFormData, string>> = {};
            validationResult.error.errors.forEach(err => {
                const path = err.path[0] as keyof UserFormData;
                if (path) {
                    flatErrors[path] = err.message;
                } else if (err.message.includes("Las contraseñas no coinciden")) {
                    flatErrors['confirmPassword' as keyof UserFormData] = err.message;
                } else if (err.message.includes("Se debe proporcionar al menos un campo para actualizar")) {
                    // Este es un error general del refine de updateUserSchema
                    // Podríamos mostrarlo de forma general o simplemente confiar en los toasts
                    toast.error("No hay cambios detectados para guardar.");
                }
            });
            setErrors(flatErrors);
            if (!flatErrors['confirmPassword' as keyof UserFormData] && !validationResult.error.errors.some(e => e.message.includes("Se debe proporcionar"))) {
                toast.error("Por favor, corrige los errores en el formulario.");
            }
            setIsSubmitting(false);
            return;
        }

        const apiPath = isEditMode ? `/api/users/${userId}` : '/api/users';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(apiPath, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(validationResult.data),
            });
            const result = await response.json();

            if (!response.ok) {
                let errorMessage = result.message || `Error al ${isEditMode ? 'actualizar' : 'crear'} el usuario.`;
                if (result.field && result.message) {
                    setErrors(prev => ({ ...prev, [result.field]: result.message }));
                    errorMessage = result.message;
                } else if (result.errors) {
                    const apiErrors: Partial<Record<keyof UserFormData, string>> = {};
                    Object.entries(result.errors).forEach(([key, value]) => {
                        apiErrors[key as keyof UserFormData] = (value as string[])[0];
                    });
                    setErrors(apiErrors);
                }
                throw new Error(errorMessage);
            }
            toast.success(`Usuario ${isEditMode ? 'actualizado' : 'creado'} correctamente!`);
            onSubmitSuccess(result.user || result);
        } catch (error: any) {
            toast.error(error.message || `No se pudo ${isEditMode ? 'actualizar' : 'crear'} el usuario.`);
            console.error("Error submitting user form:", error);
        } finally {
            setIsSubmitting(false);
        }
    };


    if (isLoadingDropdowns && !initialData) {
        return (
            <div className="flex justify-center items-center p-8">
                <Spinner label="Cargando opciones del formulario..." color="primary" />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* --- Sección de Avatar --- */}
            <Card className="shadow-sm border border-default-200">
                <CardHeader><h3 className="text-lg font-medium text-foreground-700">Avatar</h3></CardHeader>
                <CardBody className="items-center">
                    {isEditMode && userId ? (
                        <AvatarUpload
                            userId={String(userId)}
                            currentAvatarUrl={formData.avatar_url || ""}
                            onUploadSuccess={handleAvatarUploadSuccessEdit}
                        />
                    ) : (
                        // --- Interfaz de subida para modo CREACIÓN ---
                        <div className="flex flex-col items-center space-y-3 w-full">
                            <div
                                className="relative group cursor-pointer"
                                onClick={() => avatarCreateFileInputRef.current?.click()}
                                onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') avatarCreateFileInputRef.current?.click(); }}
                                role="button"
                                tabIndex={0}
                            >
                                <HeroUIAvatar
                                    src={avatarPreviewCreate || undefined}
                                    name={formData.first_name?.charAt(0) || formData.email?.charAt(0) || "U"}
                                    className="w-32 h-32 text-large border-2 border-default-300 group-hover:border-primary transition-colors"
                                    isBordered
                                    color="default"
                                />
                                {!isUploadingAvatarCreate && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 ease-in-out rounded-full pointer-events-none">
                                        <EditIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-75 transition-opacity duration-300 ease-in-out" />
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={avatarCreateFileInputRef}
                                onChange={handleAvatarFileChangeCreate}
                                accept="image/png, image/jpeg, image/webp, image/gif"
                                className="hidden"
                                id={`avatar-create-input`}
                                disabled={isUploadingAvatarCreate || isSubmitting}
                            />
                            {selectedAvatarFileCreate && !isUploadingAvatarCreate && (
                                <div className="text-center w-full max-w-xs">
                                    <p className="text-sm text-default-500 truncate mb-2">
                                        Archivo: {selectedAvatarFileCreate.name}
                                    </p>
                                    <Button color="secondary" variant="flat" onPress={handleUploadAvatarCreate} fullWidth isDisabled={isSubmitting}>
                                        Confirmar y Subir Avatar Seleccionado
                                    </Button>
                                </div>
                            )}
                            {isUploadingAvatarCreate && (
                                <div className="w-full max-w-xs px-1">
                                    <Progress aria-label="Subiendo avatar..." size="sm" value={uploadProgressCreate} color="primary" showValueLabel className="max-w-full" />
                                    <p className="text-sm text-center text-default-500 mt-1">{uploadProgressCreate < 100 ? "Subiendo..." : "Completado"}</p>
                                </div>
                            )}
                            <Input
                                name="avatar_url"
                                label="O ingresa URL del Avatar (Opcional)"
                                value={formData.avatar_url || ""}
                                onChange={handleChange}
                                variant="bordered"
                                type="url"
                                isDisabled={isSubmitting || isUploadingAvatarCreate || !!selectedAvatarFileCreate}
                                isInvalid={!!errors.avatar_url}
                                errorMessage={errors.avatar_url}
                                placeholder="https://ejemplo.com/avatar.png"
                                description={selectedAvatarFileCreate ? "La URL se establecerá después de la subida." : ""}
                            />
                        </div>
                        // --- Fin interfaz modo CREACIÓN ---
                    )}
                </CardBody>
            </Card>
            <Divider />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input name="first_name" label="Nombre(s)" value={formData.first_name || ""} onChange={handleChange} variant="bordered" isDisabled={isSubmitting} isInvalid={!!errors.first_name} errorMessage={errors.first_name} />
                <Input name="last_name" label="Apellido(s)" value={formData.last_name || ""} onChange={handleChange} variant="bordered" isDisabled={isSubmitting} isInvalid={!!errors.last_name} errorMessage={errors.last_name} />
            </div>
            <Input name="email" type="email" label="Email" value={formData.email} onChange={handleChange} variant="bordered" isRequired isDisabled={isSubmitting} isInvalid={!!errors.email} errorMessage={errors.email} />

            {!isEditMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        name="password"
                        type={isPasswordVisible ? "text" : "password"}
                        label="Contraseña"
                        value={formData.password || ""}
                        onChange={handleChange}
                        variant="bordered"
                        isRequired={!isEditMode}
                        isDisabled={isSubmitting}
                        isInvalid={!!errors.password}
                        errorMessage={errors.password}
                        endContent={
                            <button className="focus:outline-none" type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)}>
                                {isPasswordVisible ? <EyeSlashFilledIcon className="text-2xl text-default-400" /> : <EyeFilledIcon className="text-2xl text-default-400" />}
                            </button>
                        }
                    />
                    <Input
                        name="confirmPassword"
                        type={isConfirmPasswordVisible ? "text" : "password"}
                        label="Confirmar Contraseña"
                        value={formData.confirmPassword || ""}
                        onChange={handleChange}
                        variant="bordered"
                        isRequired={!isEditMode}
                        isDisabled={isSubmitting}
                        isInvalid={!!errors.confirmPassword}
                        errorMessage={errors.confirmPassword}
                        endContent={
                            <button className="focus:outline-none" type="button" onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}>
                                {isConfirmPasswordVisible ? <EyeSlashFilledIcon className="text-2xl text-default-400" /> : <EyeFilledIcon className="text-2xl text-default-400" />}
                            </button>
                        }
                    />
                </div>
            )}

            <Input name="national_id" label="ID Nacional (CI, Opcional)" value={formData.national_id || ""} onChange={handleChange} variant="bordered" isDisabled={isSubmitting} isInvalid={!!errors.national_id} errorMessage={errors.national_id} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DatePicker
                    name="birth_date_value"
                    label="Fecha de Nacimiento (Opcional)"
                    value={formData.birth_date_value}
                    onChange={handleDateChange}
                    variant="bordered"
                    granularity="day"
                    isDisabled={isSubmitting}
                    isInvalid={!!errors.birth_date_value}
                    errorMessage={errors.birth_date_value as string | undefined}
                    showMonthAndYearPickers
                />
                <Select
                    name="status"
                    label="Estado"
                    placeholder="Seleccionar estado"
                    selectedKeys={formData.status ? [formData.status] : []}
                    onSelectionChange={(keys) => handleSelectChange('status', keys as Set<Key>)}
                    variant="bordered"
                    isRequired
                    isDisabled={isSubmitting}
                    isInvalid={!!errors.status}
                    errorMessage={errors.status}
                >
                    {userStatusOptions.map((opt) => (<SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>))}
                </Select>
            </div>

            <Autocomplete
                label="Sección (Opcional)"
                placeholder="Buscar sección..."
                defaultItems={sections}
                selectedKey={formData.section_id ? String(formData.section_id) : null}
                onSelectionChange={(key) => handleSelectChange('section_id', key !== null ? new Set([key].map(String)) : null)}
                variant="bordered"
                isDisabled={isSubmitting || isLoadingDropdowns}
                isLoading={isLoadingDropdowns}
                isInvalid={!!errors.section_id}
                errorMessage={errors.section_id}
                allowsCustomValue={false}
                onClear={() => handleSelectChange('section_id', null)}
                name="section_id"
            >
                {(item) => <AutocompleteItem key={item.id} textValue={item.name}>{item.name}</AutocompleteItem>}
            </Autocomplete>

            <Select
                name="role_ids_set"
                label="Roles (Opcional)"
                placeholder="Seleccionar roles"
                selectionMode="multiple"
                selectedKeys={formData.role_ids_set}
                onSelectionChange={(keys) => handleSelectChange('role_ids_set', keys as Set<Key>)}
                variant="bordered"
                isDisabled={isSubmitting || isLoadingDropdowns}
                isLoading={isLoadingDropdowns}
                isInvalid={!!errors.role_ids_set}
                errorMessage={errors.role_ids_set as string | undefined}
            >
                {roles.map((role) => (
                    <SelectItem key={String(role.id)} value={String(role.id)} textValue={role.name}>
                        {role.name}
                    </SelectItem>
                ))}
            </Select>

            <div className="flex justify-end gap-3 pt-4">
                <Button variant="flat" onPress={onCancel} isDisabled={isSubmitting || isUploadingAvatarCreate} type="button">
                    Cancelar
                </Button>
                <Button type="submit" color="primary" isLoading={isSubmitting} isDisabled={isSubmitting || isUploadingAvatarCreate}>
                    {isSubmitting ? "Guardando..." : (isEditMode ? "Guardar Cambios" : "Crear Usuario")}
                </Button>
            </div>
        </form>
    );
}