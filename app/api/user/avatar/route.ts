// app/api/user/avatar/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
// import { updateUserAvatarUrl } from "@/lib/db"; // Tu función para actualizar en MySQL
// import { writeFile } from 'fs/promises'; // Para guardar localmente (ejemplo, no ideal para prod)
// import path from 'path'; // Para guardar localmente

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("avatar") as File | null;

        if (!file) {
            return NextResponse.json({ message: "No se proporcionó ningún archivo." }, { status: 400 });
        }

        // Validación básica del archivo (tamaño, tipo)
        if (file.size > 5 * 1024 * 1024) { // 5MB límite
            return NextResponse.json({ message: "El archivo es demasiado grande (máx 5MB)." }, { status: 400 });
        }
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ message: "Tipo de archivo no permitido." }, { status: 400 });
        }

        // --- Lógica de Almacenamiento ---
        // Aquí es donde subirías el archivo a un servicio de almacenamiento
        // o lo guardarías en el servidor y obtendrías una URL.
        // Ejemplo MUY BÁSICO guardando localmente (NO RECOMENDADO PARA PRODUCCIÓN):
        // const bytes = await file.arrayBuffer();
        // const buffer = Buffer.from(bytes);
        // const filename = `${session.user.id}-${Date.now()}-${file.name.replace(/\s/g, '_')}`;
        // const filePath = path.join(process.cwd(), 'public', 'uploads', 'avatars', filename);
        // await writeFile(filePath, buffer);
        // const newAvatarUrl = `/uploads/avatars/${filename}`; // URL pública relativa

        // Simulación para este ejemplo:
        const newAvatarUrl = `/placeholder-avatar-${Date.now()}.png`; // URL simulada
        console.log(`Avatar para usuario ${session.user.id} "subido" a: ${newAvatarUrl}`);

        // Actualiza la URL del avatar en tu base de datos (mysql2)
        // await updateUserAvatarUrl(session.user.id, newAvatarUrl);

        return NextResponse.json(
            { message: "Avatar subido correctamente.", newAvatarUrl },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error en API POST /api/user/avatar:", error);
        return NextResponse.json({ message: "Error interno del servidor al subir avatar." }, { status: 500 });
    }
}