// app/api/user/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { updateProfileSchema } from "../../../../lib/schema";
import { z } from "zod";
// import { updateUserProfile } from "@/lib/db"; // Tu función para actualizar en MySQL

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validationResult = updateProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: "Datos inválidos.",
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }


    
    const { lastName } = validationResult.data;

    // Lógica para actualizar en la base de datos (mysql2)
    // Ejemplo:
    // await updateUserProfile(session.user.id, { lastName });
    console.log(`Actualizando perfil para usuario ${session.user.id}: Nombre: ${lastName}`);
    // Simulación de éxito
    if (lastName === "error") { // Para probar errores
      return NextResponse.json({ message: "Error simulado al actualizar DB" }, { status: 500 });
    }


    return NextResponse.json({ message: "Perfil actualizado correctamente." }, { status: 200 });
  } catch (error) {
    console.error("Error en API PUT /api/user/profile:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Error de validación.", errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}