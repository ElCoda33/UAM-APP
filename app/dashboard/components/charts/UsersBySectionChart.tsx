// app/dashboard/components/charts/UsersBySectionChart.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Spinner, Card, CardHeader, CardBody } from "@heroui/react";
import { toast } from 'react-hot-toast';

// Registrar los componentes necesarios de Chart.js para un gráfico de barras
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ChartDataPoint {
  section_id: number;
  section_name: string;
  user_count: number;
}

// Colores para las barras (puedes definir una paleta más extensa o un generador de colores)
const barChartColors = [
  'rgba(54, 162, 235, 0.7)', // Azul
  'rgba(75, 192, 192, 0.7)', // Verde Azulado
  'rgba(255, 206, 86, 0.7)', // Amarillo
  'rgba(153, 102, 255, 0.7)',// Púrpura
  'rgba(255, 159, 64, 0.7)', // Naranja
  'rgba(255, 99, 132, 0.7)', // Rojo Rosado
];

export default function UsersBySectionChart() {
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/stats/users-by-section');
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Error al cargar datos para gráfico de usuarios por sección');
        }
        const data: ChartDataPoint[] = await response.json();

        if (data && data.length > 0) {
          const labels = data.map(item => item.section_name);
          const counts = data.map(item => item.user_count);

          setChartData({
            labels: labels,
            datasets: [
              {
                label: 'Nº de Usuarios',
                data: counts,
                backgroundColor: data.map((_, index) => barChartColors[index % barChartColors.length]),
                borderColor: data.map((_, index) => barChartColors[index % barChartColors.length].replace('0.7', '1')),
                borderWidth: 1,
              },
            ],
          });
        } else {
          setChartData(null);
        }
      } catch (err: any) {
        setError(err.message);
        toast.error(err.message || "No se pudieron cargar los datos del gráfico de usuarios.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const options = {
    indexAxis: 'y' as const, // Para hacer el gráfico de barras horizontal si los nombres son largos
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          stepSize: 1, // Para asegurar que el eje X muestre números enteros si los conteos son bajos
        }
      }
    },
    plugins: {
      legend: {
        display: false, // El label del dataset ya es suficiente para barras
      },
      title: {
        display: false,
        // text: 'Distribución de Usuarios por Sección',
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return ` ${context.dataset.label || ''}: ${context.parsed.x}`;
          }
        }
      }
    },
  };

  if (isLoading) {
    return (
      <Card className="h-[350px] md:h-[400px]">
        <CardBody className="flex justify-center items-center">
          <Spinner label="Cargando gráfico de usuarios..." />
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[350px] md:h-[400px]">
        <CardHeader><h5 className="font-semibold text-lg">Usuarios por Sección</h5></CardHeader>
        <CardBody className="flex justify-center items-center">
          <p className="text-danger">Error: {error}</p>
        </CardBody>
      </Card>
    );
  }

  if (!chartData || chartData.datasets[0].data.length === 0) {
    return (
      <Card className="h-[350px] md:h-[400px]">
        <CardHeader><h5 className="font-semibold text-lg">Usuarios por Sección</h5></CardHeader>
        <CardBody className="flex justify-center items-center">
          <p className="text-default-500">No hay datos de usuarios por sección para mostrar.</p>
        </CardBody>
      </Card>
    );
  }


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <h5 className="font-semibold text-lg text-foreground">Usuarios por Sección</h5>
      </CardHeader>
      <CardBody>
        <div className="relative h-[300px] md:h-[350px] w-full">
          <Bar data={chartData} options={options} />
        </div>
      </CardBody>
    </Card>
  );
}