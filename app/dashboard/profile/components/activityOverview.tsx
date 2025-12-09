// app/dashboard/profile/components/activityOverview.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody, Spinner, Chip } from "@heroui/react";
import { Package, TrendingUp, Clock } from "lucide-react";
import { toast } from "react-hot-toast";

interface ActivityOverviewProps {
  userId: string;
}

interface UserStats {
  assetsAssigned: number;
  recentMovements: number;
  pendingActions: number;
}

export default function ActivityOverview({ userId }: ActivityOverviewProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      setIsLoading(true);
      try {
        // TODO: Replace with actual API endpoint when available
        // const response = await fetch(`/api/users/${userId}/stats`);
        // const data = await response.json();

        // Simulated data for now
        await new Promise(resolve => setTimeout(resolve, 500));
        setStats({
          assetsAssigned: 0,
          recentMovements: 0,
          pendingActions: 0,
        });
      } catch (error) {
        console.error("Error fetching user stats:", error);
        toast.error("Error al cargar estadísticas de actividad");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserStats();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Spinner label="Cargando actividad..." color="primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-md">
          <CardBody className="flex flex-row items-center gap-4 p-6">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-default-500">Activos Asignados</p>
              <p className="text-2xl font-bold text-foreground">{stats?.assetsAssigned || 0}</p>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-md">
          <CardBody className="flex flex-row items-center gap-4 p-6">
            <div className="p-3 bg-success-100 dark:bg-success-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-default-500">Movimientos (30 días)</p>
              <p className="text-2xl font-bold text-foreground">{stats?.recentMovements || 0}</p>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-md">
          <CardBody className="flex flex-row items-center gap-4 p-6">
            <div className="p-3 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-default-500">Acciones Pendientes</p>
              <p className="text-2xl font-bold text-foreground">{stats?.pendingActions || 0}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <h3 className="text-xl font-semibold text-foreground">Actividad Reciente</h3>
        </CardHeader>
        <CardBody>
          <div className="text-center py-8 text-default-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay actividad reciente para mostrar</p>
            <p className="text-sm mt-2">Las acciones que realices aparecerán aquí</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
