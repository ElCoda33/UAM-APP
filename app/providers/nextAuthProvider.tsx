// app/providers/NextAuthProvider.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast"; // react-hot-toast v2.4.1

interface Props {
    children?: React.ReactNode;
}

export default function NextAuthProvider({ children }: Props) {
    return (
        <SessionProvider>
            {children}
            <Toaster position="top-right" /> {/* Para las notificaciones */}
        </SessionProvider>
    );
}