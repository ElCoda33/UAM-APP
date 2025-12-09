"use client";

import React, { useState } from 'react';
import {
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Button,
  Chip,
  Pagination,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@heroui/react';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined';

interface LogEntry {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  details: string;
  status: 'success' | 'error' | 'warning';
}

const mockLogs: LogEntry[] = [
  {
    id: 1,
    timestamp: '2024-12-04 22:30:15',
    user: 'admin@uam.com',
    action: 'CREATE',
    entity: 'Asset',
    details: 'Creó activo "Laptop Dell XPS 15"',
    status: 'success',
  },
  {
    id: 2,
    timestamp: '2024-12-04 22:28:42',
    user: 'juan@uam.com',
    action: 'UPDATE',
    entity: 'User',
    details: 'Actualizó perfil de usuario',
    status: 'success',
  },
  {
    id: 3,
    timestamp: '2024-12-04 22:25:10',
    user: 'maria@uam.com',
    action: 'DELETE',
    entity: 'Location',
    details: 'Intentó eliminar ubicación con activos',
    status: 'error',
  },
  {
    id: 4,
    timestamp: '2024-12-04 22:20:33',
    user: 'admin@uam.com',
    action: 'LOGIN',
    entity: 'Auth',
    details: 'Inicio de sesión exitoso',
    status: 'success',
  },
  {
    id: 5,
    timestamp: '2024-12-04 22:15:21',
    user: 'pedro@uam.com',
    action: 'EXPORT',
    entity: 'Report',
    details: 'Exportó reporte de activos a PDF',
    status: 'success',
  },
];

export function LogViewer() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const rowsPerPage = 5;

  const filteredLogs = mockLogs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;

    return matchesSearch && matchesAction && matchesStatus;
  });

  const paginatedLogs = filteredLogs.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'danger';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <Input
              placeholder="Buscar en logs..."
              value={searchTerm}
              onValueChange={setSearchTerm}
              startContent={<SearchOutlinedIcon />}
              className="flex-1"
            />
            <Select
              label="Acción"
              placeholder="Todas"
              selectedKeys={[filterAction]}
              onSelectionChange={(keys) => setFilterAction(Array.from(keys)[0] as string)}
              className="max-w-xs"
              startContent={<FilterListOutlinedIcon />}
            >
              <SelectItem key="all">Todas</SelectItem>
              <SelectItem key="CREATE">CREATE</SelectItem>
              <SelectItem key="UPDATE">UPDATE</SelectItem>
              <SelectItem key="DELETE">DELETE</SelectItem>
              <SelectItem key="LOGIN">LOGIN</SelectItem>
              <SelectItem key="EXPORT">EXPORT</SelectItem>
            </Select>
            <Select
              label="Estado"
              placeholder="Todos"
              selectedKeys={[filterStatus]}
              onSelectionChange={(keys) => setFilterStatus(Array.from(keys)[0] as string)}
              className="max-w-xs"
            >
              <SelectItem key="all">Todos</SelectItem>
              <SelectItem key="success">Éxito</SelectItem>
              <SelectItem key="error">Error</SelectItem>
              <SelectItem key="warning">Advertencia</SelectItem>
            </Select>
          </div>

          <Table
            aria-label="Tabla de logs del sistema"
            bottomContent={
              <div className="flex w-full justify-center">
                <Pagination
                  isCompact
                  showControls
                  showShadow
                  color="primary"
                  page={page}
                  total={Math.ceil(filteredLogs.length / rowsPerPage)}
                  onChange={(page) => setPage(page)}
                />
              </div>
            }
          >
            <TableHeader>
              <TableColumn>FECHA/HORA</TableColumn>
              <TableColumn>USUARIO</TableColumn>
              <TableColumn>ACCIÓN</TableColumn>
              <TableColumn>ENTIDAD</TableColumn>
              <TableColumn>DETALLES</TableColumn>
              <TableColumn>ESTADO</TableColumn>
            </TableHeader>
            <TableBody>
              {paginatedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <span className="text-tiny">{log.timestamp}</span>
                  </TableCell>
                  <TableCell>{log.user}</TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat">
                      {log.action}
                    </Chip>
                  </TableCell>
                  <TableCell>{log.entity}</TableCell>
                  <TableCell>{log.details}</TableCell>
                  <TableCell>
                    <Chip size="sm" color={getStatusColor(log.status)} variant="dot">
                      {log.status}
                    </Chip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
