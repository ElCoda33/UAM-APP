"use client";

import React, { useState, useRef } from 'react';
import {
  Card,
  CardBody,
  Button,
  Input,
  Select,
  SelectItem,
  Chip,
  Checkbox,
  CheckboxGroup,
} from '@heroui/react';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';

export function QRGenerator() {
  const [qrType, setQrType] = useState('assets');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [qrSize, setQrSize] = useState('256');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateQR = () => {
    // In real implementation, use qrcode library
    alert(`Generando ${selectedIds.length} códigos QR de tamaño ${qrSize}px para ${qrType}`);
  };

  const downloadAll = () => {
    alert('Descargando todos los códigos QR como ZIP...');
  };

  const printLabels = () => {
    alert('Enviando etiquetas a impresora...');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="gap-4">
          <div className="flex items-center gap-2 mb-2">
            <QrCode2OutlinedIcon className="text-primary" />
            <h4 className="text-lg font-semibold">Generador de Códigos QR</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Tipo de Entidad"
              selectedKeys={[qrType]}
              onSelectionChange={(keys) => setQrType(Array.from(keys)[0] as string)}
            >
              <SelectItem key="assets">Activos</SelectItem>
              <SelectItem key="locations">Ubicaciones</SelectItem>
              <SelectItem key="users">Usuarios</SelectItem>
            </Select>

            <Select
              label="Tamaño del QR"
              selectedKeys={[qrSize]}
              onSelectionChange={(keys) => setQrSize(Array.from(keys)[0] as string)}
            >
              <SelectItem key="128">Pequeño (128px)</SelectItem>
              <SelectItem key="256">Mediano (256px)</SelectItem>
              <SelectItem key="512">Grande (512px)</SelectItem>
            </Select>
          </div>

          <CheckboxGroup
            label="Seleccionar elementos para generar QR:"
            value={selectedIds}
            onValueChange={setSelectedIds}
          >
            <Checkbox value="1">Laptop Dell XPS 15 (ID: AST-1001)</Checkbox>
            <Checkbox value="2">Monitor Samsung 27" (ID: AST-1002)</Checkbox>
            <Checkbox value="3">Teclado Logitech MX Keys (ID: AST-1003)</Checkbox>
            <Checkbox value="4">Mouse Logitech MX Master (ID: AST-1004)</Checkbox>
            <Checkbox value="5">Webcam Logitech C920 (ID: AST-1005)</Checkbox>
          </CheckboxGroup>

          <div className="flex gap-2">
            <Button
              color="primary"
              startContent={<QrCode2OutlinedIcon />}
              onPress={generateQR}
              isDisabled={selectedIds.length === 0}
              className="flex-1"
            >
              Generar {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
            </Button>
            <Button
              variant="flat"
              startContent={<DownloadOutlinedIcon />}
              onPress={downloadAll}
              isDisabled={selectedIds.length === 0}
            >
              Descargar
            </Button>
            <Button
              variant="flat"
              startContent={<PrintOutlinedIcon />}
              onPress={printLabels}
              isDisabled={selectedIds.length === 0}
            >
              Imprimir
            </Button>
          </div>
        </CardBody>
      </Card>

      {selectedIds.length > 0 && (
        <Card>
          <CardBody>
            <h4 className="text-md font-semibold mb-4">Vista Previa</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {selectedIds.slice(0, 4).map((id) => (
                <div key={id} className="flex flex-col items-center gap-2 p-4 border border-default-200 rounded-lg">
                  <div className="w-24 h-24 bg-default-100 flex items-center justify-center rounded">
                    <QrCode2OutlinedIcon className="text-4xl text-default-400" />
                  </div>
                  <Chip size="sm" variant="flat">ID: {id}</Chip>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
