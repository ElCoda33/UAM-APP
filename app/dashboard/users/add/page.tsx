// UAM-APP/app/dashboard/users/add/page.tsx
"use client";

import React, { useState, useEffect, FormEvent, Key, ChangeEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Input,
    Button,
    Card,
    CardHeader,
    CardBody,
    Spinner,
    Link as NextUILink,
    Divider,
    Autocomplete, // Aseguramos que Autocomplete esté para los campos que lo requieran
    AutocompleteItem,
    Select,     // Para el campo 'status'
    SelectItem, // Para el campo 'status'
    DatePicker,
    Avatar
} from "@heroui/react";
import { toast } from "react-hot-toast";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import { EyeFilledIcon } from "@/components/inputs/icons/EyeFilledIcon";
import { EyeSlashFilledIcon } from "@/components/inputs/icons/EyeSlashFilledIcon";
import { createUserSchema, userStatusEnum } from "@/lib/schema";
import type { SectionRecord } from "@/app/api/sections/route";
import type { Role } from '@/components/types/types';
import { z } from "zod";
import { DateValue } from "@internationalized/date";
import { EditIcon } from "@/components/icons/EditIcon";

type FormState = z.infer<typeof createUserSchema>;
type FormErrors = z.ZodFormattedError<Omit<FormState, 'confirmPassword'>> |
{ confirmPassword?: { _errors?: string[] } } |
    null;

const initialFormData: FormState = {
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    national_id: "",
    status: 'active',
    birth_date: null,
    section_id: undefined,
    role_ids: [],
    avatar_url: "",
};

const dateValueToYYYYMMDD = (dateValue: DateValue | null | undefined): string | null => {
    if (!dateValue) return null;
    return `${dateValue.year}-${String(dateValue.month).padStart(2, '0')}-${String(dateValue.day).padStart(2, '0')}`;
};

