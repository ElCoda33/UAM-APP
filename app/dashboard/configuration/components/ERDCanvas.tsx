"use client";

import React, { useRef, useEffect, useState } from 'react';

// Tipos para definir nuestro esquema
interface Column {
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
}

interface Table {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  columns: Column[];
  color: string;
}

interface Relation {
  fromTable: string;
  toTable: string;
  label?: string;
}

const TABLE_WIDTH = 180;
const HEADER_HEIGHT = 30;
const ROW_HEIGHT = 20;

// Definición del Esquema de Base de Datos (UAM + Extended)
const INITIAL_TABLES: Table[] = [
  {
    name: 'users',
    x: 50,
    y: 50,
    width: TABLE_WIDTH,
    height: 0, // Se calcula dinámicamente
    color: '#3b82f6', // Blue
    columns: [
      { name: 'id', type: 'INT', isPk: true },
      { name: 'email', type: 'VARCHAR' },
      { name: 'first_name', type: 'VARCHAR' },
      { name: 'section_id', type: 'INT', isFk: true },
      { name: 'status', type: 'ENUM' },
    ]
  },
  {
    name: 'roles',
    x: 300,
    y: 50,
    width: TABLE_WIDTH,
    height: 0,
    color: '#8b5cf6', // Violet
    columns: [
      { name: 'id', type: 'INT', isPk: true },
      { name: 'name', type: 'VARCHAR' },
      { name: 'description', type: 'VARCHAR' },
    ]
  },
  {
    name: 'user_roles',
    x: 175,
    y: 200,
    width: TABLE_WIDTH,
    height: 0,
    color: '#6366f1', // Indigo
    columns: [
      { name: 'user_id', type: 'INT', isPk: true, isFk: true },
      { name: 'role_id', type: 'INT', isPk: true, isFk: true },
      { name: 'assigned_at', type: 'TIMESTAMP' },
    ]
  },
  {
    name: 'sections',
    x: 50,
    y: 350,
    width: TABLE_WIDTH,
    height: 0,
    color: '#10b981', // Emerald
    columns: [
      { name: 'id', type: 'INT', isPk: true },
      { name: 'name', type: 'VARCHAR' },
      { name: 'parent_id', type: 'INT', isFk: true },
    ]
  },
  {
    name: 'assets',
    x: 550,
    y: 250,
    width: TABLE_WIDTH,
    height: 0,
    color: '#f59e0b', // Amber
    columns: [
      { name: 'id', type: 'INT', isPk: true },
      { name: 'product_name', type: 'VARCHAR' },
      { name: 'serial_number', type: 'VARCHAR' },
      { name: 'section_id', type: 'INT', isFk: true },
      { name: 'location_id', type: 'INT', isFk: true },
      { name: 'status', type: 'ENUM' },
    ]
  },
  {
    name: 'locations',
    x: 550,
    y: 500,
    width: TABLE_WIDTH,
    height: 0,
    color: '#14b8a6', // Teal
    columns: [
      { name: 'id', type: 'INT', isPk: true },
      { name: 'name', type: 'VARCHAR' },
      { name: 'section_id', type: 'INT', isFk: true },
    ]
  },
  {
    name: 'companies',
    x: 800,
    y: 250,
    width: TABLE_WIDTH,
    height: 0,
    color: '#64748b', // Slate
    columns: [
      { name: 'id', type: 'INT', isPk: true },
      { name: 'legal_name', type: 'VARCHAR' },
      { name: 'tax_id', type: 'VARCHAR' },
    ]
  },
  {
    name: 'software_licenses',
    x: 800,
    y: 50,
    width: TABLE_WIDTH,
    height: 0,
    color: '#ec4899', // Pink
    columns: [
      { name: 'id', type: 'INT', isPk: true },
      { name: 'software_name', type: 'VARCHAR' },
      { name: 'license_key', type: 'VARCHAR' },
      { name: 'seats', type: 'INT' },
    ]
  },
  {
    name: 'system_settings',
    x: 50,
    y: 550,
    width: TABLE_WIDTH,
    height: 0,
    color: '#ef4444', // Red
    columns: [
      { name: 'setting_key', type: 'VARCHAR', isPk: true },
      { name: 'setting_value', type: 'TEXT' },
      { name: 'group', type: 'VARCHAR' },
    ]
  },
  {
    name: 'permissions',
    x: 300,
    y: 550,
    width: TABLE_WIDTH,
    height: 0,
    color: '#8b5cf6', // Violet
    columns: [
      { name: 'id', type: 'INT', isPk: true },
      { name: 'code', type: 'VARCHAR' },
      { name: 'module', type: 'VARCHAR' },
    ]
  },
];

