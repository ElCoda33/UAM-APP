// app/dashboard/assets/components/ITAssetFields.tsx
"use client";

import React from "react";
import { Input, Select, SelectItem, Divider } from "@heroui/react";

interface ITAssetFieldsProps {
  assetType?: 'informatica' | 'mobiliario' | 'vehiculo' | 'otro';
  itDeviceType?: string | null;
  ipAddress?: string | null;
  subnetMask?: string | null;
  onAssetTypeChange: (value: string) => void;
  onITDeviceTypeChange: (value: string | null) => void;
  onFieldChange: (name: string, value: string) => void;
  isDisabled?: boolean;
  errors?: {
    asset_type?: string;
    it_device_type?: string;
    ip_address?: string;
    subnet_mask?: string;
  };
  isVisible?: (field: string) => boolean;
}

export const assetTypeOptions = [
  { key: 'informatica', label: 'Informática' },
  { key: 'mobiliario', label: 'Mobiliario' },
  { key: 'vehiculo', label: 'Vehículo' },
  { key: 'otro', label: 'Otro' },
];

export const itDeviceTypeOptions = [
  { key: 'pc', label: 'PC' },
  { key: 'notebook', label: 'Notebook' },
  { key: 'router', label: 'Router' },
  { key: 'switch', label: 'Switch' },
  { key: 'access_point', label: 'Access Point' },
  { key: 'server', label: 'Servidor' },
  { key: 'printer', label: 'Impresora' },
  { key: 'firewall', label: 'Firewall' },
  { key: 'nas', label: 'NAS' },
  { key: 'otro', label: 'Otro' },
];

export default function ITAssetFields({
  assetType = 'otro',
  itDeviceType,
  ipAddress,
  subnetMask,
  onAssetTypeChange,
  onITDeviceTypeChange,
  onFieldChange,
  isDisabled = false,
  errors = {},
  isVisible = () => true,
}: ITAssetFieldsProps) {

  const handleAssetTypeChange = (keys: any) => {
    const selected = Array.from(keys)[0] as string;
    onAssetTypeChange(selected);
  };

  const handleITDeviceTypeChange = (keys: any) => {
    const selected = Array.from(keys)[0] as string | undefined;
    onITDeviceTypeChange(selected || null);
  };

  return (
    <>
      {isVisible('asset_type') && (
        <>
          <Divider className="my-4" />
          <Select
            label="Tipo de Activo"
            name="asset_type"
            placeholder="Seleccionar tipo"
            selectedKeys={assetType ? [assetType] : ['otro']}
            onSelectionChange={handleAssetTypeChange}
            variant="bordered"
            isRequired
            isDisabled={isDisabled}
            isInvalid={!!errors.asset_type}
            errorMessage={errors.asset_type}
          >
            {assetTypeOptions.map((opt) => (
              <SelectItem key={opt.key} textValue={opt.label}>
                {opt.label}
              </SelectItem>
            ))}
          </Select>
        </>
      )}

      {/* Campos condicionales para tipo informática */}
      {assetType === 'informatica' && (
        <>
          <Divider className="my-2" />
          <p className="text-sm font-semibold text-default-600 mb-2">
            Información de Red
          </p>

          {isVisible('it_device_type') && (
            <Select
              label="Tipo de Dispositivo IT"
              name="it_device_type"
              placeholder="Seleccionar tipo de dispositivo"
              selectedKeys={itDeviceType ? [itDeviceType] : []}
              onSelectionChange={handleITDeviceTypeChange}
              variant="bordered"
              isRequired
              isDisabled={isDisabled}
              isInvalid={!!errors.it_device_type}
              errorMessage={errors.it_device_type}
            >
              {itDeviceTypeOptions.map((opt) => (
                <SelectItem key={opt.key} textValue={opt.label}>
                  {opt.label}
                </SelectItem>
              ))}
            </Select>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isVisible('ip_address') && (
              <Input
                name="ip_address"
                label="Dirección IP (Opcional)"
                value={ipAddress || ""}
                onChange={(e) => onFieldChange('ip_address', e.target.value)}
                variant="bordered"
                placeholder="192.168.1.100"
                isDisabled={isDisabled}
                isInvalid={!!errors.ip_address}
                errorMessage={errors.ip_address}
                description="Formato IPv4: xxx.xxx.xxx.xxx"
              />
            )}

            {isVisible('subnet_mask') && (
              <Input
                name="subnet_mask"
                label="Máscara de Subred (Opcional)"
                value={subnetMask || ""}
                onChange={(e) => onFieldChange('subnet_mask', e.target.value)}
                variant="bordered"
                placeholder="255.255.255.0 o /24"
                isDisabled={isDisabled}
                isInvalid={!!errors.subnet_mask}
                errorMessage={errors.subnet_mask}
                description="Formato: 255.255.255.0 o /24"
              />
            )}
          </div>
          <Divider className="my-4" />
        </>
      )}
    </>
  );
}