export default function AddUserPage() {
    const router = useRouter();
    const [formData, setFormData] = useState<FormState>(initialFormData);
    const [birthDateValue, setBirthDateValue] = useState<DateValue | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mainSubmitButtonRef = useRef<HTMLButtonElement>(null); // Ref para el botón principal

    const [allSections, setAllSections] = useState<SectionRecord[]>([]);
    const [allRoles, setAllRoles] = useState<Role[]>([]);
    const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<FormErrors>(null);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

    const togglePasswordVisibility = () => setIsPasswordVisible(!isPasswordVisible);
    const toggleConfirmPasswordVisibility = () => setIsConfirmPasswordVisible(!isConfirmPasswordVisible);

    useEffect(() => {
        const fetchDropdownData = async () => {
            setIsLoadingDropdowns(true);
            try {
                const [sectionsRes, rolesRes] = await Promise.all([
                    fetch('/api/sections'),
                    fetch('/api/roles')
                ]);
                if (!sectionsRes.ok) throw new Error("No se pudieron cargar las secciones.");
                const sectionsData: SectionRecord[] = await sectionsRes.json();
                setAllSections(sectionsData.filter(s => s.deleted_at === null));
                if (!rolesRes.ok) throw new Error("No se pudieron cargar los roles.");
                setAllRoles(await rolesRes.json());
            } catch (error: any) {
                toast.error(error.message || "Error cargando datos para selectores.");
            } finally {
                setIsLoadingDropdowns(false);
            }
        };
        fetchDropdownData();
    }, []);

    const clearError = (fieldName: keyof FormState | 'confirmPassword') => {
        if (errors && errors[fieldName as keyof typeof errors]) {
            setErrors(prevErrors => {
                if (!prevErrors) return null;
                const newFieldErrors = { ...prevErrors };
                delete newFieldErrors[fieldName as keyof typeof errors];
                // Si no quedan errores específicos de campo, también limpiar errores generales del refine
                if (fieldName === 'password' || fieldName === 'confirmPassword') {
                    if (newFieldErrors.confirmPassword && newFieldErrors.confirmPassword._errors?.some(e => e === "Las contraseñas no coinciden.")) {
                        delete newFieldErrors.confirmPassword;
                    }
                }
                return newFieldErrors;
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === "avatar_url") {
            setAvatarPreview(value);
            // Si el usuario escribe en el campo URL, podría implicar que no quiere el archivo que acaba de subir.
            // Opcional: podrías limpiar `fileInputRef.current.value = ""` aquí.
        }
        clearError(name as keyof FormState);
    };

    const handleSingleSelectChange = (fieldName: keyof Pick<FormState, 'status' | 'section_id'>, selectedKey: Key | null) => {
        let value: any;
        value = selectedKey ? (fieldName === 'status' ? selectedKey : Number(selectedKey)) : (fieldName === 'section_id' ? null : 'active');
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        clearError(fieldName);
    };

    const handleMultiSelectChange = (fieldName: 'role_ids', selectedKeys: Set<Key> | Key[] | null) => {
        let value: number[] = [];
        if (selectedKeys instanceof Set) {
            value = Array.from(selectedKeys).map(k => Number(k));
        } else if (Array.isArray(selectedKeys)) {
            value = selectedKeys.map(k => Number(k));
        }
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        clearError(fieldName);
    };

    const handleDateChange = (date: DateValue | null) => {
        setBirthDateValue(date);
        setFormData(prev => ({ ...prev, birth_date: dateValueToYYYYMMDD(date) }));
        clearError('birth_date');
    };

    const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (fileInputRef.current) { // Limpiar el valor anterior para permitir volver a seleccionar el mismo archivo
            fileInputRef.current.value = "";
        }
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => { setAvatarPreview(reader.result as string); };
            reader.readAsDataURL(file);

            setIsUploadingAvatar(true);
            const uploadToastId = toast.loading("Subiendo imagen de avatar...");
            const fileFormData = new FormData();
            fileFormData.append("imageFile", file);

            try {
                const response = await fetch("/api/uploads/image", { method: "POST", body: fileFormData });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || "Error al subir la imagen.");

                setFormData(prev => ({ ...prev, avatar_url: result.imageUrl }));
                setAvatarPreview(result.imageUrl);
                toast.success("Imagen de avatar subida y URL actualizada.", { id: uploadToastId });
            } catch (error: any) {
                toast.error(error.message || "No se pudo subir el avatar.", { id: uploadToastId });
                setAvatarPreview(formData.avatar_url || null);
            } finally {
                setIsUploadingAvatar(false);
            }
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (isUploadingAvatar) { // No permitir submit si una imagen se está subiendo
            toast.error("Espera a que termine de subir el avatar antes de guardar.");
            return;
        }
        setIsSubmitting(true);
        setErrors(null);
        const submittingToastId = toast.loading('Agregando usuario...');

        const dataToValidate: FormState = {
            ...formData,
            birth_date: dateValueToYYYYMMDD(birthDateValue),
            first_name: formData.first_name?.trim() === "" ? null : formData.first_name?.trim(),
            last_name: formData.last_name?.trim() === "" ? null : formData.last_name?.trim(),
            national_id: formData.national_id?.trim() === "" ? null : formData.national_id?.trim(),
            avatar_url: formData.avatar_url?.trim() === "" ? null : formData.avatar_url?.trim(),
            section_id: formData.section_id ? Number(formData.section_id) : null,
        };

        const validationResult = createUserSchema.safeParse(dataToValidate);

        if (!validationResult.success) {
            setErrors(validationResult.error.format() as FormErrors);
            setIsSubmitting(false);
            toast.error("Por favor, corrige los errores en el formulario.", { id: submittingToastId });
            return;
        }
        const dataToSubmit = validationResult.data;
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSubmit),
            });
            const result = await response.json();
            if (!response.ok) {
                let errorMessage = result.message || `Error ${response.status}: Fallo al crear el usuario`;
                if (result.field && result.message) {
                    setErrors(prev => ({ ...(prev || { _errors: [] }), [result.field]: { _errors: [result.message] } }));
                    errorMessage = `Error en el campo ${result.field}: ${result.message}`; // Para el toast
                } else if (result.errors) { // Si Zod del backend devuelve errores
                    setErrors(result.errors as FormErrors); // Asumir que tiene el formato correcto
                    errorMessage = "Hay errores de validación desde el servidor.";
                }
                throw new Error(errorMessage);
            }
            toast.success(result.message || `Usuario "${dataToSubmit.email}" agregado!`, { id: submittingToastId });
            router.push('/dashboard/users');
            router.refresh();
        } catch (err: any) {
            console.error("Error creating user:", err);
            toast.error(err.message || "Ocurrió un error al agregar el usuario.", { id: submittingToastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingDropdowns) {
        return <div className="flex justify-center items-center h-[calc(100vh-100px)]"><Spinner label="Cargando opciones..." /></div>;
    }

    return (
        <div className="container mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
                <Button as={NextUILink} href="/dashboard/users" variant="light" startContent={<ArrowLeftIcon />}>
                    Volver a Lista de Usuarios
                </Button>
            </div>
            <Card className="shadow-xl">
                <CardHeader><h1 className="text-2xl font-bold text-foreground">Agregar Nuevo Usuario</h1></CardHeader>
                <Divider />
                <CardBody>
                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div className="flex flex-col items-center space-y-3 p-4 border border-default-200 rounded-medium">
                            <h3 className="text-lg font-medium text-foreground-600 self-start">Avatar (Opcional)</h3>
                            <div className="relative group">
                                <Avatar
                                    src={avatarPreview || undefined}
                                    name={formData.first_name?.charAt(0) || formData.email?.charAt(0) || "U"}
                                    className="w-32 h-32 text-large border-2 border-default-200 group-hover:border-primary transition-colors"
                                />
                                <Button
                                    isIconOnly
                                    radius="full"
                                    variant="flat"
                                    className="absolute bottom-1 right-1 bg-background/70 backdrop-blur-sm group-hover:bg-primary/20"
                                    onPress={() => fileInputRef.current?.click()}
                                    isDisabled={isUploadingAvatar || isSubmitting}
                                    aria-label="Cambiar avatar"
                                    type="button" // Importante: asegurar que no sea submit por defecto
                                >
                                    {isUploadingAvatar ? <Spinner size="sm" /> : <EditIcon className="text-default-500 group-hover:text-primary" />}
                                </Button>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleAvatarFileChange}
                                accept="image/png, image/jpeg, image/webp, image/gif"
                                className="hidden"
                                id="avatar-file-input"
                                disabled={isUploadingAvatar || isSubmitting}
                            />
                            <Input
                                name="avatar_url"
                                type="url"
                                label="O ingresa URL del Avatar"
                                value={formData.avatar_url || ""}
                                onChange={handleChange}
                                variant="bordered"
                                isDisabled={isUploadingAvatar || isSubmitting}
                                isInvalid={!!errors?.avatar_url?._errors.length}
                                errorMessage={errors?.avatar_url?._errors.join(", ")}
                                placeholder="https://ejemplo.com/avatar.png"
                                size="sm"
                            />
                        </div>
                        <Divider />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input name="first_name" label="Nombre(s)" value={formData.first_name || ""} onChange={handleChange} variant="bordered" isDisabled={isSubmitting} isInvalid={!!errors?.first_name?._errors.length} errorMessage={errors?.first_name?._errors.join(", ")} />
                            <Input name="last_name" label="Apellido(s)" value={formData.last_name || ""} onChange={handleChange} variant="bordered" isDisabled={isSubmitting} isInvalid={!!errors?.last_name?._errors.length} errorMessage={errors?.last_name?._errors.join(", ")} />
                        </div>
                        <Input name="email" type="email" label="Email" value={formData.email} onChange={handleChange} variant="bordered" isRequired isDisabled={isSubmitting} isInvalid={!!errors?.email?._errors.length} errorMessage={errors?.email?._errors.join(", ")} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input name="password" type={isPasswordVisible ? "text" : "password"} label="Contraseña" value={formData.password} onChange={handleChange} variant="bordered" isRequired isDisabled={isSubmitting} isInvalid={!!errors?.password?._errors.length} errorMessage={errors?.password?._errors.join(", ")} endContent={<button className="focus:outline-none" type="button" onClick={togglePasswordVisibility}> {isPasswordVisible ? <EyeSlashFilledIcon className="text-2xl text-default-400" /> : <EyeFilledIcon className="text-2xl text-default-400" />} </button>} />
                            <Input name="confirmPassword" type={isConfirmPasswordVisible ? "text" : "password"} label="Confirmar Contraseña" value={formData.confirmPassword} onChange={handleChange} variant="bordered" isRequired isDisabled={isSubmitting} isInvalid={!!errors?.confirmPassword?._errors.length} errorMessage={errors?.confirmPassword?._errors.join(", ")} endContent={<button className="focus:outline-none" type="button" onClick={toggleConfirmPasswordVisibility}> {isConfirmPasswordVisible ? <EyeSlashFilledIcon className="text-2xl text-default-400" /> : <EyeFilledIcon className="text-2xl text-default-400" />} </button>} />
                        </div>
                        <Input name="national_id" label="ID Nacional (CI)" value={formData.national_id || ""} onChange={handleChange} variant="bordered" isDisabled={isSubmitting} isInvalid={!!errors?.national_id?._errors.length} errorMessage={errors?.national_id?._errors.join(", ")} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <DatePicker name="birth_date" label="Fecha de Nacimiento" value={birthDateValue} onChange={handleDateChange} variant="bordered" granularity="day" showMonthAndYearPickers isDisabled={isSubmitting} isInvalid={!!errors?.birth_date?._errors.length} errorMessage={errors?.birth_date?._errors.join(", ")} />
                            <Select label="Estado" name="status" placeholder="Seleccionar estado" defaultSelectedKeys={[formData.status || 'active']} variant="bordered" isRequired isDisabled={isSubmitting} isInvalid={!!errors?.status?._errors.length} errorMessage={errors?.status?._errors.join(", ")} onSelectionChange={(keys) => handleSingleSelectChange('status', Array.from(keys as Set<Key>)[0])}>
                                {userStatusEnum.options.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                            </Select>
                        </div>

                        <Autocomplete
                            name="section_id"
                            label="Sección (Opcional)"
                            placeholder="Buscar y seleccionar sección..."
                            items={allSections}
                            selectedKey={formData.section_id ? String(formData.section_id) : null}
                            onSelectionChange={(key) => handleSingleSelectChange('section_id', key as Key | null)}
                            variant="bordered"
                            isDisabled={isSubmitting || isLoadingDropdowns}
                            isLoading={isLoadingDropdowns}
                            isInvalid={!!errors?.section_id?._errors.length}
                            errorMessage={errors?.section_id?._errors.join(", ")}
                            allowsCustomValue={false}
                            onClear={() => handleSingleSelectChange('section_id', null)}
                        >
                            {(section) => <AutocompleteItem key={section.id} textValue={section.name}>{section.name}</AutocompleteItem>}
                        </Autocomplete>

                        <Select label="Roles" name="role_ids" placeholder="Seleccionar roles" items={allRoles} selectionMode="multiple" selectedKeys={new Set(formData.role_ids?.map(String) || [])} variant="bordered" isDisabled={isSubmitting || isLoadingDropdowns} isLoading={isLoadingDropdowns} isInvalid={!!errors?.role_ids?._errors.length} errorMessage={errors?.role_ids?._errors.join(", ")} onSelectionChange={(keys) => handleMultiSelectChange('role_ids', keys as Set<Key>)}>
                            {(role) => <SelectItem key={role.id} value={String(role.id)} textValue={role.name}>{role.name}</SelectItem>}
                        </Select>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="flat" onPress={() => router.push("/dashboard/users")} isDisabled={isSubmitting || isUploadingAvatar} type="button">Cancelar</Button>
                            <Button ref={mainSubmitButtonRef} type="submit" color="primary" isLoading={isSubmitting} isDisabled={isSubmitting || isUploadingAvatar}>
                                {isSubmitting ? "Guardando..." : "Agregar Usuario"}
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}