// lib/schema.ts
import { RowDataPacket } from "mysql2";
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


export const assetStatusEnum = z.enum(['in_use', 'in_storage', 'under_repair', 'disposed', 'lost'], {
    required_error: "El estado es requerido.",
});

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


export const sectionSchema = z.object({
    name: z.string().min(1, "El nombre es requerido.").max(100, "El nombre no puede exceder los 100 caracteres."),
    management_level: z.coerce.number().int("El nivel debe ser un entero.").min(1, "El nivel de conducción es requerido.").optional().nullable(),
    email: z.string().email("Email inválido.").max(100, "El email no puede exceder los 100 caracteres.").optional().nullable(),
    parent_section_id: z.coerce.number().int().positive("ID de sección padre inválido.").optional().nullable(),
});

export const createSectionSchema = sectionSchema;
export const updateSectionSchema = sectionSchema.partial(); // Para PUT, todos los campos son opcionales


export const companySchema = z.object({
    tax_id: z.string().min(1, "El RUT/Tax ID es requerido.").max(50, "Máximo 50 caracteres."),
    legal_name: z.string().min(1, "La Razón Social es requerida.").max(100, "Máximo 100 caracteres."),
    trade_name: z.string().max(100, "Máximo 100 caracteres.").optional().nullable(),
    email: z.string().email("Email inválido.").max(100, "Máximo 100 caracteres.").optional().nullable(),
    phone_number: z.string().max(50, "Máximo 50 caracteres.").optional().nullable(),
});

export const createCompanySchema = companySchema;
export const updateCompanySchema = companySchema.partial();


export const locationSchema = z.object({ // Renombrado de placeSchema a locationSchema
    name: z.string().min(1, "El nombre de la ubicación es requerido.").max(100, "Máximo 100 caracteres."),
    description: z.string().max(255, "Máximo 255 caracteres.").optional().nullable(),
    section_id: z.coerce.number().int().positive("La sección de dependencia es requerida.").optional().nullable(),
});

export const createLocationSchema = locationSchema.refine(data => data.section_id !== null && data.section_id !== undefined, {
    message: "La sección de dependencia es requerida para crear una ubicación.",
    path: ["section_id"],
}); // Renombrado de createPlaceSchema
export const updateLocationSchema = locationSchema.partial(); // Renombrado de updatePlaceSchema..



export const createAssetSchema = z.object({
    product_name: z.string().min(1, "El nombre del producto es requerido.").max(100, "Máximo 100 caracteres."),
    serial_number: z.string().max(100, "Máximo 100 caracteres.").nullable().optional(),
    inventory_code: z.string().min(1, "El código de inventario es requerido.").max(200, "Máximo 200 caracteres."),
    description: z.string().max(65535, "Descripción demasiado larga.").nullable().optional(), // TEXT en SQL
    current_section_id: z.coerce.number({ required_error: "La sección es requerida." }).int().positive(),
    current_location_id: z.coerce.number().int().positive().nullable().optional(),
    supplier_company_id: z.coerce.number().int().positive().nullable().optional(),
    purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha debe ser YYYY-MM-DD").nullable().optional(),
    invoice_number: z.string().max(50, "Máximo 50 caracteres.").nullable().optional(),
    warranty_expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha debe ser YYYY-MM-DD").nullable().optional(),
    acquisition_procedure: z.string().max(200, "Máximo 200 caracteres.").nullable().optional(),
    status: assetStatusEnum,
    image_url: z.string().url("Debe ser una URL válida.").max(255).nullable().optional(),
});

// Esquema para un lote de activos (campos comunes + array de seriales)
export const createMultipleAssetsSchema = z.object({
    commonData: createAssetSchema.omit({ serial_number: true }), // Datos comunes sin el serial
    serial_numbers: z.array(z.string().min(1, "El número de serie no puede estar vacío.").max(100)).min(1, "Debe ingresar al menos un número de serie."),
});

// Esquema para la validación de una fila del CSV (similar a createAssetSchema pero todos opcionales para validación inicial)
export const csvAssetRowSchema = createAssetSchema.deepPartial().extend({
    // Asegurar que los campos obligatorios en la DB lo sean también aquí si es necesario post-parseo
    product_name: z.string().min(1, "product_name es requerido en CSV").max(100).optional(),
    inventory_code: z.string().min(1, "inventory_code es requerido en CSV").max(200).optional(),
    current_section_name: z.string().min(1, "current_section_name es requerido en CSV").optional(), // Para buscar ID
    status: assetStatusEnum.optional(),
});

export interface IAssetAPI extends RowDataPacket {
    id: number;
    serial_number: string | null;
    inventory_code: string;
    description: string | null;
    product_name: string;
    warranty_expiry_date: string | null; // Formato YYYY-MM-DD
    current_section_id: number | null;
    current_section_name: string | null;
    current_location_id: number | null;
    current_location_name: string | null;
    supplier_company_id: number | null;
    supplier_company_name: string | null;
    supplier_company_tax_id: string | null;
    purchase_date: string | null; // Formato YYYY-MM-DD
    invoice_number: string | null;
    acquisition_procedure: string | null;
    status: 'in_use' | 'in_storage' | 'under_repair' | 'disposed' | 'lost' | null;
    image_url: string | null;
    created_at: string; // Formato ISO string
    updated_at: string; // Formato ISO string
    // deleted_at?: string | null; // Si eventualmente implementas soft delete para assets
}