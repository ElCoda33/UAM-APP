// RUTA: components/NotificationBell.tsx
// Por favor, reemplaza todo el contenido del archivo con este código.

"use client";

import React, { useState, useEffect } from 'react';
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Button, Badge, Spinner } from "@heroui/react";
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { BellIcon } from '@/components/icons/BellIcon';

interface Notification {
  id: number;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// Hook personalizado para la lógica de notificaciones
function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error("No se pudieron cargar las notificaciones.");
      const data: Notification[] = await response.json();
      setNotifications(data);
    } catch (error: any) {
      console.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Polling cada 60 segundos
    return () => clearInterval(interval);
  }, []);

  return { notifications, isLoading, setNotifications };
}

export default function NotificationBell() {
  const { notifications, isLoading, setNotifications } = useNotifications();
  const router = useRouter();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (ids: number[]) => {
    try {
      await fetch('/api/notifications/mark-as-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: ids }),
      });
      setNotifications(prev =>
        prev.map(n => (ids.includes(n.id) ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      toast.error("Error al marcar la notificación como leída.");
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead([notification.id]);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllAsRead = () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  };

  return (
    <Dropdown placement="bottom-end">
      <Badge content={unreadCount > 0 ? unreadCount : ""} color="danger" isInvisible={unreadCount === 0}>
        <DropdownTrigger>
          <Button isIconOnly radius="full" variant="light">
            <BellIcon className="text-default-500" size={22} />
          </Button>
        </DropdownTrigger>
      </Badge>
      <DropdownMenu
        aria-label="Menú de Notificaciones"
        className="max-w-[340px]"
        itemClasses={{
          base: "gap-4",
        }}
      >
        <DropdownItem key="header" isReadOnly className="cursor-default">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Notificaciones</span>
            {unreadCount > 0 && (
              <Button size="sm" variant="light" color="primary" onPress={handleMarkAllAsRead}>
                Marcar todas como leídas
              </Button>
            )}
          </div>
        </DropdownItem>
        {isLoading ? (
          <DropdownItem key="loading" isReadOnly>
            {/* ESTA ES LA LÍNEA CORREGIDA */}
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <span>Cargando...</span>
            </div>
          </DropdownItem>
        ) : notifications.length === 0 ? (
          <DropdownItem key="empty" isReadOnly>
            No tienes notificaciones.
          </DropdownItem>
        ) : (
          notifications.map(n => (
            <DropdownItem
              key={n.id}
              description={new Date(n.created_at).toLocaleString()}
              className={!n.is_read ? 'bg-primary-50 dark:bg-primary-900/20' : ''}
              onPress={() => handleNotificationClick(n)}
            >
              {n.message}
            </DropdownItem>
          ))
        )}
      </DropdownMenu>
    </Dropdown>
  );
}