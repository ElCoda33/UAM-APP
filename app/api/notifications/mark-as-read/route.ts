// NUEVO ARCHIVO: app/api/notifications/mark-as-read/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { ResultSetHeader } from 'mysql2/promise';

// POST: Marcar notificaciones como leídas
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  const userId = parseInt(session.user.id, 10);

  try {
    const { notificationIds } = await request.json(); // Se espera un array de IDs

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ message: 'Se requiere un array de IDs de notificación.' }, { status: 400 });
    }

    const pool = getPool();
    const query = `
            UPDATE notifications
            SET is_read = TRUE
            WHERE user_id = ? AND id IN (?);
        `;

    const [result] = await pool.query<ResultSetHeader>(query, [userId, notificationIds]);

    return NextResponse.json({ message: 'Notificaciones marcadas como leídas.', affectedRows: result.changedRows });

  } catch (error) {
    console.error('API Error POST /api/notifications/mark-as-read:', error);
    return NextResponse.json({ message: 'Error al marcar notificaciones como leídas' }, { status: 500 });
  }
}