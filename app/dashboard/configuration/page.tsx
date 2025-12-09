"use client";

import React from "react";
import {
  Tabs, Tab, Card, CardBody, Switch, Select, SelectItem, Input, Button, Divider,
  Slider, CheckboxGroup, Checkbox, Textarea, Chip, Tooltip,
  Table, TableHeader, TableBody, TableColumn, TableRow, TableCell, RadioGroup, Radio
} from "@heroui/react";
import { title } from "@/components/primitives";
import { ThemeSwitch } from "@/components/theme-switch";
import { ERDCanvas } from "./components/ERDCanvas";
import { NetworkDiagram } from "./components/NetworkDiagram";

// Icons
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import IntegrationInstructionsOutlinedIcon from '@mui/icons-material/IntegrationInstructionsOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import SmartphoneOutlinedIcon from '@mui/icons-material/SmartphoneOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import RadarOutlinedIcon from '@mui/icons-material/RadarOutlined';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';

// Nuevos componentes
import { BulkImporter } from './components/BulkImporter';
import { LogViewer } from './components/LogViewer';
import { QRGenerator } from './components/QRGenerator';
import { EmailTemplateEditor } from './components/EmailTemplateEditor';

export default function ConfigurationPage() {
  const [selectedTab, setSelectedTab] = React.useState<string | number>("general");

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className={title()}>Configuración del Sistema</h1>
          <p className="text-default-500 mt-2">Administración avanzada de la plataforma UAM.</p>
        </div>
        <div className="flex gap-2">
          <Button startContent={<RefreshOutlinedIcon />} variant="flat">
            Restaurar
          </Button>
          <Button startContent={<SaveOutlinedIcon />} color="primary">
            Guardar Cambios
          </Button>
        </div>
      </div>

      <div className="flex w-full flex-col">
        <Tabs
          aria-label="Opciones de configuración"
          selectedKey={selectedTab}
          onSelectionChange={setSelectedTab}
          color="primary"
          variant="underlined"
          classNames={{
            tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider overflow-x-auto",
            cursor: "w-full bg-primary",
            tab: "max-w-fit px-0 h-12",
            tabContent: "group-data-[selected=true]:text-primary font-medium"
          }}
        >
          {/* --- GENERAL TAB --- */}
          <Tab
            key="general"
            title={
              <div className="flex items-center space-x-2">
                <SettingsOutlinedIcon />
                <span>General</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="gap-8 p-8">
                <section>
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    Identidad Corporativa
                    <Chip size="sm" variant="flat" color="primary">Visual</Chip>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Nombre de la Organización" placeholder="Ej. Universidad Autónoma" defaultValue="UAM" />
                    <Input label="Slogan / Subtítulo" placeholder="Ej. Sistema de Gestión de Activos" />
                    <div className="md:col-span-2">
                      <p className="text-small text-default-500 mb-2">Logo de la Empresa</p>
                      <div className="flex items-center gap-4 p-4 border-2 border-dashed border-default-300 rounded-lg bg-default-50 dark:bg-default-100/50">
                        <div className="w-12 h-12 bg-default-300 rounded-full flex items-center justify-center text-white">
                          Logo
                        </div>
                        <Button size="sm" variant="bordered">Subir Nueva Imagen</Button>
                        <span className="text-tiny text-default-400">Recomendado: 512x512px PNG</span>
                      </div>
                    </div>
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Regionalización</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Select label="Idioma Predeterminado" defaultSelectedKeys={["es"]}>
                      <SelectItem key="es">Español (España)</SelectItem>
                      <SelectItem key="es-mx">Español (Latinoamérica)</SelectItem>
                      <SelectItem key="en">English (US)</SelectItem>
                    </Select>
                    <Select label="Zona Horaria" defaultSelectedKeys={["utc-3"]}>
                      <SelectItem key="utc-3">(UTC-03:00) Buenos Aires</SelectItem>
                      <SelectItem key="utc-5">(UTC-05:00) Bogotá</SelectItem>
                      <SelectItem key="utc">UTC Universal</SelectItem>
                    </Select>
                    <Select label="Formato de Fecha" defaultSelectedKeys={["dd/mm/yyyy"]}>
                      <SelectItem key="dd/mm/yyyy">DD/MM/AAAA (31/12/2024)</SelectItem>
                      <SelectItem key="mm/dd/yyyy">MM/DD/AAAA (12/31/2024)</SelectItem>
                      <SelectItem key="yyyy-mm-dd">AAAA-MM-DD (2024-12-31)</SelectItem>
                    </Select>
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Preferencia de Interfaz</h3>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-medium">Tema del Sistema</p>
                      <p className="text-small text-default-500">Alternar entre modo claro y oscuro.</p>
                    </div>
                    <ThemeSwitch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-medium">Modo Compacto</p>
                      <p className="text-small text-default-500">Reducir el espaciado en tablas y listas.</p>
                    </div>
                    <Switch aria-label="Modo Compacto" />
                  </div>
                </section>
              </CardBody>
            </Card>
          </Tab>

          {/* --- USERS & ROLES TAB (NEW) --- */}
          <Tab
            key="users"
            title={
              <div className="flex items-center space-x-2">
                <PeopleAltOutlinedIcon />
                <span>Usuarios y Roles</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="gap-8 p-8">
                <section>
                  <h3 className="text-xl font-semibold mb-4">Registro y Acceso</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-4">
                      <Switch>Permitir registro público</Switch>
                      <Switch defaultSelected>Requerir verificación de email</Switch>
                      <Switch>Aprobar manualmente nuevos usuarios</Switch>
                    </div>
                    <div>
                      <Select label="Rol Predeterminado" defaultSelectedKeys={["viewer"]}>
                        <SelectItem key="viewer">Espectador (Solo Lectura)</SelectItem>
                        <SelectItem key="user">Usuario Estándar</SelectItem>
                        <SelectItem key="manager">Gestor de Área</SelectItem>
                      </Select>
                      <p className="text-tiny text-default-400 mt-2">Rol asignado automáticamente a nuevos registros.</p>
                    </div>
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Matriz de Permisos</h3>
                  <Table aria-label="Matriz de roles">
                    <TableHeader>
                      <TableColumn>PERMISO</TableColumn>
                      <TableColumn>ADMIN</TableColumn>
                      <TableColumn>GESTOR</TableColumn>
                      <TableColumn>USUARIO</TableColumn>
                      <TableColumn>LECTOR</TableColumn>
                    </TableHeader>
                    <TableBody>
                      <TableRow key="1">
                        <TableCell>Ver Activos</TableCell>
                        <TableCell><Chip color="success" size="sm">Sí</Chip></TableCell>
                        <TableCell><Chip color="success" size="sm">Sí</Chip></TableCell>
                        <TableCell><Chip color="success" size="sm">Sí</Chip></TableCell>
                        <TableCell><Chip color="success" size="sm">Sí</Chip></TableCell>
                      </TableRow>
                      <TableRow key="2">
                        <TableCell>Crear/Editar Activos</TableCell>
                        <TableCell><Chip color="success" size="sm">Sí</Chip></TableCell>
                        <TableCell><Chip color="success" size="sm">Sí</Chip></TableCell>
                        <TableCell><Chip color="warning" size="sm">Propio</Chip></TableCell>
                        <TableCell><Chip color="danger" size="sm">No</Chip></TableCell>
                      </TableRow>
                      <TableRow key="3">
                        <TableCell>Eliminar Activos</TableCell>
                        <TableCell><Chip color="success" size="sm">Sí</Chip></TableCell>
                        <TableCell><Chip color="danger" size="sm">No</Chip></TableCell>
                        <TableCell><Chip color="danger" size="sm">No</Chip></TableCell>
                        <TableCell><Chip color="danger" size="sm">No</Chip></TableCell>
                      </TableRow>
                      <TableRow key="4">
                        <TableCell>Gestionar Usuarios</TableCell>
                        <TableCell><Chip color="success" size="sm">Sí</Chip></TableCell>
                        <TableCell><Chip color="danger" size="sm">No</Chip></TableCell>
                        <TableCell><Chip color="danger" size="sm">No</Chip></TableCell>
                        <TableCell><Chip color="danger" size="sm">No</Chip></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </section>
              </CardBody>
            </Card>
          </Tab>

          {/* --- WORKFLOWS TAB (NEW) --- */}
          <Tab
            key="workflows"
            title={
              <div className="flex items-center space-x-2">
                <AccountTreeOutlinedIcon />
                <span>Flujos de Trabajo</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="gap-8 p-8">
                <section>
                  <h3 className="text-xl font-semibold mb-4">Aprobaciones</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center p-3 border border-default-200 rounded-lg">
                      <div>
                        <p className="font-medium">Baja de Activos</p>
                        <p className="text-small text-default-500">Requerir aprobación de un administrador para eliminar o dar de baja un activo.</p>
                      </div>
                      <Switch defaultSelected />
                    </div>
                    <div className="flex justify-between items-center p-3 border border-default-200 rounded-lg">
                      <div>
                        <p className="font-medium">Solicitud de Software</p>
                        <p className="text-small text-default-500">Requerir aprobación del jefe de área para nuevas licencias.</p>
                      </div>
                      <Switch defaultSelected />
                    </div>
                    <div className="flex justify-between items-center p-3 border border-default-200 rounded-lg">
                      <div>
                        <p className="font-medium">Traslado de Equipos</p>
                        <p className="text-small text-default-500">Confirmación de recepción por parte del usuario destino.</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Automatización</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-4">
                      <Switch>Asignar ubicación automáticamente según IP</Switch>
                      <Switch defaultSelected>Archivar usuarios tras despido/baja</Switch>
                      <Switch defaultSelected>Marcar activos como "Perdidos" tras 30 días sin escaneo</Switch>
                    </div>
                    <div>
                      <p className="text-medium mb-2">Escalar aprobaciones pendientes</p>
                      <Slider
                        label="Días antes de escalar al superior"
                        step={1}
                        maxValue={14}
                        minValue={1}
                        defaultValue={3}
                        showSteps={true}
                      />
                    </div>
                  </div>
                </section>
              </CardBody>
            </Card>
          </Tab>

          {/* --- SECURITY TAB --- */}
          <Tab
            key="security"
            title={
              <div className="flex items-center space-x-2">
                <SecurityOutlinedIcon />
                <span>Seguridad</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="gap-8 p-8">
                <section>
                  <h3 className="text-xl font-semibold mb-4">Política de Contraseñas</h3>
                  <div className="space-y-6">
                    <Slider
                      label="Longitud Mínima"
                      step={1}
                      maxValue={32}
                      minValue={6}
                      defaultValue={8}
                      className="max-w-md"
                      showSteps={true}
                    />
                    <div className="flex flex-col gap-3">
                      <Switch defaultSelected size="sm">Requerir Mayúsculas (A-Z)</Switch>
                      <Switch defaultSelected size="sm">Requerir Números (0-9)</Switch>
                      <Switch size="sm">Requerir Caracteres Especiales (!@#$)</Switch>
                      <Switch size="sm" color="warning">Forzar cambio cada 90 días</Switch>
                    </div>
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Sesiones y Acceso</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <Input
                        type="number"
                        label="Tiempo de inactividad (minutos)"
                        defaultValue="30"
                        description="Cerrar sesión automáticamente tras inactividad."
                      />
                    </div>
                    <div className="flex flex-col gap-4">
                      <Switch color="secondary">Forzar 2FA para Administradores</Switch>
                      <Switch>Permitir sesiones concurrentes</Switch>
                    </div>
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Control de Acceso (IP Whitelist)</h3>
                  <Textarea
                    label="Direcciones IP Permitidas"
                    placeholder="Ingrese una IP por línea (ej. 192.168.1.1)"
                    minRows={3}
                  />
                  <p className="text-tiny text-default-400 mt-2">Dejar vacío para permitir acceso desde cualquier lugar.</p>
                </section>
              </CardBody>
            </Card>
          </Tab>

          {/* --- ASSETS TAB (EXPANDED) --- */}
          <Tab
            key="assets"
            title={
              <div className="flex items-center space-x-2">
                <CategoryOutlinedIcon />
                <span>Activos</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="gap-8 p-8">
                <section>
                  <h3 className="text-xl font-semibold mb-4">Valores Predeterminados</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select label="Método de Depreciación" defaultSelectedKeys={["lineal"]}>
                      <SelectItem key="lineal">Lineal (Straight Line)</SelectItem>
                      <SelectItem key="acelerada">Acelerada</SelectItem>
                      <SelectItem key="ninguna">Sin Depreciación</SelectItem>
                    </Select>
                    <Input type="number" label="Vida Útil Estándar (Años)" defaultValue="5" />
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Identificación y Etiquetas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <Input label="Prefijo de Etiqueta" defaultValue="AST-" placeholder="Ej. UAM-AST-" />
                    <Input type="number" label="Siguiente Número" defaultValue="1001" />
                    <div className="flex items-center h-14">
                      <Chip color="primary" variant="flat">Vista Previa: AST-1001</Chip>
                    </div>
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Campos Personalizados</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Input placeholder="Nombre del Campo" className="flex-grow" />
                      <Select placeholder="Tipo" className="w-40" defaultSelectedKeys={["text"]}>
                        <SelectItem key="text">Texto</SelectItem>
                        <SelectItem key="number">Número</SelectItem>
                        <SelectItem key="date">Fecha</SelectItem>
                        <SelectItem key="boolean">Sí/No</SelectItem>
                      </Select>
                      <Button isIconOnly color="primary" variant="flat"><AddCircleOutlineIcon /></Button>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center p-2 bg-default-100 rounded-md">
                        <span>IMEI (Texto)</span>
                        <Button isIconOnly size="sm" color="danger" variant="light"><DeleteOutlineIcon /></Button>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-default-100 rounded-md">
                        <span>Fecha de Garantía (Fecha)</span>
                        <Button isIconOnly size="sm" color="danger" variant="light"><DeleteOutlineIcon /></Button>
                      </div>
                    </div>
                  </div>
                </section>
              </CardBody>
            </Card>
          </Tab>

          {/* --- REPORTS TAB (NEW) --- */}
          <Tab
            key="reports"
            title={
              <div className="flex items-center space-x-2">
                <AssessmentOutlinedIcon />
                <span>Reportes</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="gap-8 p-8">
                <section>
                  <h3 className="text-xl font-semibold mb-4">Personalización de PDF</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Texto del Encabezado" defaultValue="Reporte Confidencial - Uso Interno" />
                    <Input label="Texto del Pie de Página" defaultValue="Generado por Sistema UAM" />
                    <div className="md:col-span-2">
                      <Checkbox defaultSelected>Incluir Logo en todas las páginas</Checkbox>
                      <Checkbox defaultSelected>Incluir fecha y hora de generación</Checkbox>
                    </div>
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Programación Automática</h3>
                  <div className="flex flex-col gap-4">
                    <CheckboxGroup label="Enviar reportes automáticamente a administradores:">
                      <Checkbox value="weekly_assets">Resumen Semanal de Activos</Checkbox>
                      <Checkbox value="monthly_audit">Log de Auditoría Mensual</Checkbox>
                      <Checkbox value="daily_alerts">Alertas Diarias (Stock Bajo)</Checkbox>
                    </CheckboxGroup>
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Formatos de Exportación</h3>
                  <RadioGroup label="Formato predeterminado para descargas" orientation="horizontal" defaultValue="pdf">
                    <Radio value="pdf">PDF (Documento)</Radio>
                    <Radio value="csv">CSV (Datos planos)</Radio>
                    <Radio value="xlsx">Excel (Hoja de cálculo)</Radio>
                  </RadioGroup>
                </section>
              </CardBody>
            </Card>
          </Tab>

          {/* --- MOBILE TAB (NEW) --- */}
          <Tab
            key="mobile"
            title={
              <div className="flex items-center space-x-2">
                <SmartphoneOutlinedIcon />
                <span>Móvil</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="gap-8 p-8">
                <section>
                  <h3 className="text-xl font-semibold mb-4">Sincronización</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Slider
                      label="Frecuencia de Sincronización (minutos)"
                      step={5}
                      maxValue={60}
                      minValue={5}
                      defaultValue={15}
                      showSteps={true}
                    />
                    <div className="flex flex-col gap-2">
                      <Switch defaultSelected>Descargar imágenes para uso offline</Switch>
                      <Switch>Sincronizar solo con Wi-Fi</Switch>
                    </div>
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Escáner de Códigos</h3>
                  <div className="flex flex-col gap-4">
                    <Switch defaultSelected>Vibrar al escanear correctamente</Switch>
                    <Switch defaultSelected>Emitir sonido al escanear</Switch>
                    <Switch color="warning">Permitir escaneos duplicados consecutivos</Switch>
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Seguridad de la App</h3>
                  <div className="flex flex-col gap-4">
                    <Switch defaultSelected color="success">Requerir Biometría (FaceID/TouchID) al abrir</Switch>
                    <Switch>Bloquear capturas de pantalla</Switch>
                  </div>
                </section>
              </CardBody>
            </Card>
          </Tab>

          {/* --- NOTIFICATIONS TAB --- */}
          <Tab
            key="notifications"
            title={
              <div className="flex items-center space-x-2">
                <NotificationsOutlinedIcon />
                <span>Notificaciones</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="gap-8 p-8">
                <section>
                  <h3 className="text-xl font-semibold mb-4">Canales de Comunicación</h3>
                  <CheckboxGroup orientation="horizontal" defaultValue={["email", "inapp"]}>
                    <Checkbox value="email">Correo Electrónico</Checkbox>
                    <Checkbox value="inapp">Notificaciones en App</Checkbox>
                    <Checkbox value="sms">SMS (Requiere Gateway)</Checkbox>
                    <Checkbox value="slack">Slack / Teams</Checkbox>
                  </CheckboxGroup>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Eventos y Disparadores</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    <div className="flex justify-between items-center">
                      <span>Nuevo Activo Creado</span>
                      <Switch size="sm" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Activo Eliminado</span>
                      <Switch size="sm" defaultSelected color="warning" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Movimiento de Activo</span>
                      <Switch size="sm" defaultSelected />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Stock Bajo (Consumibles)</span>
                      <Switch size="sm" defaultSelected color="danger" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Mantenimiento Vencido</span>
                      <Switch size="sm" defaultSelected color="danger" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Nuevo Usuario Registrado</span>
                      <Switch size="sm" />
                    </div>
                  </div>
                </section>
              </CardBody>
            </Card>
          </Tab>

          {/* --- INTEGRATIONS TAB (EXPANDED) --- */}
          <Tab
            key="integrations"
            title={
              <div className="flex items-center space-x-2">
                <IntegrationInstructionsOutlinedIcon />
                <span>Integraciones</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="gap-8 p-8">
                <section>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">API Keys</h3>
                    <Button size="sm" color="primary" variant="ghost">Generar Nueva Key</Button>
                  </div>
                  <div className="bg-default-100 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono text-small">sk_live_51Mz...92xY</span>
                      <Chip size="sm" color="success" variant="dot">Activa</Chip>
                    </div>
                    <p className="text-tiny text-default-400">Creada el 12/10/2024 - Acceso Total</p>
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Directorio Activo (LDAP / AD)</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <Input label="URL del Servidor LDAP" placeholder="ldap://dc.example.com" />
                    <Input label="Base DN" placeholder="dc=example,dc=com" />
                    <div className="flex gap-4">
                      <Input label="Bind DN" placeholder="cn=admin,dc=example,dc=com" />
                      <Input label="Contraseña" type="password" />
                    </div>
                    <Button className="max-w-xs" variant="flat">Probar Conexión</Button>
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Webhooks</h3>
                  <Input label="URL Global de Webhook" placeholder="https://api.tu-sistema.com/webhook" />
                  <p className="text-tiny text-default-400 mt-2">Enviaremos eventos JSON POST a esta URL.</p>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Autenticación Externa (SSO)</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center p-3 border border-default-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-black font-bold">G</div>
                        <span>Google Workspace</span>
                      </div>
                      <Switch defaultSelected />
                    </div>
                    <div className="flex justify-between items-center p-3 border border-default-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-sm text-white font-bold">M</div>
                        <span>Microsoft Entra ID (Azure AD)</span>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </section>
              </CardBody>
            </Card>
          </Tab>

          {/* --- SYSTEM / DATA TAB --- */}
          <Tab
            key="system"
            title={
              <div className="flex items-center space-x-2">
                <StorageOutlinedIcon />
                <span>Datos y Sistema</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="gap-8 p-8">
                <section>
                  <h3 className="text-xl font-semibold mb-4">Copias de Seguridad (Backups)</h3>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-medium">Frecuencia Automática</p>
                      <p className="text-small text-default-500">Realizar copias de seguridad de la base de datos.</p>
                    </div>
                    <Select className="max-w-xs" defaultSelectedKeys={["daily"]} aria-label="Frecuencia de Backup">
                      <SelectItem key="daily">Diario (00:00 UTC)</SelectItem>
                      <SelectItem key="weekly">Semanal (Domingos)</SelectItem>
                      <SelectItem key="monthly">Mensual</SelectItem>
                      <SelectItem key="off">Desactivado</SelectItem>
                    </Select>
                  </div>
                  <Button color="secondary" variant="flat">Ejecutar Backup Manual Ahora</Button>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Retención de Datos</h3>
                  <Slider
                    label="Retención de Logs de Auditoría (Días)"
                    step={30}
                    maxValue={365}
                    minValue={30}
                    defaultValue={90}
                    showSteps={true}
                    marks={[
                      { value: 30, label: "30d" },
                      { value: 90, label: "90d" },
                      { value: 180, label: "6m" },
                      { value: 365, label: "1a" },
                    ]}
                  />
                </section>
                <Divider />
                <section className="p-4 border border-danger rounded-lg bg-danger-50 dark:bg-danger-900/10">
                  <h3 className="text-xl font-semibold mb-4 text-danger flex items-center gap-2">
                    Zona de Peligro
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-danger-700 dark:text-danger-400">Modo Mantenimiento</p>
                        <p className="text-tiny text-danger-600/70">Solo administradores podrán acceder.</p>
                      </div>
                      <Switch color="danger" />
                    </div>
                    <Divider className="bg-danger-200" />
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-danger-700 dark:text-danger-400">Restablecer Configuración</p>
                        <p className="text-tiny text-danger-600/70">Volver a los valores de fábrica.</p>
                      </div>
                      <Button size="sm" color="danger" variant="ghost">Restablecer</Button>
                    </div>
                  </div>
                </section>
              </CardBody>
            </Card>
          </Tab>

          {/* --- MAINTENANCE TAB (NEW) --- */}
          <Tab
            key="maintenance"
            title={
              <div className="flex items-center space-x-2">
                <BuildOutlinedIcon />
                <span>Mantenimiento</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="gap-8 p-8">
                <section>
                  <h3 className="text-xl font-semibold mb-4">Programación de Mantenimientos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-4">
                      <Switch defaultSelected>Recordatorios Automáticos</Switch>
                      <Switch defaultSelected>Notificar 7 días antes</Switch>
                      <Switch>Escalado automático si no se completa</Switch>
                    </div>
                    <Input
                      type="number"
                      label="Días entre mantenimientos preventivos"
                      defaultValue="90"
                      description="Intervalo recomendado para equipos de IT"
                    />
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Plantillas de Mantenimiento</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 border border-default-200 rounded-lg">
                      <div>
                        <p className="font-medium">Limpieza de Hardware</p>
                        <p className="text-small text-default-500">Cada 30 días</p>
                      </div>
                      <Chip color="success" size="sm" variant="flat">Activa</Chip>
                    </div>
                    <div className="flex justify-between items-center p-3 border border-default-200 rounded-lg">
                      <div>
                        <p className="font-medium">Actualización de Software</p>
                        <p className="text-small text-default-500">Cada 15 días</p>
                      </div>
                      <Chip color="success" size="sm" variant="flat">Activa</Chip>
                    </div>
                    <div className="flex justify-between items-center p-3 border border-default-200 rounded-lg">
                      <div>
                        <p className="font-medium">Verificación de Inventario</p>
                        <p className="text-small text-default-500">Semestral</p>
                      </div>
                      <Chip color="warning" size="sm" variant="flat">Pausada</Chip>
                    </div>
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Historial de Mantenimientos</h3>
                  <Table aria-label="Historial de mantenimientos">
                    <TableHeader>
                      <TableColumn>ACTIVO</TableColumn>
                      <TableColumn>TIPO</TableColumn>
                      <TableColumn>FECHA</TableColumn>
                      <TableColumn>TÉCNICO</TableColumn>
                      <TableColumn>ESTADO</TableColumn>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Laptop Dell XPS</TableCell>
                        <TableCell>Preventivo</TableCell>
                        <TableCell>2024-12-01</TableCell>
                        <TableCell>Juan Pérez</TableCell>
                        <TableCell><Chip size="sm" color="success">Completado</Chip></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Servidor HP ProLiant</TableCell>
                        <TableCell>Correctivo</TableCell>
                        <TableCell>2024-11-28</TableCell>
                        <TableCell>María García</TableCell>
                        <TableCell><Chip size="sm" color="warning">Pendiente</Chip></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </section>
              </CardBody>
            </Card>
          </Tab>

          {/* --- IMPORT/EXPORT TAB (NEW) --- */}
          <Tab
            key="import_export"
            title={
              <div className="flex items-center space-x-2">
                <PublishOutlinedIcon />
                <span>Importación/Exportación</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="gap-8 p-8">
                <h3 className="text-2xl font-semibold mb-4">Carga y Exportación Masiva de Datos</h3>
                <p className="text-default-500 mb-6">
                  Importa múltiples registros desde archivos CSV o Excel. Descarga plantillas para facilitar el proceso.
                </p>
                <BulkImporter />
              </CardBody>
            </Card>
          </Tab>

          {/* --- AUDIT LOGS TAB (NEW) --- */}
          <Tab
            key="audit"
            title={
              <div className="flex items-center space-x-2">
                <HistoryOutlinedIcon />
                <span>Auditoría</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="gap-8 p-8">
                <section>
                  <h3 className="text-2xl font-semibold mb-4">Registro de Auditoría</h3>
                  <p className="text-default-500 mb-6">
                    Visualiza todas las acciones realizadas en el sistema para mantener un registro completo de cambios.
                  </p>
                  <LogViewer />
                </section>
                <Divider className="my-6" />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Configuración de Auditoría</h3>
                  <div className="flex flex-col gap-4">
                    <Switch defaultSelected>Registrar todos los accesos al sistema</Switch>
                    <Switch defaultSelected>Registrar cambios en configuración</Switch>
                    <Switch defaultSelected>Registrar operaciones CRUD en activos</Switch>
                    <Switch>Registrar exportaciones de datos</Switch>
                    <Switch>Enviar alertas de actividad sospechosa</Switch>
                  </div>
                </section>
              </CardBody>
            </Card>
          </Tab>

          {/* --- PERFORMANCE TAB (NEW) --- */}
          <Tab
            key="performance"
            title={
              <div className="flex items-center space-x-2">
                <SpeedOutlinedIcon />
                <span>Rendimiento</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="gap-8 p-8">
                <section>
                  <h3 className="text-xl font-semibold mb-4">Optimización de Consultas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 border border-default-200 rounded-lg">
                      <p className="text-small text-default-500 mb-1">Tiempo Promedio de Carga</p>
                      <p className="text-2xl font-bold text-success">245ms</p>
                    </div>
                    <div className="p-4 border border-default-200 rounded-lg">
                      <p className="text-small text-default-500 mb-1">Queries Lentas (&gt;1s)</p>
                      <p className="text-2xl font-bold text-warning">3</p>
                    </div>
                    <div className="p-4 border border-default-200 rounded-lg">
                      <p className="text-small text-default-500 mb-1">Uso de Caché</p>
                      <p className="text-2xl font-bold text-primary">87%</p>
                    </div>
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Configuración de Caché</h3>
                  <div className="space-y-6">
                    <Switch defaultSelected>Habilitar caché de consultas</Switch>
                    <Slider
                      label="Tiempo de vida del caché (minutos)"
                      step={5}
                      maxValue={60}
                      minValue={5}
                      defaultValue={30}
                      showSteps={true}
                    />
                    <Switch defaultSelected>Pre-cargar datos frecuentes</Switch>
                    <Switch>Comprimir respuestas API</Switch>
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Optimización de Base de Datos</h3>
                  <div className="flex flex-col gap-3">
                    <Button variant="flat" className="justify-start">
                      Reconstruir Índices
                    </Button>
                    <Button variant="flat" className="justify-start">
                      Limpiar Datos Temporales
                    </Button>
                    <Button variant="flat" className="justify-start">
                      Analizar Tablas
                    </Button>
                    <Button variant="flat" color="warning" className="justify-start">
                      Vacuumar Base de Datos
                    </Button>
                  </div>
                </section>
              </CardBody>
            </Card>
          </Tab>

          {/* --- EMAIL/SMTP TAB (NEW) --- */}
          <Tab
            key="email"
            title={
              <div className="flex items-center space-x-2">
                <EmailOutlinedIcon />
                <span>Email/SMTP</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="gap-8 p-8">
                <section>
                  <h3 className="text-xl font-semibold mb-4">Configuración del Servidor SMTP</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Servidor SMTP" placeholder="smtp.gmail.com" defaultValue="smtp.gmail.com" />
                    <Input label="Puerto" placeholder="587" defaultValue="587" />
                    <Input label="Usuario" placeholder="notificaciones@uam.com" />
                    <Input label="Contraseña" type="password" placeholder="••••••••" />
                    <div className="md:col-span-2">
                      <Input label="Email Remitente" placeholder="noreply@uam.com" defaultValue="noreply@uam.com" />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-4">
                    <Switch defaultSelected>Usar TLS/SSL</Switch>
                    <Switch>Modo Debug</Switch>
                  </div>
                  <Button color="primary" className="mt-4">
                    Probar Conexión SMTP
                  </Button>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Editor de Templates</h3>
                  <EmailTemplateEditor />
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Registro de Emails Enviados</h3>
                  <Table aria-label="Registro de emails">
                    <TableHeader>
                      <TableColumn>DESTINATARIO</TableColumn>
                      <TableColumn>ASUNTO</TableColumn>
                      <TableColumn>FECHA</TableColumn>
                      <TableColumn>ESTADO</TableColumn>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>usuario@example.com</TableCell>
                        <TableCell>Bienvenida al Sistema</TableCell>
                        <TableCell>2024-12-04 22:30</TableCell>
                        <TableCell><Chip size="sm" color="success">Enviado</Chip></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>admin@example.com</TableCell>
                        <TableCell>Reporte Semanal</TableCell>
                        <TableCell>2024-12-04 22:25</TableCell>
                        <TableCell><Chip size="sm" color="danger">Error</Chip></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </section>
              </CardBody>
            </Card>
          </Tab>

          {/* --- CUSTOMIZATION TAB (NEW) --- */}
          <Tab
            key="customization"
            title={
              <div className="flex items-center space-x-2">
                <PaletteOutlinedIcon />
                <span>Personalización</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="gap-8 p-8">
                <section>
                  <h3 className="text-xl font-semibold mb-4">Colores Corporativos</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-small mb-2">Color Primario</p>
                      <input type="color" defaultValue="#0070f3" className="w-full h-12 rounded border-2" />
                    </div>
                    <div>
                      <p className="text-small mb-2">Color Secundario</p>
                      <input type="color" defaultValue="#7928ca" className="w-full h-12 rounded border-2" />
                    </div>
                    <div>
                      <p className="text-small mb-2">Color de Éxito</p>
                      <input type="color" defaultValue="#17c964" className="w-full h-12 rounded border-2" />
                    </div>
                    <div>
                      <p className="text-small mb-2">Color de Error</p>
                      <input type="color" defaultValue="#f31260" className="w-full h-12 rounded border-2" />
                    </div>
                  </div>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Tipografía</h3>
                  <Select label="Fuente del Sistema" defaultSelectedKeys={["inter"]}>
                    <SelectItem key="inter">Inter</SelectItem>
                    <SelectItem key="roboto">Roboto</SelectItem>
                    <SelectItem key="opensans">Open Sans</SelectItem>
                    <SelectItem key="lato">Lato</SelectItem>
                  </Select>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">CSS Personalizado</h3>
                  <Textarea
                    label="Estilos Personalizados"
                    placeholder="/* Agrega tu CSS aquí */"
                    minRows={8}
                    description="Estos estilos se aplicarán globalmente en toda la aplicación"
                  />
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Temas Predefinidos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border-2 border-primary rounded-lg cursor-pointer hover:bg-primary-50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500"></div>
                        <p className="font-semibold">Azul Corporativo</p>
                      </div>
                      <p className="text-tiny text-default-500">Tema clásico y profesional</p>
                    </div>
                    <div className="p-4 border-2 border-default-200 rounded-lg cursor-pointer hover:bg-default-50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-purple-500"></div>
                        <p className="font-semibold">Violeta Moderno</p>
                      </div>
                      <p className="text-tiny text-default-500">Vibrante y contemporáneo</p>
                    </div>
                    <div className="p-4 border-2 border-default-200 rounded-lg cursor-pointer hover:bg-default-50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-green-500"></div>
                        <p className="font-semibold">Verde Natural</p>
                      </div>
                      <p className="text-tiny text-default-500">Fresco y ecológico</p>
                    </div>
                  </div>
                </section>
              </CardBody>
            </Card>
          </Tab>

          {/* --- AUTO DISCOVERY TAB (NEW) --- */}
          <Tab
            key="discovery"
            title={
              <div className="flex items-center space-x-2">
                <RadarOutlinedIcon />
                <span>Inventario Automático</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="gap-8 p-8">
                <section>
                  <h3 className="text-xl font-semibold mb-4">Escaneo de Red</h3>
                  <p className="text-default-500 mb-4">
                    Detecta automáticamente dispositivos conectados a la red y agrégalos al inventario.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Rango de IPs" placeholder="192.168.1.0/24" defaultValue="192.168.1.0/24" />
                    <Select label="Frecuencia de Escaneo" defaultSelectedKeys={["daily"]}>
                      <SelectItem key="hourly">Cada Hora</SelectItem>
                      <SelectItem key="daily">Diario</SelectItem>
                      <SelectItem key="weekly">Semanal</SelectItem>
                      <SelectItem key="manual">Manual</SelectItem>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-3 mt-4">
                    <Switch defaultSelected>Detectar nuevos dispositivos</Switch>
                    <Switch defaultSelected>Alertar sobre dispositivos desconocidos</Switch>
                    <Switch>Agregar automáticamente al inventario</Switch>
                    <Switch>Escanear puertos abiertos</Switch>
                  </div>
                  <Button color="primary" className="mt-4">
                    Iniciar Escaneo Ahora
                  </Button>
                </section>
                <Divider />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Dispositivos Detectados</h3>
                  <Table aria-label="Dispositivos detectados">
                    <TableHeader>
                      <TableColumn>IP</TableColumn>
                      <TableColumn>HOSTNAME</TableColumn>
                      <TableColumn>MAC</TableColumn>
                      <TableColumn>TIPO</TableColumn>
                      <TableColumn>ESTADO</TableColumn>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>192.168.1.10</TableCell>
                        <TableCell>LAPTOP-001</TableCell>
                        <TableCell>AA:BB:CC:DD:EE:01</TableCell>
                        <TableCell>PC</TableCell>
                        <TableCell><Chip size="sm" color="success">Registrado</Chip></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>192.168.1.15</TableCell>
                        <TableCell>PRINTER-HP</TableCell>
                        <TableCell>AA:BB:CC:DD:EE:02</TableCell>
                        <TableCell>Impresora</TableCell>
                        <TableCell><Chip size="sm" color="warning">Nuevo</Chip></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>192.168.1.20</TableCell>
                        <TableCell>UNKNOWN</TableCell>
                        <TableCell>AA:BB:CC:DD:EE:03</TableCell>
                        <TableCell>Desconocido</TableCell>
                        <TableCell><Chip size="sm" color="danger">No autorizado</Chip></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </section>
              </CardBody>
            </Card>
          </Tab>

          {/* --- QR CODES TAB (NEW) --- */}
          <Tab
            key="qrcodes"
            title={
              <div className="flex items-center space-x-2">
                <QrCode2OutlinedIcon />
                <span>QR y Etiquetas</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="gap-8 p-8">
                <section>
                  <h3 className="text-2xl font-semibold mb-4">Generación de Códigos QR</h3>
                  <p className="text-default-500 mb-6">
                    Genera códigos QR masivamente para tus activos y ubicaciones. Facilita el proceso de inventario y seguimiento.
                  </p>
                  <QRGenerator />
                </section>
                <Divider className="my-6" />
                <section>
                  <h3 className="text-xl font-semibold mb-4">Configuración de Impresión</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select label="Tamaño de Etiqueta" defaultSelectedKeys={["50x30"]}>
                      <SelectItem key="50x30">50mm x 30mm (Estándar)</SelectItem>
                      <SelectItem key="40x25">40mm x 25mm (Pequeña)</SelectItem>
                      <SelectItem key="60x40">60mm x 40mm (Grande)</SelectItem>
                    </Select>
                    <Select label="Impresora" defaultSelectedKeys={["zebra"]}>
                      <SelectItem key="zebra">Zebra ZD420</SelectItem>
                      <SelectItem key="brother">Brother QL-820NWB</SelectItem>
                      <SelectItem key="dymo">Dymo LabelWriter 450</SelectItem>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-3 mt-4">
                    <Checkbox defaultSelected>Incluir logo de la empresa</Checkbox>
                    <Checkbox defaultSelected>Incluir ID del activo</Checkbox>
                    <Checkbox defaultSelected>Incluir nombre del activo</Checkbox>
                    <Checkbox>Incluir código de barras adicional</Checkbox>
                  </div>
                </section>
              </CardBody>
            </Card>
          </Tab>



          {/* --- NETWORK TOPOLOGY TAB (NEW) --- */}
          <Tab
            key="network"
            title={
              <div className="flex items-center space-x-2">
                <AccountTreeOutlinedIcon />
                <span>Topología de Red</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="p-8">
                <div className="flex flex-col items-center">
                  <h3 className="text-2xl font-bold mb-6">Mapa de Red</h3>
                  <p className="text-default-500 mb-8 max-w-2xl text-center">
                    Visualización dinámica de activos informáticos agrupados por subred.
                  </p>
                  <NetworkDiagram />
                </div>
              </CardBody>
            </Card>
          </Tab>

          {/* --- DATABASE ERD TAB (NEW) --- */}
          <Tab
            key="database"
            title={
              <div className="flex items-center space-x-2">
                <AccountTreeOutlinedIcon />
                <span>Modelo E-R</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="p-8">
                <div className="flex flex-col items-center">
                  <h3 className="text-2xl font-bold mb-6">Diagrama Entidad-Relación (ERD)</h3>
                  <p className="text-default-500 mb-8 max-w-2xl text-center">
                    Visualización interactiva de la estructura de la base de datos. Puedes arrastrar las tablas para organizar la vista.
                  </p>
                  <ERDCanvas />
                </div>
              </CardBody>
            </Card>
          </Tab>
        </Tabs>
      </div >
    </div >
  );
}
