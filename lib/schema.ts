// lib/schema.ts
import { z } from "zod";

// Esquema de perfil actualizado
export const updateProfileSchema = z.object({
    firstName: z.string()
        .min(1, "El nombre es requerido.")
        .max(50, "El nombre no puede exceder los 50 caracteres.")
        .optional(),
    lastName: z.string()
        .min(1, "El apellido es requerido.")
        .max(50, "El apellido no puede exceder los 50 caracteres.")
        .optional(),
});

// Esquema de cambio de contraseña actualizado
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "La contraseña actual es requerida."),
    newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
    // --- MODIFICACIÓN AQUÍ ---
    confirmPassword: z.string().min(1, "La confirmación de contraseña es requerida."),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Las nuevas contraseñas no coinciden.",
    // El path asegura que este error del refine se asocie con confirmPassword
    path: ["confirmPassword"],
});

const assetStatusEnum = z.enum(['in_use', 'in_storage', 'under_repair', 'disposed', 'lost']);

export const updateAssetSchema = z.object({
    product_name: z.string().min(1, "El nombre del producto es requerido.").max(100, "Máximo 100 caracteres."),
    serial_number: z.string().max(100, "Máximo 100 caracteres.").nullable().optional(),
    inventory_code: z.string().min(1, "El código de inventario es requerido.").max(200, "Máximo 200 caracteres."),
    description: z.string().max(1000, "Máximo 1000 caracteres.").nullable().optional(),
    current_section_id: z.number({ required_error: "La sección es requerida." }).int().positive(),
    current_location_id: z.number().int().positive().nullable().optional(),
    supplier_company_id: z.number().int().positive().nullable().optional(),
    purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha debe ser YYYY-MM-DD").nullable().optional(),
    invoice_number: z.string().max(50, "Máximo 50 caracteres.").nullable().optional(),
    warranty_expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha debe ser YYYY-MM-DD").nullable().optional(),
    acquisition_procedure: z.string().max(200, "Máximo 200 caracteres.").nullable().optional(),
    status: assetStatusEnum.refine(val => val !== null, { message: "El estado es requerido." }),
    image_url: z.string().url("Debe ser una URL válida.").max(255).nullable().optional(),
});