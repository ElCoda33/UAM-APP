// app/api/roles/route.ts
import { NextResponse, NextRequest } from 'next/server'; // Asegúrate de importar NextRequest si lo usas
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise'; // Importa RowDataPacket si es necesario para tipar

export async function GET(request: NextRequest) { // Cambiado request: Request a request: NextRequest
    const session = await getServerSession(authOptions);
    if (!session) { // Simplificado el chequeo de sesión, ya que si no hay sesión, user tampoco existirá
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const pool = getPool(); // Mover la obtención del pool dentro del try para mejor manejo si falla
    let connection; // Definir connection fuera para poder usarla en finally

    try {
        connection = await pool.getConnection();
        // MODIFIED QUERY: Añadido WHERE deleted_at IS NULL
        const [rolesData] = await connection.query<RowDataPacket[]>(
            "SELECT id, name FROM roles WHERE deleted_at IS NULL ORDER BY name ASC"
        );
        // El tipo RowDataPacket[] es genérico, si tienes una interfaz específica para Role (ej. RoleOption) puedes usarla.
        // const rolesTyped = rolesData as RoleOption[]; // Ejemplo de casteo si RoleOption es {id: number, name: string}
        return NextResponse.json(rolesData, { status: 200 });
    } catch (error) {
        console.error('Error fetching roles:', error);
        return NextResponse.json({ message: 'Error interno al obtener roles' }, { status: 500 });
    } finally {
        if (connection) {
            try {
                connection.release();
            } catch (releaseError) {
                console.error('Error releasing connection in /api/roles:', releaseError);
            }
        }
    }
}