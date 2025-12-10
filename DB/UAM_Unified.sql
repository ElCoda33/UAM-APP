-- -----------------------------------------------------
-- UAM Unified Database Script
-- Combines UAM.sql, audit_logs.sql, and UAM_Extended.sql
-- -----------------------------------------------------

-- Ensures a clean slate if re-running the script
DROP DATABASE IF EXISTS UAM_App_DB;
CREATE DATABASE UAM_App_DB;
USE UAM_App_DB;

-- -----------------------------------------------------
-- Table `sections`
-- -----------------------------------------------------
CREATE TABLE sections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL, 
  management_level INT,
  email VARCHAR(100) NULL,
  parent_section_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_sections_parent_section
    FOREIGN KEY (parent_section_id)
    REFERENCES sections (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  INDEX idx_sections_deleted_at (deleted_at),
  INDEX idx_sections_name (name)
);

-- -----------------------------------------------------
-- Table `roles`
-- -----------------------------------------------------
CREATE TABLE roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_roles_deleted_at (deleted_at),
  INDEX idx_roles_name (name)
);

-- -----------------------------------------------------
-- Table `users`
-- -----------------------------------------------------
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NULL, -- Será NULL para usuarios que no pueden loggearse
  can_login BOOLEAN NOT NULL DEFAULT TRUE, -- MODIFICACIÓN: Controla explícitamente si el usuario puede iniciar sesión.
  first_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NULL,
  avatar_url VARCHAR(255) NULL,
  email_verified_at DATETIME NULL,
  national_id VARCHAR(50) NULL,
  section_id INT UNSIGNED NULL,
  status ENUM('active', 'disabled', 'on_vacation', 'pending_approval') DEFAULT 'active',
  birth_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_users_section
    FOREIGN KEY (section_id)
    REFERENCES sections (id)
    ON DELETE SET NULL 
    ON UPDATE CASCADE,
  INDEX idx_users_deleted_at (deleted_at),
  INDEX idx_users_email (email),
  INDEX idx_users_national_id (national_id)
);

