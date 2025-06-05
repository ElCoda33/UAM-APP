// components/icons/UploadIcon.tsx
import React from 'react';
import { IconSvgProps } from './types'; // Importa el tipo desde el archivo types.ts de la misma carpeta

export const UploadIcon = ({
  size = 24, // Tamaño por defecto
  width,
  height,
  strokeWidth = 1.5, // Grosor de línea por defecto, igual que en otros íconos
  ...props
}: IconSvgProps & { strokeWidth?: number }) => ( // Añadimos strokeWidth a los props específicos del icono
  <svg
    aria-hidden="true"
    focusable="false"
    height={size || height}
    role="presentation"
    viewBox="0 0 24 24"
    width={size || width}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth} // Usar el prop strokeWidth
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /> {/* La base o bandeja */}
    <polyline points="17 8 12 3 7 8" /> {/* La flecha hacia arriba */}
    <line x1="12" y1="3" x2="12" y2="15" /> {/* La línea vertical de la flecha */}
  </svg>
);