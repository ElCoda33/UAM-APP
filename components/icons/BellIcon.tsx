// components/icons/BellIcon.tsx

import React from 'react';
import { IconSvgProps } from './types'; // Usamos el tipo estándar que ya tienes

export const BellIcon = ({
  size = 24,
  width,
  height,
  strokeWidth = 1.5, // Grosor de línea estándar
  ...props
}: IconSvgProps & { strokeWidth?: number }) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    height={size || height}
    role="presentation"
    viewBox="0 0 24 24"
    width={size || width}
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);