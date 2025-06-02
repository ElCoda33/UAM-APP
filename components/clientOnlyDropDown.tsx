// components/ClientOnlyDropdown.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { Spinner } from "@heroui/react";

interface ClientOnlyDropdownProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode; // Placeholder opcional mientras no está montado
}

const ClientOnlyDropdown: React.FC<ClientOnlyDropdownProps> = ({ children, placeholder }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{placeholder || <div style={{ width: '36px', height: '36px' }}><Spinner size="sm" /></div>}</>;
  }

  return <>{children}</>;
};

export default ClientOnlyDropdown;