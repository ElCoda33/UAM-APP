// lib/schema.ts
import { z } from "zod";

export const updateProfileSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres.").max(50, "El nombre no puede exceder los 50 caracteres.").optional(),
    // email: z.string().email("Email inválido.").optional(), // La actualización de email suele ser más compleja
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "La contraseña actual es requerida."),
    newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Las nuevas contraseñas no coinciden.",
    path: ["confirmPassword"], // Campo donde se mostrará el error
});