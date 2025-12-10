"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Select,
  SelectItem,
  Input,
  Textarea,
  Chip,
  Tooltip
} from "@heroui/react";
import { toast } from 'react-hot-toast';
import { IAssetAPI } from '@/lib/schema';
import { Trash2, Plus, Network } from 'lucide-react';

interface NetworkConnection {
  id: number;
  asset_id: number;
  connected_to_asset_id: number;
  connection_type: 'ethernet' | 'wifi' | 'fiber' | 'uplink' | 'other';
  port_number: string | null;
  notes: string | null;
  connected_asset_name: string;
  connected_asset_ip: string | null;
  connected_asset_device_type: string | null;
}

interface NetworkConnectionManagerProps {
  assetId: number;
  assetType: string;
  itDeviceType?: string | null;
}

export default function NetworkConnectionManager({ assetId, assetType, itDeviceType }: NetworkConnectionManagerProps) {
  const [connections, setConnections] = useState<NetworkConnection[]>([]);
  const [availableAssets, setAvailableAssets] = useState<IAssetAPI[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  // Form state
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [connectionType, setConnectionType] = useState<string>("ethernet");
  const [portNumber, setPortNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const fetchConnections = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/assets/${assetId}/connections`);
      if (response.ok) {
        const data = await response.json();
        setConnections(data);
      } else {
        console.error("Error fetching connections");
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setIsLoading(false);
    }
  }, [assetId]);

  const fetchAvailableAssets = useCallback(async () => {
    try {
      // Fetch all assets to populate the dropdown
      // Ideally this should be filtered server-side or we use a specific endpoint
      const response = await fetch('/api/assets');
      if (response.ok) {
        const data = await response.json();
        // Filter out current asset and maybe non-IT assets if strictly required, 
        // but for now let's allow connecting to anything, though mostly IT makes sense.
        // Also filter out assets already connected? Maybe not, multiple connections possible?
        // For now just filter out self.
        setAvailableAssets(data.filter((a: IAssetAPI) => a.id !== assetId && a.asset_type === 'informatica'));
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
    }
  }, [assetId]);

  useEffect(() => {
    if (assetType === 'informatica') {
      fetchConnections();
      fetchAvailableAssets();
    }
  }, [assetType, fetchConnections, fetchAvailableAssets]);

  const handleAddConnection = async () => {
    if (!selectedAssetId) {
      toast.error("Debe seleccionar un dispositivo");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/assets/${assetId}/connections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connected_to_asset_id: parseInt(selectedAssetId),
          connection_type: connectionType,
          port_number: portNumber || null,
          notes: notes || null,
        }),
      });

      if (response.ok) {
        toast.success("Conexión agregada correctamente");
        fetchConnections();
        onClose();
        // Reset form
        setSelectedAssetId("");
        setConnectionType("ethernet");
        setPortNumber("");
        setNotes("");
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Error al agregar conexión");
      }
    } catch (error) {
      console.error("Error adding connection:", error);
      toast.error("Error al agregar conexión");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConnection = async (connectionId: number) => {
    if (!confirm("¿Está seguro de eliminar esta conexión?")) return;

    try {
      const response = await fetch(`/api/assets/${assetId}/connections/${connectionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success("Conexión eliminada");
        fetchConnections();
      } else {
        toast.error("Error al eliminar conexión");
      }
    } catch (error) {
      console.error("Error deleting connection:", error);
      toast.error("Error al eliminar conexión");
    }
  };

  if (assetType !== 'informatica') {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Conexiones de Red</h3>
        </div>
        <Button
          color="primary"
          endContent={<Plus className="w-4 h-4" />}
          onPress={onOpen}
          size="sm"
        >
          Agregar Conexión
        </Button>
      </CardHeader>
      <CardBody>
        {connections.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay conexiones registradas para este dispositivo.
          </div>
        ) : (
          <Table aria-label="Tabla de conexiones de red">
            <TableHeader>
              <TableColumn>DISPOSITIVO CONECTADO</TableColumn>
              <TableColumn>TIPO DE DISPOSITIVO</TableColumn>
              <TableColumn>IP</TableColumn>
              <TableColumn>TIPO CONEXIÓN</TableColumn>
              <TableColumn>PUERTO</TableColumn>
              <TableColumn>NOTAS</TableColumn>
              <TableColumn>ACCIONES</TableColumn>
            </TableHeader>
            <TableBody>
              {connections.map((conn) => (
                <TableRow key={conn.id}>
                  <TableCell>{conn.connected_asset_name}</TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat">{conn.connected_asset_device_type || 'N/A'}</Chip>
                  </TableCell>
                  <TableCell>{conn.connected_asset_ip || '-'}</TableCell>
                  <TableCell>
                    <Chip size="sm" color="secondary" variant="dot">{conn.connection_type}</Chip>
                  </TableCell>
                  <TableCell>{conn.port_number || '-'}</TableCell>
                  <TableCell>{conn.notes || '-'}</TableCell>
                  <TableCell>
                    <Tooltip content="Eliminar conexión">
                      <span className="text-lg text-danger cursor-pointer active:opacity-50" onClick={() => handleDeleteConnection(conn.id)}>
                        <Trash2 className="w-4 h-4" />
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">Nueva Conexión de Red</ModalHeader>
                <ModalBody>
                  <div className="flex flex-col gap-4">
                    <Select
                      label="Dispositivo a conectar"
                      placeholder="Seleccione un dispositivo"
                      selectedKeys={selectedAssetId ? [selectedAssetId] : []}
                      onChange={(e) => setSelectedAssetId(e.target.value)}
                      isRequired
                    >
                      {availableAssets.map((asset) => (
                        <SelectItem key={asset.id} textValue={`${asset.product_name} (${asset.inventory_code})`}>
                          <div className="flex flex-col">
                            <span className="text-small">{asset.product_name}</span>
                            <span className="text-tiny text-default-400">{asset.inventory_code} - {asset.ip_address || 'Sin IP'}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </Select>

                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        label="Tipo de Conexión"
                        selectedKeys={[connectionType]}
                        onChange={(e) => setConnectionType(e.target.value)}
                        isRequired
                      >
                        <SelectItem key="ethernet">Ethernet</SelectItem>
                        <SelectItem key="wifi">WiFi</SelectItem>
                        <SelectItem key="fiber">Fibra Óptica</SelectItem>
                        <SelectItem key="uplink">Uplink</SelectItem>
                        <SelectItem key="other">Otro</SelectItem>
                      </Select>

                      <Input
                        label="Puerto / Interfaz"
                        placeholder="Ej: Eth0/1, Gi1/0/24"
                        value={portNumber}
                        onValueChange={setPortNumber}
                      />
                    </div>

                    <Textarea
                      label="Notas"
                      placeholder="Detalles adicionales de la conexión"
                      value={notes}
                      onValueChange={setNotes}
                    />
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" variant="light" onPress={onClose}>
                    Cancelar
                  </Button>
                  <Button color="primary" onPress={handleAddConnection} isLoading={isSaving}>
                    Guardar Conexión
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </CardBody>
    </Card>
  );
}
