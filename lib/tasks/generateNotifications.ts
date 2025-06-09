// RUTA: lib/tasks/generateNotifications.ts

import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

interface LicenseToExpire extends RowDataPacket {
  id: number;
  software_name: string;
  expiry_date: string;
  assigned_to_user_id: number | null;
}

// Interfaz para los IDs de los administradores
interface AdminUser extends RowDataPacket {
  id: number;
}

interface NotificationCheck extends RowDataPacket {
  id: number;
}

// Función principal que será llamada por el cron job
export async function generateDailyNotifications() {
  console.log('Iniciando la tarea diaria de generación de notificaciones...');
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // --- INICIO DE LA MODIFICACIÓN ---

    // 1. Obtener una lista de todos los usuarios administradores activos.
    const [adminUsers] = await connection.query<AdminUser[]>(`
        SELECT u.id FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        WHERE r.name = 'Admin' AND u.deleted_at IS NULL;
    `);

    // Si no hay administradores, no se envían notificaciones de administrador.
    const adminUserIds = adminUsers.map(u => u.id);
    if (adminUserIds.length > 0) {
      console.log(`Se notificarán a ${adminUserIds.length} administradores.`);
    }

    // 2. Notificaciones de Licencias por Vencer (ej: en los próximos 30 días)
    const [licenses] = await connection.query<LicenseToExpire[]>(`
      SELECT id, software_name, expiry_date, assigned_to_user_id
      FROM software_licenses
      WHERE deleted_at IS NULL
        AND expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY);
    `);

    for (const license of licenses) {
      const daysLeft = Math.ceil((new Date(license.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      const message = `La licencia para "${license.software_name}" vence en ${daysLeft} días.`;

      // A. Notificar al usuario responsable (si lo hay y no es un admin)
      const responsibleUserId = license.assigned_to_user_id;
      if (responsibleUserId && !adminUserIds.includes(responsibleUserId)) {
        const [existingResp] = await connection.query<NotificationCheck[]>(
          `SELECT id FROM notifications WHERE entity_type = 'software_license' AND entity_id = ? AND type = 'LICENSE_EXPIRING_SOON' AND is_read = false AND user_id = ?`,
          ['software_license', license.id, responsibleUserId]
        );
        if (existingResp.length === 0) {
          await connection.query(
            `INSERT INTO notifications (user_id, type, message, link, entity_type, entity_id) VALUES (?, 'LICENSE_EXPIRING_SOON', ?, ?, 'software_license', ?)`,
            [responsibleUserId, message, `/dashboard/softwareLicenses/${license.id}`, license.id]
          );
          console.log(`Notificación creada para responsable (ID ${responsibleUserId}): ${message}`);
        }
      }

      // B. Notificar a TODOS los administradores
      for (const adminId of adminUserIds) {
        const [existingAdmin] = await connection.query<NotificationCheck[]>(
          `SELECT id FROM notifications WHERE entity_type = 'software_license' AND entity_id = ? AND type = 'LICENSE_EXPIRING_SOON' AND is_read = false AND user_id = ?`,
          ['software_license', license.id, adminId]
        );
        if (existingAdmin.length === 0) {
          await connection.query(
            `INSERT INTO notifications (user_id, type, message, link, entity_type, entity_id) VALUES (?, 'LICENSE_EXPIRING_SOON', ?, ?, 'software_license', ?)`,
            [adminId, message, `/dashboard/softwareLicenses/${license.id}`, license.id]
          );
          console.log(`Notificación creada para admin (ID ${adminId}): ${message}`);
        }
      }
    }

    // --- FIN DE LA MODIFICACIÓN ---

    // --- AQUÍ PUEDES AÑADIR MÁS LÓGICAS DE NOTIFICACIÓN PARA ADMINS ---
    // Ej: Notificaciones de activos cuyo préstamo/renta está por vencer.
    // Ej: Notificaciones de mantenimientos programados.

    await connection.commit();
    console.log('Tarea de notificaciones completada exitosamente.');

  } catch (error) {
    await connection.rollback();
    console.error('Error durante la generación de notificaciones:', error);
  } finally {
    connection.release();
  }
}