-- -----------------------------------------------------
-- Table `user_roles`
-- -----------------------------------------------------
CREATE TABLE user_roles (
  user_id INT UNSIGNED NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_roles_role
    FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- -----------------------------------------------------
-- Table `companies`
-- -----------------------------------------------------
CREATE TABLE companies (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tax_id VARCHAR(50) NOT NULL,
  phone_number VARCHAR(50) NULL,
  trade_name VARCHAR(100) NULL,
  legal_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_companies_deleted_at (deleted_at),
  INDEX idx_companies_tax_id (tax_id)
);

-- -----------------------------------------------------
-- Table `locations`
-- -----------------------------------------------------
CREATE TABLE locations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  section_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_locations_section
    FOREIGN KEY (section_id)
    REFERENCES sections (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  INDEX idx_locations_deleted_at (deleted_at),
  INDEX idx_locations_name (name)
);

-- -----------------------------------------------------
-- Table `assets`
-- -----------------------------------------------------
CREATE TABLE assets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  serial_number VARCHAR(100) NULL,
  inventory_code VARCHAR(200) NULL,
  description TEXT NULL,
  product_name VARCHAR(100) NOT NULL,
  warranty_expiry_date DATE NULL,
  purchase_date DATE NULL,
  invoice_number VARCHAR(100) NULL,
  acquisition_procedure VARCHAR(255) NULL,
  status ENUM('in_use', 'in_storage', 'under_repair', 'disposed', 'lost') DEFAULT 'in_storage',
  -- Merged ENUM values from UAM.sql and UAM_Extended.sql
  asset_type ENUM('general', 'informatica', 'mobiliario', 'vehiculo', 'otro') DEFAULT 'otro',
  -- Merged ENUM values, keeping UAM.sql set as it is larger
  it_device_type ENUM('pc', 'notebook', 'router', 'switch', 'access_point', 'server', 'printer', 'firewall', 'nas', 'otro') NULL,
  ip_address VARCHAR(45) NULL,
  subnet_mask VARCHAR(45) NULL,
  image_url VARCHAR(255) NULL,
  current_section_id INT UNSIGNED NULL,
  current_location_id INT UNSIGNED NULL,
  supplier_company_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_assets_section FOREIGN KEY (current_section_id) REFERENCES sections (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_assets_location FOREIGN KEY (current_location_id) REFERENCES locations (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_assets_supplier FOREIGN KEY (supplier_company_id) REFERENCES companies (id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_assets_deleted_at (deleted_at),
  INDEX idx_assets_inventory_code (inventory_code),
  INDEX idx_assets_serial_number (serial_number),
  INDEX idx_assets_asset_type (asset_type),
  INDEX idx_assets_ip_address (ip_address)
);

CREATE TABLE asset_assignments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id INT UNSIGNED NOT NULL,
  assigned_to_user_id INT UNSIGNED NOT NULL,
  assignment_date DATE NOT NULL,
  return_date DATE NULL,
  notes TEXT NULL,
  signature_image_url VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_asset_assignments_asset FOREIGN KEY (asset_id) REFERENCES assets (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_asset_assignments_user FOREIGN KEY (assigned_to_user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_asset_assignments_deleted_at (deleted_at)
);

CREATE TABLE asset_network_connections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id INT UNSIGNED NOT NULL,
  connected_to_asset_id INT UNSIGNED NOT NULL,
  connection_type ENUM('ethernet', 'wifi', 'fiber', 'uplink', 'other') DEFAULT 'ethernet',
  port_number VARCHAR(50) NULL COMMENT 'Puerto o interfaz (ej: eth0, GigabitEthernet1/0/1)',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_anc_asset FOREIGN KEY (asset_id) REFERENCES assets (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_anc_connected_asset FOREIGN KEY (connected_to_asset_id) REFERENCES assets (id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_anc_asset_id (asset_id),
  INDEX idx_anc_connected_asset_id (connected_to_asset_id),
  INDEX idx_anc_both_assets (asset_id, connected_to_asset_id)
);


-- -----------------------------------------------------
-- Table `asset_transfers`
-- -----------------------------------------------------
CREATE TABLE asset_transfers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id INT UNSIGNED NOT NULL,
  transfer_date DATETIME NOT NULL,
  from_section_id INT UNSIGNED NULL,
  from_location_id INT UNSIGNED NULL,
  from_user_id INT UNSIGNED NULL,
  to_section_id INT UNSIGNED NULL,
  to_location_id INT UNSIGNED NULL,
  to_user_id INT UNSIGNED NULL,
  transfer_reason TEXT NULL,
  authorized_by_user_id INT UNSIGNED NULL,
  received_by_user_id INT UNSIGNED NULL,
  received_date DATETIME NULL,
  signature_image_url VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_at_asset FOREIGN KEY (asset_id) REFERENCES assets (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_at_from_section FOREIGN KEY (from_section_id) REFERENCES sections (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_at_from_location FOREIGN KEY (from_location_id) REFERENCES locations (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_at_from_user FOREIGN KEY (from_user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_at_to_section FOREIGN KEY (to_section_id) REFERENCES sections (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_at_to_location FOREIGN KEY (to_location_id) REFERENCES locations (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_at_to_user FOREIGN KEY (to_user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_at_auth_user FOREIGN KEY (authorized_by_user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_at_rec_user FOREIGN KEY (received_by_user_id) REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
);


CREATE TABLE software_licenses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  software_name VARCHAR(255) NOT NULL,
  software_version VARCHAR(100) NULL,
  license_key VARCHAR(255) NULL,
  license_type ENUM(
    'oem', 'retail', 'volume_mak', 'volume_kms', 
    'subscription_user', 'subscription_device', 
    'concurrent', 'freeware', 'open_source', 'other'
  ) NOT NULL DEFAULT 'other',
  seats INT UNSIGNED NOT NULL DEFAULT 1,
  purchase_date DATE NULL,
  purchase_cost DECIMAL(10,2) NULL,
  expiry_date DATE NULL,
  supplier_company_id INT UNSIGNED NULL,
  invoice_number VARCHAR(100) NULL,
  assigned_to_user_id INT UNSIGNED NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_sl_supplier_company_revised
    FOREIGN KEY (supplier_company_id)
    REFERENCES companies (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_sl_assigned_user_revised
    FOREIGN KEY (assigned_to_user_id)
    REFERENCES users (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  INDEX idx_sl_software_name (software_name),
  INDEX idx_sl_license_key (license_key),
  INDEX idx_sl_expiry_date (expiry_date),
  INDEX idx_sl_supplier_company_id (supplier_company_id),
  INDEX idx_sl_assigned_to_user_id (assigned_to_user_id),
  INDEX idx_sl_deleted_at (deleted_at)
);

-- -----------------------------------------------------
-- Table `asset_software_license_assignments`
-- -----------------------------------------------------
CREATE TABLE asset_software_license_assignments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id INT UNSIGNED NOT NULL,
  software_license_id INT UNSIGNED NOT NULL,
  installation_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_asset_license_assignment UNIQUE (asset_id, software_license_id),
  CONSTRAINT fk_asla_asset
    FOREIGN KEY (asset_id)
    REFERENCES assets (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_asla_software_license
    FOREIGN KEY (software_license_id)
    REFERENCES software_licenses (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_asla_asset_id (asset_id),
  INDEX idx_asla_software_license_id (software_license_id)
);


CREATE TABLE IF NOT EXISTS documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  file_size_bytes INT UNSIGNED NOT NULL,
  storage_path VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50) NULL,
  entity_id INT UNSIGNED NULL,
  document_category VARCHAR(50) NULL,
  description TEXT NULL,
  uploaded_by_user_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_documents_uploaded_by_user
    FOREIGN KEY (uploaded_by_user_id)
    REFERENCES users (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  INDEX idx_documents_entity (entity_type, entity_id),
  INDEX idx_documents_deleted_at (deleted_at),
  INDEX idx_documents_category (document_category)
);


-- -----------------------------------------------------
-- Table `notifications`
-- -----------------------------------------------------
CREATE TABLE notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type ENUM(
    'LICENSE_EXPIRING_SOON', 
    'LICENSE_EXPIRED', 
    'ASSET_RETURN_DUE', 
    'ASSET_RETURN_OVERDUE',
    'NEW_ASSET_ASSIGNED',
    'MAINTENANCE_REQUIRED',
    'LOW_LICENSE_SEATS',
    'USER_APPROVAL_PENDING',
    'INFO'
    ) NOT NULL,
  message VARCHAR(512) NOT NULL,
  link VARCHAR(255) NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  entity_type VARCHAR(50) NULL,
  entity_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_notifications_user_is_read (user_id, is_read)
);

-- -----------------------------------------------------
-- from audit_logs.sql
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL, -- Renamed from entity to entity_type to match indexes usage
    entity_id VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- from UAM_Extended.sql
-- -----------------------------------------------------

-- 1. System Settings (Key-Value Store for Configuration)
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
    setting_value TEXT,
    setting_group VARCHAR(50) NOT NULL, -- e.g., 'general', 'security', 'notifications'
    data_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_settings_group (setting_group)
);

-- Seed default settings
INSERT IGNORE INTO system_settings (setting_key, setting_value, setting_group, data_type, description) VALUES
('org_name', 'UAM', 'general', 'string', 'Nombre de la Organización'),
('theme_mode', 'light', 'general', 'string', 'Tema predeterminado (light/dark)'),
('password_min_length', '8', 'security', 'number', 'Longitud mínima de contraseña'),
('session_timeout', '30', 'security', 'number', 'Tiempo de inactividad en minutos'),
('asset_tag_prefix', 'AST-', 'assets', 'string', 'Prefijo para etiquetas de activos'),
('maintenance_mode', 'false', 'system', 'boolean', 'Modo mantenimiento activado');

-- 2. Advanced RBAC (Permissions)
CREATE TABLE IF NOT EXISTS permissions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'asset.create', 'user.view'
    description VARCHAR(255),
    module VARCHAR(50), -- e.g., 'assets', 'users', 'reports'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT UNSIGNED NOT NULL,
    permission_id INT UNSIGNED NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
);

-- Seed basic permissions
INSERT IGNORE INTO permissions (code, description, module) VALUES
('asset.view', 'Ver activos', 'assets'),
('asset.create', 'Crear activos', 'assets'),
('asset.edit', 'Editar activos', 'assets'),
('asset.delete', 'Eliminar activos', 'assets'),
('user.view', 'Ver usuarios', 'users'),
('user.manage', 'Gestionar usuarios', 'users'),
('report.view', 'Ver reportes', 'reports'),
('config.manage', 'Gestionar configuración', 'system');

-- Assign all permissions to Admin (Role ID 1)
-- Note: Roles must be inserted first via UAM.sql inserts below
-- We will move the INSERTS for roles/users to AFTER table creation, which is normal.
-- But since this is a merged file, the inserts from UAM.sql are typically at the end of UAM.sql.
-- I need to make sure UAM.sql inserts are present.

-- 3. Custom Fields for Assets
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    field_type ENUM('text', 'number', 'date', 'boolean', 'select') NOT NULL,
    options JSON NULL, -- For 'select' type options
    is_required BOOLEAN DEFAULT FALSE,
    entity_type VARCHAR(50) DEFAULT 'asset', -- Future proofing for other entities
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_field_values (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    definition_id INT UNSIGNED NOT NULL,
    entity_id INT UNSIGNED NOT NULL, -- Asset ID
    value_text TEXT,
    value_number DECIMAL(15, 4),
    value_date DATETIME,
    value_boolean BOOLEAN,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cfv_def FOREIGN KEY (definition_id) REFERENCES custom_field_definitions (id) ON DELETE CASCADE,
    CONSTRAINT fk_cfv_asset FOREIGN KEY (entity_id) REFERENCES assets (id) ON DELETE CASCADE,
    INDEX idx_cfv_entity (entity_id)
);

-- 4. Workflows & Approvals
CREATE TABLE IF NOT EXISTS approval_requests (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    requester_user_id INT UNSIGNED NOT NULL,
    approver_user_id INT UNSIGNED NULL, -- Can be NULL if assigned to a Role instead
    approver_role_id INT UNSIGNED NULL,
    request_type ENUM('asset_disposal', 'software_purchase', 'access_request', 'other') NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    entity_type VARCHAR(50) NOT NULL, -- e.g., 'asset', 'software_license'
    entity_id INT UNSIGNED NOT NULL,
    reason TEXT,
    comments TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    CONSTRAINT fk_ar_requester FOREIGN KEY (requester_user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_ar_approver FOREIGN KEY (approver_user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_ar_role FOREIGN KEY (approver_role_id) REFERENCES roles (id) ON DELETE SET NULL,
    INDEX idx_ar_status (status),
    INDEX idx_ar_entity (entity_type, entity_id)
);

-- 5. Performance Optimizations (Indexes)

CREATE INDEX idx_assets_product_name ON assets(product_name);
CREATE INDEX idx_assets_purchase_date ON assets(purchase_date);
CREATE INDEX idx_assets_status_location ON assets(status, current_location_id);

CREATE INDEX idx_users_status_email ON users(status, email);
CREATE INDEX idx_users_section_id ON users(section_id);

-- Optimized for renamed column
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX idx_notifications_unread_user ON notifications(user_id, is_read);

-- 6. Mobile App Support
CREATE TABLE IF NOT EXISTS mobile_device_tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    device_token VARCHAR(255) NOT NULL, -- FCM / APNS Token
    device_os VARCHAR(20), -- 'ios', 'android'
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_mdt_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_device (user_id, device_token)
);

-- -----------------------------------------------------
-- DATA INSERTS (From UAM.sql)
-- -----------------------------------------------------

INSERT INTO roles (name, description, created_at, updated_at) VALUES
('Admin', 'Administrador del Sistema con todos los permisos.', NOW(), NOW()),
('Manager', 'Gerente de Sección/Departamento.', NOW(), NOW()),
('User', 'Usuario Estándar del sistema.', NOW(), NOW()),
('Technician', 'Técnico de Soporte TI.', NOW(), NOW()),
('Auditor', 'Auditor con permisos de solo lectura para reportes.', NOW(), NOW());

INSERT INTO sections (name, management_level, email, parent_section_id, created_at, updated_at) VALUES
('Dirección General', 1, 'direccion@uam.com.uy', NULL, NOW(), NOW()),
('Gerencia General', 2, 'gerencia.general@uam.com.uy', 1, NOW(), NOW()),
('Departamento de TI', 2, 'ti@uam.com.uy', 1, NOW(), NOW()),
('Recursos Humanos', 2, 'rrhh@uam.com.uy', 1, NOW(), NOW()),
('Ventas y Marketing', 2, 'ventas@uam.com.uy', 1, NOW(), NOW());

INSERT INTO sections (name, management_level, email, parent_section_id, created_at, updated_at) VALUES
('Soporte Técnico (TI)', 3, 'soporte.ti@uam.com.uy', 3, NOW(), NOW()), 
('Desarrollo de Software (TI)', 3, 'desarrollo.ti@uam.com.uy', 3, NOW(), NOW()), 
('Operaciones (Ventas)', 3, 'operaciones.ventas@uam.com.uy', 5, NOW(), NOW()); 

INSERT INTO sections (name, management_level, email, parent_section_id, created_at, updated_at, deleted_at) VALUES
('Antigua Sección Logística', 3, 'logistica.old@uam.com.uy', 1, '2023-01-01 10:00:00', '2023-06-15 12:00:00', '2023-06-15 12:00:00');

INSERT INTO users (email, password_hash, first_name, last_name, avatar_url, status, section_id, birth_date, email_verified_at, created_at, updated_at) VALUES
('admin@uam.com.uy', 'bcrypt_hashed_password_admin', 'Admin', 'Principal', 'https://i.pravatar.cc/150?u=admin', 'active', 2, '1980-01-01', NOW(), NOW(), NOW()), 
('manager@uam.com.uy', 'bcrypt_hashed_password_manager', 'Ana', 'Pérez', 'https://i.pravatar.cc/150?u=manager', 'active', 2, '1985-05-15', NOW(), NOW(), NOW()), 
('tech@uam.com.uy', 'bcrypt_hashed_password_tech', 'Carlos', 'Lopez', 'https://i.pravatar.cc/150?u=tech', 'active', 6, '1990-07-20', NOW(), NOW(), NOW()), 
('sales01@uam.com.uy', 'bcrypt_hashed_password_sales1', 'Laura', 'Gomez', 'https://i.pravatar.cc/150?u=sales01', 'active', 8, '1992-03-10', NOW(), NOW(), NOW()), 
('hr01@uam.com.uy', 'bcrypt_hashed_password_hr1', 'Pedro', 'Rodriguez', 'https://i.pravatar.cc/150?u=hr01', 'active', 4, '1988-11-05', NOW(), NOW(), NOW()), 
('dev01@uam.com.uy', 'bcrypt_hashed_password_dev1', 'Sofia', 'Martinez', 'https://i.pravatar.cc/150?u=dev01', 'on_vacation', 7, '1995-09-25', NOW(), NOW(), NOW()); 

INSERT INTO users (email, password_hash, first_name, last_name, status, section_id, created_at, updated_at, deleted_at) VALUES
('olduser@uam.com.uy', 'bcrypt_hashed_password_old', 'Usuario', 'Antiguo', 'disabled', NULL, '2022-05-01 00:00:00', '2023-01-01 00:00:00', '2023-01-01 00:00:00'); 

INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES
(1, 1, NOW()), 
(2, 2, NOW()), 
(3, 4, NOW()), 
(3, 3, NOW()), 
(4, 3, NOW()), 
(5, 3, NOW()), 
(5, 2, NOW()), 
(6, 3, NOW()); 

INSERT INTO companies (tax_id, legal_name, trade_name, phone_number, email, created_at, updated_at) VALUES
('210001110011', 'Tech Solutions Ltd.', 'TechSol', '29001234', 'contacto@techsol.com.uy', NOW(), NOW()),
('210002220012', 'Office Supplies Co.', 'OfficePro', '26005678', 'ventas@officepro.com.uy', NOW(), NOW()),
('210003330013', 'Secure Assets Inc.', 'SecureAssets', '24009012', 'info@secureassets.com.uy', NOW(), NOW()),
('210004440014', 'Hardware Pro Uruguay S.A.', 'HardPro', '099123456', 'soporte@hardpro.com.uy', NOW(), NOW());

INSERT INTO locations (name, description, section_id, created_at, updated_at) VALUES
('Oficina Central - Piso 1 (Dirección)', 'Área de Dirección y Gerencia', 2, NOW(), NOW()), 
('Oficina Central - Piso 2 (TI)', 'Departamento de Tecnologías de la Información', 3, NOW(), NOW()), 
('Sucursal Norte - Almacén', 'Almacén principal de activos en Sucursal Norte', 8, NOW(), NOW()), 
('Data Center Principal (TI)', 'Rack A01-A05, Sala de Servidores Principal', 3, NOW(), NOW()), 
('Sala de Reuniones Alfa', 'Sala para reuniones generales', 2, NOW(), NOW()); 

INSERT INTO assets (inventory_code, product_name, description, serial_number, status, purchase_date, warranty_expiry_date, supplier_company_id, current_section_id, current_location_id, image_url, acquisition_procedure, invoice_number, created_at, updated_at) VALUES
('UAM-LT-001', 'Dell XPS 15 9520', 'Laptop para desarrollo y diseño', 'DELLXPS15-SN001', 'in_use', '2023-06-15', '2026-06-14', 1, 7, 2, '/uploads/assets/laptop_dell_xps15.jpg', 'Compra Directa', 'TS-INV-2023-070', NOW(), NOW()), 
('UAM-SRV-001', 'HPE ProLiant DL380 Gen10', 'Servidor para virtualización', 'HPESRV-SN001', 'in_use', '2023-03-20', '2026-03-19', 4, 3, 4, '/uploads/assets/server_hpe_dl380.jpg', 'Licitación Pública 01/23', 'HP-INV-2023-015', NOW(), NOW()), 
('UAM-DSK-001', 'Workstation Custom Ryzen 9', 'PC alto rendimiento para Diseño Gráfico', 'CUSTOM-SN001', 'in_storage', '2024-01-10', '2027-01-09', 4, 7, 2, '/uploads/assets/workstation_custom.jpg', 'Armado por Partes', 'HP-INV-2024-002', NOW(), NOW()), 
('UAM-PRN-001', 'HP LaserJet Pro M404dn', 'Impresora láser B/N para oficina', 'HPPRN-SN001', 'under_repair', '2022-08-01', '2023-07-31', 2, 4, 1, NULL, 'Compra Directa', 'OP-INV-2022-112', NOW(), NOW()), 
('UAM-MON-001', 'Dell UltraSharp U2723QE', 'Monitor 4K 27 pulgadas', 'DELLMON-SN001', 'in_use', '2023-06-15', '2026-06-14', 1, 7, 2, NULL, 'Compra Directa', 'TS-INV-2023-070', NOW(), NOW()); 

INSERT INTO assets (inventory_code, product_name, description, serial_number, status, purchase_date, warranty_expiry_date, supplier_company_id, current_section_id, current_location_id, created_at, updated_at, deleted_at) VALUES
('UAM-LT-002', 'Apple MacBook Pro 14 M1', 'Laptop para Gerencia (obsoleta)', 'MACBOOKPRO-SN001', 'disposed', '2021-05-01', '2023-04-30', 1, NULL, NULL, '2021-05-01', '2023-12-01', '2023-12-01'); 

-- Network Assets
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

INSERT INTO asset_assignments (asset_id, assigned_to_user_id, assignment_date, notes, created_at, updated_at) VALUES
(1, 6, '2023-07-01', 'Asignado a Sofia Martinez para desarrollo', NOW(), NOW()), 
(5, 6, '2023-07-01', 'Monitor asignado junto con laptop a Sofia Martinez', NOW(), NOW()); 

INSERT INTO asset_assignments (asset_id, assigned_to_user_id, assignment_date, return_date, notes, created_at, updated_at) VALUES
(4, 5, '2022-09-01', '2024-02-15', 'Impresora para Pedro Rodriguez, devuelta por falla.', NOW(), NOW()); 

INSERT INTO asset_transfers (asset_id, transfer_date, from_section_id, from_location_id, to_section_id, to_location_id, to_user_id, transfer_reason, authorized_by_user_id) VALUES
(3, '2024-02-01 10:00:00', NULL, NULL, 7, 2, 6, 'Nuevo equipo para desarrollador', 2), 
(1, '2024-03-15 14:30:00', 7, 2, 6, 2, 3, 'Reasignación temporal a Soporte Técnico', 2); 

INSERT INTO software_licenses (software_name, software_version, license_key, license_type, seats, purchase_date, purchase_cost, expiry_date, supplier_company_id, invoice_number, assigned_to_user_id, notes) VALUES
('Microsoft Office 365 E3', 'Cloud', 'SUB-M365-E3-ORG01', 'subscription_user', 100, '2024-01-01', 2000.00, '2024-12-31', 1, 'TS-M365-2024', 2, 'Suscripción anual para toda la organización.'), 
('Adobe Photoshop CC 2024', '2024', 'SUB-ADBPS-2024-DESIGN01', 'subscription_user', 5, '2024-02-15', 120.00, '2025-02-14', 2, 'OP-ADOBE-2024', 2, '5 licencias para equipo de diseño/marketing.'),
('Windows Server 2022 Datacenter', '2022', 'VOL-WINDC-2022-SERV001', 'volume_mak', 2, '2023-03-10', 2500.00, NULL, 4, 'HP-WSERV-2023', 3, 'Licencias para 2 servidores de virtualización.'),
('VMware vSphere Standard', '8.x', 'VMW-VSPH-STD-CLUSTER01', 'subscription_device', 10, '2023-04-01', 3000.00, '2026-03-31', 3, 'SA-VMW-2023', 3, 'Licencia por 3 años para cluster de virtualización (10 sockets CPU).');

INSERT INTO asset_software_license_assignments (asset_id, software_license_id, installation_date, notes) VALUES
(1, 1, '2024-01-05', 'Instalado en Dell XPS 15'), 
(3, 1, '2024-01-15', 'Instalado en Workstation Custom'); 

INSERT INTO asset_software_license_assignments (asset_id, software_license_id, installation_date) VALUES
(3, 2, '2024-02-20'); 

INSERT INTO asset_software_license_assignments (asset_id, software_license_id, installation_date, notes) VALUES
(2, 3, '2023-03-15', 'Licencia de Sistema Operativo para HPE Server'); 

INSERT INTO asset_software_license_assignments (asset_id, software_license_id, installation_date) VALUES
(2, 4, '2023-04-05'); 

INSERT INTO users (email, password_hash, first_name, last_name, national_id, status, created_at, updated_at)
VALUES (
    'lucascoda3@gmail.com',
    '$2b$10$ZculHGz6OiF8gksP0eUvFeZeJ1VUGHD/ZuLzzS068fKHjMTLTAOha', 
    'Test',
    'UserOne',
    'TEST001X',
    'active',
    NOW(),
    NOW()
);

INSERT INTO users (email, password_hash, first_name, last_name, national_id, status, created_at, updated_at)
VALUES ("nicolas.colman@fcea.edu.uy","$10$Vi3kBX7JFXPOPHl1V3p1qeJnHTVYLSXwtY5nBAq/v2CXs/Kx4C4R2","Nicolas","Colman","49108215","active",NOW(),NOW());


-- Notifications Inserts
INSERT INTO notifications (user_id, type, message, link, is_read, entity_type, entity_id, created_at) VALUES 
(2, 'LICENSE_EXPIRING_SOON', 'La suscripción de "Microsoft Office 365 E3" vencerá en menos de 30 días.', '/dashboard/softwareLicenses/1', false, 'software_license', 1, DATE_SUB(NOW(), INTERVAL 1 DAY));

INSERT INTO notifications (user_id, type, message, link, is_read, entity_type, entity_id, created_at) VALUES 
(3, 'LICENSE_EXPIRED', 'La licencia de "VMware vSphere Standard" ha expirado.', '/dashboard/softwareLicenses/4', false, 'software_license', 4, DATE_SUB(NOW(), INTERVAL 2 DAY));

INSERT INTO notifications (user_id, type, message, link, is_read, entity_type, entity_id, created_at) VALUES
(6, 'NEW_ASSET_ASSIGNED', 'Se te ha asignado el activo: "Workstation Custom Ryzen 9".', '/dashboard/assets/3', false, 'asset', 3, DATE_SUB(NOW(), INTERVAL 5 HOUR));

INSERT INTO notifications (user_id, type, message, link, is_read, entity_type, entity_id, created_at) VALUES
(2, 'ASSET_RETURN_OVERDUE', 'El préstamo de la impresora "HP LaserJet Pro M404dn" al usuario Pedro Rodriguez está vencido.', '/dashboard/assets/4', false, 'asset', 4, DATE_SUB(NOW(), INTERVAL 3 DAY));

INSERT INTO notifications (user_id, type, message, link, is_read, entity_type, entity_id, created_at) VALUES
(2, 'LOW_LICENSE_SEATS', 'Quedan pocos puestos disponibles para la licencia "Adobe Photoshop CC 2024".', '/dashboard/softwareLicenses/2', true, 'software_license', 2, DATE_SUB(NOW(), INTERVAL 5 DAY));

INSERT INTO notifications (user_id, type, message, link, is_read, entity_type, entity_id, created_at) VALUES
(3, 'MAINTENANCE_REQUIRED', 'El servidor "HPE ProLiant DL380 Gen10" requiere mantenimiento preventivo.', '/dashboard/assets/2', true, 'asset', 2, DATE_SUB(NOW(), INTERVAL 10 DAY));

INSERT INTO notifications (user_id, type, message, link, is_read, entity_type, entity_id, created_at) VALUES
(1, 'INFO', 'El sistema de reportes en PDF ha sido actualizado a la versión 1.1.', NULL, true, NULL, NULL, DATE_SUB(NOW(), INTERVAL 15 DAY));

INSERT INTO asset_network_connections (asset_id, connected_to_asset_id, connection_type, port_number, notes) VALUES
(
  (SELECT id FROM assets WHERE inventory_code = 'UAM-RTR-001' LIMIT 1),
  (SELECT id FROM assets WHERE inventory_code = 'UAM-SW-001' LIMIT 1),
  'ethernet', 'GigabitEthernet0/0/0', 'Uplink principal a switch core'
),
(
  (SELECT id FROM assets WHERE inventory_code = 'UAM-SW-001' LIMIT 1),
  (SELECT id FROM assets WHERE inventory_code = 'UAM-SW-002' LIMIT 1),
  'ethernet', 'GigabitEthernet0/1', 'Trunk a switch piso 2'
),
(
  (SELECT id FROM assets WHERE inventory_code = 'UAM-SW-001' LIMIT 1),
  (SELECT id FROM assets WHERE inventory_code = 'UAM-AP-001' LIMIT 1),
  'ethernet', 'GigabitEthernet0/10', 'PoE para AP oficina'
),
(
  (SELECT id FROM assets WHERE inventory_code = 'UAM-SW-001' LIMIT 1),
  (SELECT id FROM assets WHERE inventory_code = 'UAM-SRV-001' LIMIT 1),
  'ethernet', 'GigabitEthernet0/48', 'Servidor virtualización'
);

-- Insert roles permissions after roles are inserted
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

