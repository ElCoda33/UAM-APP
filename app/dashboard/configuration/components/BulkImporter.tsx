"use client";

import React, { useState } from 'react';
import {
  Card,
  CardBody,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Chip,
  Progress,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@heroui/react';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';

interface ValidationError {
  row: number;
  field: string;
  error: string;
}

export function BulkImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importType, setImportType] = useState('assets');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrors([]);
      setProgress(0);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setProgress(0);

    // Simulate import with progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setImporting(false);
          return 100;
        }
        return prev + 10;
      });
    }, 300);

    // Simulate validation errors
    setTimeout(() => {
      setErrors([
        { row: 5, field: 'email', error: 'Formato de email inválido' },
        { row: 12, field: 'fecha', error: 'Fecha fuera de rango' },
      ]);
    }, 1500);
  };

  const downloadTemplate = () => {
    // Create CSV template
    const templates = {
      assets: 'nombre,tipo_activo,numero_serie,ubicacion,estado\nEjemplo Laptop,informatica,ABC123,Oficina 101,activo',
      users: 'nombre,apellido,email,rol,departamento\nJuan,Pérez,juan@example.com,usuario,IT',
      locations: 'nombre,descripcion,seccion,capacidad\nOficina 101,Sala principal,Administración,20'
    };

    const csv = templates[importType as keyof typeof templates];
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla_${importType}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="gap-4">
          <div className="flex justify-between items-center">
            <h4 className="text-lg font-semibold">Importación Masiva</h4>
            <Button
              size="sm"
              variant="flat"
              startContent={<DownloadOutlinedIcon />}
              onPress={downloadTemplate}
            >
              Descargar Plantilla
            </Button>
          </div>

          <Select
            label="Tipo de Datos"
            selectedKeys={[importType]}
            onSelectionChange={(keys) => setImportType(Array.from(keys)[0] as string)}
          >
            <SelectItem key="assets">Activos</SelectItem>
            <SelectItem key="users">Usuarios</SelectItem>
            <SelectItem key="locations">Ubicaciones</SelectItem>
            <SelectItem key="sections">Secciones</SelectItem>
          </Select>

          <div className="border-2 border-dashed border-default-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <UploadFileOutlinedIcon className="text-5xl text-default-400 mb-2" />
              <p className="text-default-600 mb-1">
                {file ? file.name : 'Clic para seleccionar archivo'}
              </p>
              <p className="text-tiny text-default-400">
                Formatos soportados: CSV, Excel (.xlsx, .xls)
              </p>
            </label>
          </div>

          {file && (
            <>
              <Progress
                size="sm"
                value={progress}
                color={progress === 100 ? 'success' : 'primary'}
                label="Progreso de importación"
                showValueLabel
              />

              <div className="flex gap-2">
                <Button
                  color="primary"
                  onPress={handleImport}
                  isLoading={importing}
                  isDisabled={importing}
                  className="flex-1"
                >
                  {importing ? 'Importando...' : 'Iniciar Importación'}
                </Button>
                <Button
                  variant="flat"
                  onPress={() => {
                    setFile(null);
                    setErrors([]);
                    setProgress(0);
                  }}
                  isDisabled={importing}
                >
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {errors.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-2 mb-4">
              <ErrorOutlineIcon className="text-danger" />
              <h4 className="text-lg font-semibold text-danger">
                {errors.length} Error(es) Encontrados
              </h4>
            </div>
            <Table aria-label="Errores de validación">
              <TableHeader>
                <TableColumn>FILA</TableColumn>
                <TableColumn>CAMPO</TableColumn>
                <TableColumn>ERROR</TableColumn>
              </TableHeader>
              <TableBody>
                {errors.map((error, index) => (
                  <TableRow key={index}>
                    <TableCell>{error.row}</TableCell>
                    <TableCell>{error.field}</TableCell>
                    <TableCell>{error.error}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}

      {progress === 100 && errors.length === 0 && (
        <Card className="bg-success-50 dark:bg-success-900/20">
          <CardBody>
            <div className="flex items-center gap-2">
              <CheckCircleOutlineIcon className="text-success" />
              <p className="text-success font-semibold">
                ¡Importación completada exitosamente!
              </p>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
