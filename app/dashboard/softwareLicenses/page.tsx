// app/dashboard/softwareLicenses/page.tsx
"use client";

import React from "react";
// Importar el nuevo componente de listado desde su nueva ubicación
import SoftwareLicenseList from "./components/softwareLicenseList/SoftwareLicenseList";

export default function SoftwareLicensesPage() {
    return (
        // El componente SoftwareLicenseList ya incluye un título h1 y la tabla.
        // Si se necesita un layout más específico aquí, se puede añadir.
        // Por ejemplo, si todas las páginas del dashboard tuvieran un Card contenedor,
        // se podría añadir aquí. Por ahora, se delega al componente de lista.
        <SoftwareLicenseList />
    );
}