const RELATIONS: Relation[] = [
  { fromTable: 'users', toTable: 'sections' },
  { fromTable: 'user_roles', toTable: 'users' },
  { fromTable: 'user_roles', toTable: 'roles' },
  { fromTable: 'sections', toTable: 'sections' }, // Self reference
  { fromTable: 'assets', toTable: 'sections' },
  { fromTable: 'assets', toTable: 'locations' },
  { fromTable: 'assets', toTable: 'companies' },
  { fromTable: 'locations', toTable: 'sections' },
  { fromTable: 'software_licenses', toTable: 'companies' },
];

export const ERDCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Calcular alturas iniciales
  useEffect(() => {
    setTables(prev => prev.map(t => ({
      ...t,
      height: HEADER_HEIGHT + (t.columns.length * ROW_HEIGHT) + 10
    })));
  }, []);

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Fondo
    ctx.fillStyle = '#f8fafc'; // Slate 50
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Dibujar Relaciones (Líneas)
    ctx.lineWidth = 2;
    RELATIONS.forEach(rel => {
      const from = tables.find(t => t.name === rel.fromTable);
      const to = tables.find(t => t.name === rel.toTable);

      if (from && to) {
        ctx.beginPath();
        ctx.strokeStyle = '#94a3b8'; // Slate 400

        // Calcular puntos de conexión (centros)
        const startX = from.x + from.width / 2;
        const startY = from.y + from.height / 2;
        const endX = to.x + to.width / 2;
        const endY = to.y + to.height / 2;

        ctx.moveTo(startX, startY);

        // Curva Bezier simple para suavizar
        const cp1x = startX;
        const cp1y = (startY + endY) / 2;
        const cp2x = endX;
        const cp2y = (startY + endY) / 2;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        ctx.stroke();
      }
    });

    // Dibujar Tablas
    tables.forEach(table => {
      // Sombra
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      // Header Background
      ctx.fillStyle = table.color;
      ctx.beginPath();
      ctx.roundRect(table.x, table.y, table.width, HEADER_HEIGHT, [8, 8, 0, 0]);
      ctx.fill();

      // Body Background
      ctx.shadowColor = 'transparent'; // Reset shadow for body
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(table.x, table.y + HEADER_HEIGHT, table.width, table.height - HEADER_HEIGHT, [0, 0, 8, 8]);
      ctx.fill();

      // Borde
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Texto Header
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(table.name.toUpperCase(), table.x + table.width / 2, table.y + 20);

      // Columnas
      ctx.textAlign = 'left';
      ctx.font = '12px Inter, sans-serif';

      table.columns.forEach((col, index) => {
        const yPos = table.y + HEADER_HEIGHT + 20 + (index * ROW_HEIGHT);

        // Iconos PK/FK
        if (col.isPk) {
          ctx.fillStyle = '#eab308'; // Yellow
          ctx.fillText('🔑', table.x + 10, yPos);
        } else if (col.isFk) {
          ctx.fillStyle = '#94a3b8'; // Slate
          ctx.fillText('🔗', table.x + 10, yPos);
        }

        // Nombre Columna
        ctx.fillStyle = '#1e293b'; // Slate 800
        ctx.fillText(col.name, table.x + 35, yPos);

        // Tipo Dato
        ctx.fillStyle = '#64748b'; // Slate 500
        ctx.textAlign = 'right';
        ctx.fillText(col.type.toLowerCase(), table.x + table.width - 10, yPos);
        ctx.textAlign = 'left'; // Reset
      });
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajustar resolución para pantallas retina
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Necesitamos ajustar el estilo width/height también
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    draw(ctx);
  }, [tables]);

  // Manejo de Drag & Drop
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Buscar si clicamos en una tabla (reverso para priorizar las de arriba)
    for (let i = tables.length - 1; i >= 0; i--) {
      const t = tables[i];
      if (x >= t.x && x <= t.x + t.width && y >= t.y && y <= t.y + t.height) {
        setDragTarget(i);
        setDragOffset({ x: x - t.x, y: y - t.y });
        setIsDragging(true);
        break;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || dragTarget === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setTables(prev => {
      const newTables = [...prev];
      newTables[dragTarget] = {
        ...newTables[dragTarget],
        x: x - dragOffset.x,
        y: y - dragOffset.y
      };
      return newTables;
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragTarget(null);
  };

  return (
    <div className="w-full h-[800px] border border-default-200 rounded-xl overflow-hidden shadow-inner bg-slate-50 relative">
      <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-sm text-xs text-slate-500 z-10">
        💡 Arrastra las tablas para organizar la vista
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};
