// app/api/user/password/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { changePasswordSchema } from "../../../../lib/schema";
import { z } from "zod";
import bcrypt from 'bcrypt';
import { getPool } from "@/lib/db"; // Para interactuar con la base de datos
import { RowDataPacket } from "mysql2/promise"; // Para tipar resultados de MySQL

// Interfaz para el usuario recuperado de la base de datos con el hash de la contraseña
interface UserWithPasswordHash extends RowDataPacket {
    id: number; // O string, dependiendo de cómo lo manejes consistentemente
    password_hash: string | null;
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    let pool; // Declara pool fuera para poder usarlo en el bloque finally si es necesario (aunque aquí no se usa así)

    try {
        const body = await request.json();
        console.log("API /api/user/password - Received body:", body);
        const validationResult = changePasswordSchema.safeParse(body);

        if (!validationResult.success) {
            console.error("API /api/user/password - Zod validation errors:", validationResult.error.flatten().fieldErrors);
            return NextResponse.json(
                { message: "Datos inválidos.", errors: validationResult.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { currentPassword, newPassword } = validationResult.data;
        // El ID de la sesión de NextAuth es un string, pero tu DB usa INT UNSIGNED. Convertir.
        const userId = parseInt(session.user.id, 10);

        if (isNaN(userId)) {
            console.error("API /api/user/password - Invalid user ID format from session:", session.user.id);
            return NextResponse.json({ message: "ID de usuario inválido en la sesión." }, { status: 400 });
        }

        pool = getPool(); // Obtener el pool de conexiones

        // 1. Obtener el hash de la contraseña actual del usuario desde la DB
        const [userRows] = await pool.query<UserWithPasswordHash[]>(
            "SELECT id, password_hash FROM users WHERE id = ?",
            [userId]
        );

        if (userRows.length === 0) {
            return NextResponse.json({ message: "Usuario no encontrado." }, { status: 404 });
        }
        const userFromDb = userRows[0];

        if (!userFromDb.password_hash) {
            // Este caso podría ocurrir si el usuario se registró vía OAuth y nunca estableció una contraseña local.
            return NextResponse.json({ message: "El usuario no tiene una contraseña basada en hash configurada." }, { status: 400 });
        }

        // 2. Verificar la contraseña actual
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userFromDb.password_hash);
        if (!isCurrentPasswordValid) {
            return NextResponse.json(
                { message: "La contraseña actual es incorrecta.", errors: { currentPassword: ["La contraseña actual es incorrecta."] } },
                { status: 400 }
            );
        }

        // 3. Hashear la nueva contraseña
        const saltRounds = 10; // Cost factor para bcrypt
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // 4. Actualizar la contraseña en la base de datos
        const [updateResult] = await pool.query(
            "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?",
            [newPasswordHash, userId]
        );

        // Verificar si la actualización fue exitosa (affectedRows > 0)
        // (updateResult as any).affectedRows
        if ((updateResult as any).affectedRows === 0) {
            console.warn(`API /api/user/password - No se actualizó ninguna fila para el usuario ID: ${userId}. ¿Existe el usuario?`);
            // Esto podría ser un 404 si el usuario desapareció entre la lectura y la escritura, o 500.
            return NextResponse.json({ message: "No se pudo actualizar la contraseña, usuario no afectado." }, { status: 500 });
        }

        console.log(`Contraseña actualizada exitosamente para el usuario ID: ${userId}.`);
        return NextResponse.json({ message: "Contraseña actualizada correctamente." }, { status: 200 });

    } catch (error) {
        console.error("Error catastrófico en API PUT /api/user/password:", error);
        // Si el error es una instancia de ZodError (aunque con safeParse es menos probable llegar aquí por eso)
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { message: "Error de validación (inesperado en este punto).", errors: error.flatten().fieldErrors },
                { status: 400 }
            );
        }
        // Para otros errores (ej. DB_CONNECT_ERROR, errores de bcrypt no esperados)
        return NextResponse.json({ message: "Error interno del servidor al intentar cambiar la contraseña." }, { status: 500 });
    }
}