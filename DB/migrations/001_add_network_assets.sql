-- =====================================================
-- Migración: Agregar campos de red a activos
-- Fecha: 2024-12-04
-- Descripción: Agrega soporte para activos de informática 
--              con IP, máscara de subred y vinculaciones
-- =====================================================

USE UAM_App_DB;

-- Paso 1: Agregar campos a tabla assets
ALTER TABLE assets
ADD COLUMN asset_type ENUM('informatica', 'mobiliario', 'vehiculo', 'otro') DEFAULT 'otro' AFTER status,
ADD COLUMN it_device_type ENUM('pc', 'notebook', 'router', 'switch', 'access_point', 'server', 'printer', 'firewall', 'nas', 'otro') NULL AFTER asset_type,
ADD COLUMN ip_address VARCHAR(45) NULL AFTER it_device_type,
ADD COLUMN subnet_mask VARCHAR(45) NULL AFTER ip_address;

-- Paso 2: Agregar índices para optimización
ALTER TABLE assets
ADD INDEX idx_assets_asset_type (asset_type),
ADD INDEX idx_assets_ip_address (ip_address);

-- Paso 3: Crear tabla de conexiones de red
CREATE TABLE IF NOT EXISTS asset_network_connections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id INT UNSIGNED NOT NULL,
  connected_to_asset_id INT UNSIGNED NOT NULL,
  connection_type ENUM('ethernet', 'wifi', 'fiber', 'uplink', 'other') DEFAULT 'ethernet',
  port_number VARCHAR(50) NULL COMMENT 'Puerto o interfaz (ej: eth0, GigabitEthernet1/0/1)',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_anc_asset
    FOREIGN KEY (asset_id)
    REFERENCES assets (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_anc_connected_asset
    FOREIGN KEY (connected_to_asset_id)
    REFERENCES assets (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_anc_asset_id (asset_id),
  INDEX idx_anc_connected_asset_id (connected_to_asset_id),
  INDEX idx_anc_both_assets (asset_id, connected_to_asset_id)
) COMMENT='Conexiones de red entre activos de informática';

-- Paso 4: Datos de ejemplo - Actualizar activos existentes a tipo informática
UPDATE assets 
SET asset_type = 'informatica',
    it_device_type = CASE 
      WHEN product_name LIKE '%Server%' OR product_name LIKE '%ProLiant%' THEN 'server'
      WHEN product_name LIKE '%Laptop%' OR product_name LIKE '%XPS%' OR product_name LIKE '%MacBook%' THEN 'notebook'
      WHEN product_name LIKE '%Workstation%' THEN 'pc'
      WHEN product_name LIKE '%Monitor%' THEN 'otro'
      WHEN product_name LIKE '%Printer%' OR product_name LIKE '%LaserJet%' THEN 'printer'
      ELSE 'otro'
    END
WHERE product_name LIKE '%Dell%' 
   OR product_name LIKE '%HP%' 
   OR product_name LIKE '%Server%'
   OR product_name LIKE '%Laptop%'
   OR product_name LIKE '%Workstation%'
   OR product_name LIKE '%Monitor%'
   OR product_name LIKE '%Printer%';

-- Paso 5: Asignar IPs de ejemplo a activos de tipo informática
UPDATE assets 
SET ip_address = '192.168.1.100',
    subnet_mask = '255.255.255.0'
WHERE id = 1 AND asset_type = 'informatica'; -- Laptop Dell

UPDATE assets 
SET ip_address = '192.168.1.50',
    subnet_mask = '255.255.255.0'
WHERE id = 2 AND asset_type = 'informatica'; -- Server HPE

UPDATE assets 
SET ip_address = '192.168.1.101',
    subnet_mask = '255.255.255.0'
WHERE id = 3 AND asset_type = 'informatica'; -- Workstation

-- Paso 6: Insertar datos de ejemplo de activos de red
INSERT INTO assets (
  inventory_code, product_name, description, serial_number, 
  status, asset_type, it_device_type, ip_address, subnet_mask,
  supplier_company_id, current_section_id, current_location_id,
  purchase_date, warranty_expiry_date, created_at, updated_at
) VALUES
('UAM-RTR-001', 'Cisco Router ISR 4331', 'Router principal de red', 'CISCO-SN-RTR001', 
  'in_use', 'informatica', 'router', '192.168.1.1', '255.255.255.0',
  4, 3, 4, '2023-01-15', '2026-01-14', NOW(), NOW()),
  
('UAM-SW-001', 'Cisco Catalyst 2960-X', 'Switch principal 48 puertos', 'CISCO-SN-SW001',
  'in_use', 'informatica', 'switch', '192.168.1.2', '255.255.255.0',
  4, 3, 4, '2023-01-15', '2026-01-14', NOW(), NOW()),
  
('UAM-SW-002', 'Cisco Catalyst 2960', 'Switch secundario 24 puertos', 'CISCO-SN-SW002',
  'in_use', 'informatica', 'switch', '192.168.1.3', '255.255.255.0',
  4, 3, 2, '2023-03-20', '2026-03-19', NOW(), NOW()),

('UAM-AP-001', 'Ubiquiti UniFi AP-AC-PRO', 'Access Point WiFi oficina piso 1', 'UBNT-SN-AP001',
  'in_use', 'informatica', 'access_point', '192.168.1.10', '255.255.255.0',
  4, 2, 1, '2023-05-10', '2026-05-09', NOW(), NOW());

-- Paso 7: Crear conexiones de red de ejemplo
-- Topología: Router → Switch Principal → (Switch Secundario, Access Point, Devices)

INSERT INTO asset_network_connections (asset_id, connected_to_asset_id, connection_type, port_number, notes) VALUES
-- Router conectado al Switch Principal
(
  (SELECT id FROM assets WHERE inventory_code = 'UAM-RTR-001'),
  (SELECT id FROM assets WHERE inventory_code = 'UAM-SW-001'),
  'ethernet', 'GigabitEthernet0/0/0', 'Uplink principal a switch core'
),

-- Switch Principal conectado a Switch Secundario
(
  (SELECT id FROM assets WHERE inventory_code = 'UAM-SW-001'),
  (SELECT id FROM assets WHERE inventory_code = 'UAM-SW-002'),
  'ethernet', 'GigabitEthernet0/1', 'Trunk a switch piso 2'
),

-- Switch Principal conectado a Access Point
(
  (SELECT id FROM assets WHERE inventory_code = 'UAM-SW-001'),
  (SELECT id FROM assets WHERE inventory_code = 'UAM-AP-001'),
  'ethernet', 'GigabitEthernet0/10', 'PoE para AP oficina'
),

-- Switch Principal conectado a Server
(
  (SELECT id FROM assets WHERE inventory_code = 'UAM-SW-001'),
  (SELECT id FROM assets WHERE inventory_code = 'UAM-SRV-001'),
  'ethernet', 'GigabitEthernet0/48', 'Servidor virtualización'
),

-- Switch Secundario conectado a Laptops/PCs
(
  (SELECT id FROM assets WHERE inventory_code = 'UAM-SW-002'),
  (SELECT id FROM assets WHERE inventory_code = 'UAM-LT-001'),
  'ethernet', 'FastEthernet0/1', 'Laptop desarrollo'
),

(
  (SELECT id FROM assets WHERE inventory_code = 'UAM-SW-002'),
  (SELECT id FROM assets WHERE inventory_code = 'UAM-DSK-001'),
  'ethernet', 'FastEthernet0/2', 'Workstation diseño'
);

-- =====================================================
-- Verificación
-- =====================================================

-- Ver todos los activos de informática con sus IPs
SELECT 
  id,
  inventory_code,
  product_name,
  asset_type,
  it_device_type,
  ip_address,
  subnet_mask
FROM assets
WHERE asset_type = 'informatica'
ORDER BY ip_address;

-- Ver todas las conexiones de red
SELECT 
  anc.id,
  a1.inventory_code AS desde_asset,
  a1.product_name AS desde_nombre,
  a2.inventory_code AS hacia_asset,
  a2.product_name AS hacia_nombre,
  anc.connection_type,
  anc.port_number
FROM asset_network_connections anc
JOIN assets a1 ON anc.asset_id = a1.id
JOIN assets a2 ON anc.connected_to_asset_id = a2.id
ORDER BY anc.id;

-- =====================================================
-- Rollback (si es necesario)
-- =====================================================
-- Para ejecutar rollback, descomentar lo siguiente:

/*
-- Eliminar tabla de conexiones
DROP TABLE IF EXISTS asset_network_connections;

-- Eliminar campos agregados a assets
ALTER TABLE assets
DROP COLUMN subnet_mask,
DROP COLUMN ip_address,
DROP COLUMN it_device_type,
DROP COLUMN asset_type,
DROP INDEX idx_assets_asset_type,
DROP INDEX idx_assets_ip_address;

-- Eliminar activos de red de ejemplo (opcional)
DELETE FROM assets WHERE inventory_code IN ('UAM-RTR-001', 'UAM-SW-001', 'UAM-SW-002', 'UAM-AP-001');
*/
