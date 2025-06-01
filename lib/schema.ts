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