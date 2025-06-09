// NUEVO ARCHIVO: app/api/notifications/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

export interface NotificationRecord extends RowDataPacket {
  id: number;
  type: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// GET: Obtener las notificaciones del usuario logueado
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  const userId = parseInt(session.user.id, 10);
  const pool = getPool();

  try {
    const query = `
      SELECT id, type, message, link, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50; -- Limitar para no sobrecargar
    `;
    const [rows] = await pool.query<NotificationRecord[]>(query, [userId]);

    const notifications = rows.map(n => ({
      ...n,
      created_at: new Date(n.created_at).toISOString(),
    }));

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('API Error GET /api/notifications:', error);
    return NextResponse.json({ message: 'Error al obtener notificaciones' }, { status: 500 });
  }
}