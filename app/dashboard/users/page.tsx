// app/dashboard/users/page.tsx
"use client";

import React from "react";
// Importar el nuevo componente de listado desde su nueva ubicación
// Ajusta la ruta si colocaste UserList.tsx en un lugar diferente (ej. @/components/userList/UserList)
import UserList from "./components/userList/UserList"; 

export default function UsersPage() {
    return (
        // El componente UserList ahora encapsula el título h1 y toda la lógica de la tabla.
        // Si necesitas añadir elementos adicionales específicos para esta página contenedora,
        // puedes hacerlo aquí, fuera del componente UserList.
        <UserList />
    );
}