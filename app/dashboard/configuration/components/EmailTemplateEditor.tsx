"use client";

import React, { useState } from 'react';
import {
  Card,
  CardBody,
  Input,
  Textarea,
  Select,
  SelectItem,
  Button,
  Tabs,
  Tab,
  Divider,
} from '@heroui/react';
import PreviewOutlinedIcon from '@mui/icons-material/PreviewOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';

const templateVariables = [
  '{user_name}',
  '{asset_name}',
  '{asset_id}',
  '{location}',
  '{date}',
  '{company_name}',
];

export function EmailTemplateEditor() {
  const [template, setTemplate] = useState('asset_created');
  const [subject, setSubject] = useState('Nuevo Activo Creado');
  const [body, setBody] = useState(
    'Hola {user_name},\n\nSe ha creado un nuevo activo:\n\nNombre: {asset_name}\nID: {asset_id}\nUbicación: {location}\nFecha: {date}\n\nSaludos,\nEquipo UAM'
  );
  const [showPreview, setShowPreview] = useState(false);

  const insertVariable = (variable: string) => {
    setBody(body + ' ' + variable);
  };

  const renderPreview = () => {
    return body
      .replace('{user_name}', 'Juan Pérez')
      .replace('{asset_name}', 'Laptop Dell XPS 15')
      .replace('{asset_id}', 'AST-1001')
      .replace('{location}', 'Oficina 101')
      .replace('{date}', new Date().toLocaleDateString('es-ES'))
      .replace('{company_name}', 'UAM');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="gap-4">
          <h4 className="text-lg font-semibold">Editor de Templates de Email</h4>

          <Select
            label="Tipo de Template"
            selectedKeys={[template]}
            onSelectionChange={(keys) => setTemplate(Array.from(keys)[0] as string)}
          >
            <SelectItem key="asset_created">Activo Creado</SelectItem>
            <SelectItem key="asset_moved">Activo Movido</SelectItem>
            <SelectItem key="user_created">Usuario Creado</SelectItem>
            <SelectItem key="maintenance_due">Mantenimiento Pendiente</SelectItem>
            <SelectItem key="low_stock">Stock Bajo</SelectItem>
          </Select>

          <Input
            label="Asunto"
            value={subject}
            onValueChange={setSubject}
            placeholder="Asunto del email"
          />

          <div>
            <p className="text-small text-default-600 mb-2">Variables disponibles:</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {templateVariables.map((variable) => (
                <Button
                  key={variable}
                  size="sm"
                  variant="flat"
                  onPress={() => insertVariable(variable)}
                >
                  {variable}
                </Button>
              ))}
            </div>
          </div>

          <Textarea
            label="Cuerpo del Email"
            value={body}
            onValueChange={setBody}
            placeholder="Escribe el contenido del email aquí..."
            minRows={10}
          />

          <Divider />

          <Tabs selectedKey={showPreview ? 'preview' : 'edit'} onSelectionChange={(key) => setShowPreview(key === 'preview')}>
            <Tab key="edit" title="Editar" />
            <Tab key="preview" title="Vista Previa" />
          </Tabs>

          {showPreview && (
            <Card className="bg-default-100">
              <CardBody>
                <p className="font-semibold mb-2">Asunto: {subject}</p>
                <Divider className="my-2" />
                <div className="whitespace-pre-wrap">{renderPreview()}</div>
              </CardBody>
            </Card>
          )}

          <div className="flex gap-2">
            <Button
              color="primary"
              startContent={<SaveOutlinedIcon />}
              onPress={() => alert('Template guardado!')}
            >
              Guardar Template
            </Button>
            <Button
              variant="flat"
              startContent={<PreviewOutlinedIcon />}
              onPress={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Ocultar' : 'Mostrar'} Preview
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
