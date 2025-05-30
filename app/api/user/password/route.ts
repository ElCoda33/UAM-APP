// app/api/user/password/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { changePasswordSchema } from "../../../../lib/schema";
import { z } from "zod";
// import { getUserById, verifyPassword, updateUserPassword } from "@/lib/db"; // Tus funciones de DB
// import bcrypt from 'bcrypt'; // bcrypt v5.1.1

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const validationResult = changePasswordSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                { message: "Datos inválidos.", errors: validationResult.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { currentPassword, newPassword } = validationResult.data;
        const userId = session.user.id;

        // --- Lógica de Base de Datos y Bcrypt (bcrypt v5.1.1) ---
        // 1. Obtener el hash de la contraseña actual del usuario desde la DB
        // const user = await getUserById(userId);
        // if (!user || !user.passwordHash) {
        //   return NextResponse.json({ message: "Usuario no encontrado." }, { status: 404 });
        // }

        // 2. Verificar la contraseña actual
        // const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        // if (!isCurrentPasswordValid) {
        //   return NextResponse.json(
        //     { message: "La contraseña actual es incorrecta.", errors: { currentPassword: ["La contraseña actual es incorrecta."] } },
        //     { status: 400 }
        //   );
        // }

        // 3. Hashear la nueva contraseña
        // const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // 4. Actualizar la contraseña en la base de datos
        // await updateUserPassword(userId, newPasswordHash);

        console.log(`Cambiando contraseña para usuario ${userId}. Actual: ${currentPassword}, Nueva: ${newPassword}`);
        // Simulación:
        if (currentPassword === "wrongpassword") {
            return NextResponse.json(
                { message: "La contraseña actual es incorrecta.", errors: { currentPassword: ["La contraseña actual es incorrecta."] } },
                { status: 400 }
            );
        }

        return NextResponse.json({ message: "Contraseña actualizada correctamente." }, { status: 200 });
    } catch (error) {
        console.error("Error en API PUT /api/user/password:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { message: "Error de validación.", errors: error.flatten().fieldErrors },
                { status: 400 }
            );
        }
        return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
    }
}