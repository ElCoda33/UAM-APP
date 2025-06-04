// app/dashboard/components/charts/AssetsByStatusChart.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { Spinner, Card, CardHeader, CardBody } from "@heroui/react";
import { toast } from 'react-hot-toast';

// Registrar los componentes necesarios de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface ChartDataPoint {
  status: string; // ej: 'in_use', 'in_storage'
  count: number;
}

// Mapeo de claves de estado a etiquetas legibles y colores (puedes expandirlo)
// Los colores deben ser códigos hexadecimales, rgba, o nombres de color CSS válidos.
// Estos colores son ejemplos, ajústalos a tu paleta.
const statusDisplayMap: Record<string, { label: string; color: string }> = {
  in_use: { label: 'En Uso', color: '#4CAF50' }, // Verde
  in_storage: { label: 'En Depósito', color: '#FFC107' }, // Ámbar
  under_repair: { label: 'En Reparación', color: '#2196F3' }, // Azul
  disposed: { label: 'Dado de Baja', color: '#F44336' }, // Rojo
  lost: { label: 'Perdido', color: '#9E9E9E' }, // Gris
  // Añade más estados si los tienes
};

export default function AssetsByStatusChart() {
  const [chartData, setChartData] = useState<any>(null); // any para la estructura de datos de Chart.js
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/stats/assets-by-status');
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Error al cargar datos para el gráfico');
        }
        const data: ChartDataPoint[] = await response.json();

        if (data && data.length > 0) {
          const labels = data.map(item => statusDisplayMap[item.status]?.label || item.status);
          const counts = data.map(item => item.count);
          const backgroundColors = data.map(item => statusDisplayMap[item.status]?.color || '#CCCCCC'); // Color por defecto

          setChartData({
            labels: labels,
            datasets: [
              {
                label: 'Cantidad de Activos',
                data: counts,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => color.replace('0.8', '1')), // Borde más opaco
                borderWidth: 1,
              },
            ],
          });
        } else {
          setChartData(null); // o un estado para "no hay datos"
        }
      } catch (err: any) {
        setError(err.message);
        toast.error(err.message || "No se pudieron cargar los datos del gráfico de activos.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const, // o 'bottom', 'left', 'right'
      },
      title: {
        display: false, // El título ya está en el CardHeader
        // text: 'Distribución de Activos por Estado',
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += context.parsed;
            }
            // Puedes añadir porcentaje aquí si lo deseas
            // const total = context.dataset.data.reduce((acc: number, val: number) => acc + val, 0);
            // const percentage = ((context.parsed / total) * 100).toFixed(2) + '%';
            // label += ` (${percentage})`;
            return label;
          }
        }
      }
    },
  };

  if (isLoading) {
    return (
      <Card className="h-[350px] md:h-[400px]"> {/* Altura fija para el spinner */}
        <CardBody className="flex justify-center items-center">
          <Spinner label="Cargando gráfico de activos..." />
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[350px] md:h-[400px]">
        <CardHeader><h5 className="font-semibold text-lg">Activos por Estado</h5></CardHeader>
        <CardBody className="flex justify-center items-center">
          <p className="text-danger">Error: {error}</p>
        </CardBody>
      </Card>
    );
  }

  if (!chartData || chartData.datasets[0].data.length === 0) {
    return (
      <Card className="h-[350px] md:h-[400px]">
        <CardHeader><h5 className="font-semibold text-lg">Activos por Estado</h5></CardHeader>
        <CardBody className="flex justify-center items-center">
          <p className="text-default-500">No hay datos de activos para mostrar.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <h5 className="font-semibold text-lg text-foreground">Activos por Estado</h5>
      </CardHeader>
      <CardBody>
        {/* Contenedor con altura para el gráfico */}
        <div className="relative h-[300px] md:h-[350px] w-full">
          <Doughnut data={chartData} options={options} />
        </div>
      </CardBody>
    </Card>
  );
}