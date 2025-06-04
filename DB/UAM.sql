-- Ensures a clean slate if re-running the script
DROP DATABASE IF EXISTS UAM_App_DB;
CREATE DATABASE UAM_App_DB;
USE UAM_App_DB;

-- -----------------------------------------------------
-- Table `sections`
-- -----------------------------------------------------
CREATE TABLE sections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL, -- Se eliminará UNIQUE temporalmente para manejar soft-delete, se gestionará en la app o con constraint condicional
  management_level INT,
  email VARCHAR(100) NULL, -- Se eliminará UNIQUE temporalmente
  parent_section_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL, -- Para eliminación lógica
  CONSTRAINT fk_sections_parent_section
    FOREIGN KEY (parent_section_id)
    REFERENCES sections (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  INDEX idx_sections_deleted_at (deleted_at),
  INDEX idx_sections_name (name) -- Mantener índice en name
  -- UNIQUE(name, deleted_at) -- Opción si tu DB lo soporta bien para NULLs o usa un valor placeholder para deleted_at en registros activos
);
-- Nota sobre UNIQUE para 'sections.name' y 'sections.email':
-- Con soft delete, un constraint UNIQUE simple en 'name' o 'email' impediría crear un nuevo registro
-- con el mismo nombre/email que uno "eliminado lógicamente". Hay varias estrategias:
-- 1. Eliminar el constraint UNIQUE y manejar la unicidad en la lógica de la aplicación (solo para activos).
-- 2. Usar un constraint UNIQUE compuesto (ej. UNIQUE(name, deleted_at_placeholder_value)) si tu DB lo permite.
-- 3. Al hacer soft-delete, modificar el valor del campo único (ej. name + '_deleted_' + timestamp).
-- Por simplicidad para este ejemplo, he quitado UNIQUE de 'name' y 'email' en 'sections', asumiendo que
-- la lógica de la aplicación (al crear/actualizar) verificará la unicidad entre los registros activos (deleted_at IS NULL).

-- -----------------------------------------------------
-- Table `roles`
-- -----------------------------------------------------
CREATE TABLE roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL, -- UNIQUE quitado temporalmente, manejar en app para activos
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Añadido para consistencia
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Añadido
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_roles_deleted_at (deleted_at),
  INDEX idx_roles_name (name)
);

-- -----------------------------------------------------
-- Table `users`
-- -----------------------------------------------------
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL, -- UNIQUE quitado temporalmente
  password_hash VARCHAR(255) NULL,
  first_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NULL,
  avatar_url VARCHAR(255) NULL,
  email_verified_at DATETIME NULL,
  national_id VARCHAR(50) NULL, -- UNIQUE quitado temporalmente
  section_id INT UNSIGNED NULL, -- CAMBIADO A NULLABLE, ya que sections.id puede ser SET NULL
  status ENUM('active', 'disabled', 'on_vacation', 'pending_approval') DEFAULT 'active',
  birth_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL, -- Para eliminación lógica
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
-- Table `user_roles` (Sin cambios para soft-delete, depende de users y roles)
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
  tax_id VARCHAR(50) NOT NULL, -- UNIQUE quitado temporalmente
  phone_number VARCHAR(50) NULL,
  trade_name VARCHAR(100) NULL,
  legal_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NULL, -- UNIQUE quitado temporalmente
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
  name VARCHAR(100) NOT NULL, -- UNIQUE quitado temporalmente
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
  serial_number VARCHAR(100) NULL, -- UNIQUE quitado temporalmente
  inventory_code VARCHAR(200) NOT NULL, -- UNIQUE quitado temporalmente
  description TEXT NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  warranty_expiry_date DATE NULL,
  current_section_id INT UNSIGNED NULL,
  current_location_id INT UNSIGNED NULL,
  supplier_company_id INT UNSIGNED NULL,
  purchase_date DATE NULL,
  invoice_number VARCHAR(50) NULL,
  acquisition_procedure VARCHAR(200) NULL,
  status ENUM('in_use', 'in_storage', 'under_repair', 'disposed', 'lost') DEFAULT 'in_storage',
  image_url VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL, -- Para eliminación lógica
  CONSTRAINT fk_assets_section FOREIGN KEY (current_section_id) REFERENCES sections (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_assets_location FOREIGN KEY (current_location_id) REFERENCES locations (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_assets_company FOREIGN KEY (supplier_company_id) REFERENCES companies (id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_assets_deleted_at (deleted_at),
  INDEX idx_assets_serial_number (serial_number),
  INDEX idx_assets_inventory_code (inventory_code)
);

-- -----------------------------------------------------
-- Table `asset_assignments`
-- -----------------------------------------------------
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
  deleted_at TIMESTAMP NULL DEFAULT NULL, -- Para eliminación lógica
  CONSTRAINT fk_asset_assignments_asset FOREIGN KEY (asset_id) REFERENCES assets (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_asset_assignments_user FOREIGN KEY (assigned_to_user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_asset_assignments_deleted_at (deleted_at)
);

-- -----------------------------------------------------
-- Table `asset_transfers` (Sin soft-delete, es un log)
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
  -- asset_id INT UNSIGNED NULL, -- ESTA LÍNEA SE ELIMINA
  software_name VARCHAR(255) NOT NULL,
  software_version VARCHAR(100) NULL,
  license_key VARCHAR(255) NULL,
  license_type ENUM(
    'oem', 'retail', 'volume_mak', 'volume_kms', 
    'subscription_user', 'subscription_device', 
    'concurrent', 'freeware', 'open_source', 'other'
  ) NOT NULL DEFAULT 'other',
  seats INT UNSIGNED NOT NULL DEFAULT 1, -- Total de puestos que cubre esta licencia
  purchase_date DATE NULL,
  purchase_cost DECIMAL(10,2) NULL,
  expiry_date DATE NULL,
  supplier_company_id INT UNSIGNED NULL,
  invoice_number VARCHAR(100) NULL,
  assigned_to_user_id INT UNSIGNED NULL, -- Usuario responsable/propietario de la licencia general
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
-- Table `asset_software_license_assignments` (Nueva Tabla de Unión)
-- Representa la asignación de una licencia de software a un activo específico.
-- -----------------------------------------------------
CREATE TABLE asset_software_license_assignments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, -- Clave primaria simple para la asignación
  asset_id INT UNSIGNED NOT NULL,
  software_license_id INT UNSIGNED NOT NULL,
  -- assigned_to_specific_user_id INT UNSIGNED NULL, -- Opcional: si quieres rastrear qué usuario usa ESTA instancia en ESTE activo
  installation_date DATE NULL, -- Fecha en que esta licencia se instaló/asignó a este activo
  notes TEXT NULL, -- Notas específicas para esta asignación activo-licencia
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- No es común el soft-delete en tablas de unión puras, se eliminan los registros.
  -- Pero si quieres rastrear el historial de asignaciones pasadas, no la borres o añade un `unassigned_date`.

  CONSTRAINT uq_asset_license_assignment UNIQUE (asset_id, software_license_id), -- Un activo solo puede tener una licencia específica asignada una vez

  CONSTRAINT fk_asla_asset
    FOREIGN KEY (asset_id)
    REFERENCES assets (id)
    ON DELETE CASCADE -- Si se elimina el activo, se elimina la asignación de la licencia
    ON UPDATE CASCADE,
  CONSTRAINT fk_asla_software_license
    FOREIGN KEY (software_license_id)
    REFERENCES software_licenses (id)
    ON DELETE CASCADE -- Si se elimina la licencia, se elimina la asignación
    ON UPDATE CASCADE,
  -- CONSTRAINT fk_asla_specific_user -- Si añades assigned_to_specific_user_id
  --   FOREIGN KEY (assigned_to_specific_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  
  INDEX idx_asla_asset_id (asset_id),
  INDEX idx_asla_software_license_id (software_license_id)
);


CREATE TABLE IF NOT EXISTS documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL UNIQUE, -- Nombre único en el almacenamiento (e.g., UUID + ext)
  mime_type VARCHAR(100) NOT NULL,
  file_size_bytes INT UNSIGNED NOT NULL,
  storage_path VARCHAR(255) NOT NULL, -- Ruta relativa DENTRO de 'private_uploads' (e.g., 'invoices', 'manuals')
  
  -- Para vincular el documento a otras entidades
  entity_type VARCHAR(50) NULL, -- Ej: 'asset', 'software_license', 'purchase_order', 'company'
  entity_id INT UNSIGNED NULL,  -- ID de la entidad a la que se asocia
  
  document_category VARCHAR(50) NULL, -- Ej: 'invoice_purchase', 'warranty_certificate', 'user_manual', 'contract'
  description TEXT NULL,          -- Descripción opcional del documento
  
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
-- Table `roles`
-- -----------------------------------------------------
INSERT INTO roles (name, description, created_at, updated_at) VALUES
('Admin', 'Administrador del Sistema con todos los permisos.', NOW(), NOW()),
('Manager', 'Gerente de Sección/Departamento.', NOW(), NOW()),
('User', 'Usuario Estándar del sistema.', NOW(), NOW()),
('Technician', 'Técnico de Soporte TI.', NOW(), NOW()),
('Auditor', 'Auditor con permisos de solo lectura para reportes.', NOW(), NOW());
-- IDs Asumidos: Admin (1), Manager (2), User (3), Technician (4), Auditor (5)

-- -----------------------------------------------------
-- Table `sections`
-- -----------------------------------------------------
INSERT INTO sections (name, management_level, email, parent_section_id, created_at, updated_at) VALUES
('Dirección General', 1, 'direccion@uam.com.uy', NULL, NOW(), NOW()),
('Gerencia General', 2, 'gerencia.general@uam.com.uy', 1, NOW(), NOW()),
('Departamento de TI', 2, 'ti@uam.com.uy', 1, NOW(), NOW()),
('Recursos Humanos', 2, 'rrhh@uam.com.uy', 1, NOW(), NOW()),
('Ventas y Marketing', 2, 'ventas@uam.com.uy', 1, NOW(), NOW());

INSERT INTO sections (name, management_level, email, parent_section_id, created_at, updated_at) VALUES
('Soporte Técnico (TI)', 3, 'soporte.ti@uam.com.uy', 3, NOW(), NOW()), -- Parent es Depto TI (ID 3)
('Desarrollo de Software (TI)', 3, 'desarrollo.ti@uam.com.uy', 3, NOW(), NOW()), -- Parent es Depto TI (ID 3)
('Operaciones (Ventas)', 3, 'operaciones.ventas@uam.com.uy', 5, NOW(), NOW()); -- Parent es Ventas (ID 5)

-- Una sección eliminada lógicamente
INSERT INTO sections (name, management_level, email, parent_section_id, created_at, updated_at, deleted_at) VALUES
('Antigua Sección Logística', 3, 'logistica.old@uam.com.uy', 1, '2023-01-01 10:00:00', '2023-06-15 12:00:00', '2023-06-15 12:00:00');
-- IDs Asumidos: Dirección General (1), Gerencia General (2), Depto TI (3), RRHH (4), Ventas (5),
-- Soporte Técnico (6), Desarrollo (7), Operaciones Ventas (8), Antigua Logística (9 - eliminada)

-- -----------------------------------------------------
-- Table `users`
-- -----------------------------------------------------
-- Nota: Los password_hash son placeholders. Usa bcrypt en la app real.
INSERT INTO users (email, password_hash, first_name, last_name, avatar_url, status, section_id, birth_date, email_verified_at, created_at, updated_at) VALUES
('admin@uam.com.uy', 'bcrypt_hashed_password_admin', 'Admin', 'Principal', 'https://i.pravatar.cc/150?u=admin', 'active', 2, '1980-01-01', NOW(), NOW(), NOW()), -- Section: Gerencia General (ID 2)
('manager@uam.com.uy', 'bcrypt_hashed_password_manager', 'Ana', 'Pérez', 'https://i.pravatar.cc/150?u=manager', 'active', 2, '1985-05-15', NOW(), NOW(), NOW()), -- Section: Gerencia General (ID 2)
('tech@uam.com.uy', 'bcrypt_hashed_password_tech', 'Carlos', 'Lopez', 'https://i.pravatar.cc/150?u=tech', 'active', 6, '1990-07-20', NOW(), NOW(), NOW()), -- Section: Soporte Técnico (ID 6)
('sales01@uam.com.uy', 'bcrypt_hashed_password_sales1', 'Laura', 'Gomez', 'https://i.pravatar.cc/150?u=sales01', 'active', 8, '1992-03-10', NOW(), NOW(), NOW()), -- Section: Operaciones Ventas (ID 8)
('hr01@uam.com.uy', 'bcrypt_hashed_password_hr1', 'Pedro', 'Rodriguez', 'https://i.pravatar.cc/150?u=hr01', 'active', 4, '1988-11-05', NOW(), NOW(), NOW()), -- Section: RRHH (ID 4)
('dev01@uam.com.uy', 'bcrypt_hashed_password_dev1', 'Sofia', 'Martinez', 'https://i.pravatar.cc/150?u=dev01', 'on_vacation', 7, '1995-09-25', NOW(), NOW(), NOW()); -- Section: Desarrollo (ID 7)

INSERT INTO users (email, password_hash, first_name, last_name, status, section_id, created_at, updated_at, deleted_at) VALUES
('olduser@uam.com.uy', 'bcrypt_hashed_password_old', 'Usuario', 'Antiguo', 'disabled', NULL, '2022-05-01 00:00:00', '2023-01-01 00:00:00', '2023-01-01 00:00:00'); -- Usuario eliminado
-- IDs Asumidos: admin (1), manager (2), tech (3), sales01 (4), hr01 (5), dev01 (6), olduser (7 - eliminado)


-- -----------------------------------------------------
-- Table `user_roles`
-- -----------------------------------------------------
INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES
(1, 1, NOW()), -- Admin User (ID 1) -> Rol Admin (ID 1)
(2, 2, NOW()), -- Manager User (ID 2) -> Rol Manager (ID 2)
(3, 4, NOW()), -- Tech User (ID 3) -> Rol Technician (ID 4)
(3, 3, NOW()), -- Tech User (ID 3) -> También Rol User (ID 3)
(4, 3, NOW()), -- Sales User 1 (ID 4) -> Rol User (ID 3)
(5, 3, NOW()), -- HR User (ID 5) -> Rol User (ID 3)
(5, 2, NOW()), -- HR User (ID 5) -> También Rol Manager (ID 2)
(6, 3, NOW()); -- Dev User (ID 6) -> Rol User (ID 3)

-- -----------------------------------------------------
-- Table `companies` (Proveedores)
-- -----------------------------------------------------
INSERT INTO companies (tax_id, legal_name, trade_name, phone_number, email, created_at, updated_at) VALUES
('210001110011', 'Tech Solutions Ltd.', 'TechSol', '29001234', 'contacto@techsol.com.uy', NOW(), NOW()),
('210002220012', 'Office Supplies Co.', 'OfficePro', '26005678', 'ventas@officepro.com.uy', NOW(), NOW()),
('210003330013', 'Secure Assets Inc.', 'SecureAssets', '24009012', 'info@secureassets.com.uy', NOW(), NOW()),
('210004440014', 'Hardware Pro Uruguay S.A.', 'HardPro', '099123456', 'soporte@hardpro.com.uy', NOW(), NOW());
-- IDs Asumidos: TechSol (1), OfficePro (2), SecureAssets (3), HardPro (4)

-- -----------------------------------------------------
-- Table `locations`
-- -----------------------------------------------------
INSERT INTO locations (name, description, section_id, created_at, updated_at) VALUES
('Oficina Central - Piso 1 (Dirección)', 'Área de Dirección y Gerencia', 2, NOW(), NOW()), -- Section: Gerencia General (ID 2)
('Oficina Central - Piso 2 (TI)', 'Departamento de Tecnologías de la Información', 3, NOW(), NOW()), -- Section: Depto TI (ID 3)
('Sucursal Norte - Almacén', 'Almacén principal de activos en Sucursal Norte', 8, NOW(), NOW()), -- Section: Operaciones Ventas (ID 8)
('Data Center Principal (TI)', 'Rack A01-A05, Sala de Servidores Principal', 3, NOW(), NOW()), -- Section: Depto TI (ID 3)
('Sala de Reuniones Alfa', 'Sala para reuniones generales', 2, NOW(), NOW()); -- Section: Gerencia General (ID 2)
-- IDs Asumidos: Piso 1 (1), Piso 2 TI (2), Almacén Norte (3), Data Center (4), Reuniones Alfa (5)

-- -----------------------------------------------------
-- Table `assets`
-- -----------------------------------------------------
INSERT INTO assets (inventory_code, product_name, description, serial_number, status, purchase_date, warranty_expiry_date, supplier_company_id, current_section_id, current_location_id, image_url, acquisition_procedure, invoice_number, created_at, updated_at) VALUES
('UAM-LT-001', 'Dell XPS 15 9520', 'Laptop para desarrollo y diseño', 'DELLXPS15-SN001', 'in_use', '2023-06-15', '2026-06-14', 1, 7, 2, '/uploads/assets/laptop_dell_xps15.jpg', 'Compra Directa', 'TS-INV-2023-070', NOW(), NOW()), -- Supplier: TechSol (ID 1), Section: Desarrollo (ID 7), Location: Piso 2 TI (ID 2)
('UAM-SRV-001', 'HPE ProLiant DL380 Gen10', 'Servidor para virtualización', 'HPESRV-SN001', 'in_use', '2023-03-20', '2026-03-19', 4, 3, 4, '/uploads/assets/server_hpe_dl380.jpg', 'Licitación Pública 01/23', 'HP-INV-2023-015', NOW(), NOW()), -- Supplier: HardPro (ID 4), Section: Depto TI (ID 3), Location: Data Center (ID 4)
('UAM-DSK-001', 'Workstation Custom Ryzen 9', 'PC alto rendimiento para Diseño Gráfico', 'CUSTOM-SN001', 'in_storage', '2024-01-10', '2027-01-09', 4, 7, 2, '/uploads/assets/workstation_custom.jpg', 'Armado por Partes', 'HP-INV-2024-002', NOW(), NOW()), -- Section: Desarrollo (ID 7), Location: Piso 2 TI (ID 2)
('UAM-PRN-001', 'HP LaserJet Pro M404dn', 'Impresora láser B/N para oficina', 'HPPRN-SN001', 'under_repair', '2022-08-01', '2023-07-31', 2, 4, 1, NULL, 'Compra Directa', 'OP-INV-2022-112', NOW(), NOW()), -- Section: RRHH (ID 4), Location: Piso 1 (ID 1)
('UAM-MON-001', 'Dell UltraSharp U2723QE', 'Monitor 4K 27 pulgadas', 'DELLMON-SN001', 'in_use', '2023-06-15', '2026-06-14', 1, 7, 2, NULL, 'Compra Directa', 'TS-INV-2023-070', NOW(), NOW()); -- Section: Desarrollo (ID 7), Location: Piso 2 TI (ID 2)

INSERT INTO assets (inventory_code, product_name, description, serial_number, status, purchase_date, warranty_expiry_date, supplier_company_id, current_section_id, current_location_id, created_at, updated_at, deleted_at) VALUES
('UAM-LT-002', 'Apple MacBook Pro 14 M1', 'Laptop para Gerencia (obsoleta)', 'MACBOOKPRO-SN001', 'disposed', '2021-05-01', '2023-04-30', 1, NULL, NULL, '2021-05-01', '2023-12-01', '2023-12-01'); -- Activo eliminado
-- IDs Asumidos: Laptop Dell (1), Server HPE (2), Workstation Custom (3), Printer HP (4), Monitor Dell (5), MacBook (6 - eliminado)

-- -----------------------------------------------------
-- Table `asset_assignments`
-- -----------------------------------------------------
INSERT INTO asset_assignments (asset_id, assigned_to_user_id, assignment_date, notes, created_at, updated_at) VALUES
(1, 6, '2023-07-01', 'Asignado a Sofia Martinez para desarrollo', NOW(), NOW()), -- Asset: Laptop Dell (ID 1), User: dev01 (ID 6)
(5, 6, '2023-07-01', 'Monitor asignado junto con laptop a Sofia Martinez', NOW(), NOW()); -- Asset: Monitor Dell (ID 5), User: dev01 (ID 6)

INSERT INTO asset_assignments (asset_id, assigned_to_user_id, assignment_date, return_date, notes, created_at, updated_at) VALUES
(4, 5, '2022-09-01', '2024-02-15', 'Impresora para Pedro Rodriguez, devuelta por falla.', NOW(), NOW()); -- Asset: Printer HP (ID 4), User: hr01 (ID 5)

-- -----------------------------------------------------
-- Table `asset_transfers`
-- -----------------------------------------------------
INSERT INTO asset_transfers (asset_id, transfer_date, from_section_id, from_location_id, to_section_id, to_location_id, to_user_id, transfer_reason, authorized_by_user_id) VALUES
(3, '2024-02-01 10:00:00', NULL, NULL, 7, 2, 6, 'Nuevo equipo para desarrollador', 2), -- Asset: Workstation (ID 3) a Section Desarrollo (ID 7), Location Piso 2 TI (ID 2), User dev01 (ID 6), Auth by manager (ID 2)
(1, '2024-03-15 14:30:00', 7, 2, 6, 2, 3, 'Reasignación temporal a Soporte Técnico', 2); -- Asset: Laptop Dell (ID 1) de Desarrollo (ID 7) a Soporte (ID 6), User tech (ID 3), Auth by manager (ID 2)

-- -----------------------------------------------------
-- Table `software_licenses` (Ya no tiene asset_id directo)
-- -----------------------------------------------------
INSERT INTO software_licenses (software_name, software_version, license_key, license_type, seats, purchase_date, purchase_cost, expiry_date, supplier_company_id, invoice_number, assigned_to_user_id, notes) VALUES
('Microsoft Office 365 E3', 'Cloud', 'SUB-M365-E3-ORG01', 'subscription_user', 100, '2024-01-01', 2000.00, '2024-12-31', 1, 'TS-M365-2024', 2, 'Suscripción anual para toda la organización.'), -- Supplier: TechSol (ID 1), Resp: manager (ID 2)
('Adobe Photoshop CC 2024', '2024', 'SUB-ADBPS-2024-DESIGN01', 'subscription_user', 5, '2024-02-15', 120.00, '2025-02-14', 2, 'OP-ADOBE-2024', 2, '5 licencias para equipo de diseño/marketing.'),
('Windows Server 2022 Datacenter', '2022', 'VOL-WINDC-2022-SERV001', 'volume_mak', 2, '2023-03-10', 2500.00, NULL, 4, 'HP-WSERV-2023', 3, 'Licencias para 2 servidores de virtualización.'),
('VMware vSphere Standard', '8.x', 'VMW-VSPH-STD-CLUSTER01', 'subscription_device', 10, '2023-04-01', 3000.00, '2026-03-31', 3, 'SA-VMW-2023', 3, 'Licencia por 3 años para cluster de virtualización (10 sockets CPU).');
-- IDs Asumidos: Office365 (1), Photoshop (2), WinServer DC (3), VMware (4)

-- -----------------------------------------------------
-- Table `asset_software_license_assignments` (Nueva Tabla de Unión)
-- -----------------------------------------------------
-- Asignar Office 365 (Licencia ID 1) a varios activos:
INSERT INTO asset_software_license_assignments (asset_id, software_license_id, installation_date, notes) VALUES
(1, 1, '2024-01-05', 'Instalado en Dell XPS 15'), -- Asset ID 1 (Laptop Dell)
(3, 1, '2024-01-15', 'Instalado en Workstation Custom'); -- Asset ID 3 (Workstation)

-- Asignar Photoshop (Licencia ID 2) a un activo:
INSERT INTO asset_software_license_assignments (asset_id, software_license_id, installation_date) VALUES
(3, 2, '2024-02-20'); -- Asset ID 3 (Workstation)

-- Asignar Windows Server Datacenter (Licencia ID 3) a un servidor:
INSERT INTO asset_software_license_assignments (asset_id, software_license_id, installation_date, notes) VALUES
(2, 3, '2023-03-15', 'Licencia de Sistema Operativo para HPE Server'); -- Asset ID 2 (Server HPE)

-- Asignar VMware (Licencia ID 4) al mismo servidor:
INSERT INTO asset_software_license_assignments (asset_id, software_license_id, installation_date) VALUES
(2, 4, '2023-04-05'); -- Asset ID 2 (Server HPE)

-- El Laptop Dell (Asset ID 1) tiene ahora Office 365.
-- El Workstation Custom (Asset ID 3) tiene Office 365 y Photoshop.
-- El Server HPE (Asset ID 2) tiene Windows Server DC y VMware.



INSERT INTO users (email, password_hash, first_name, last_name, national_id, status, created_at, updated_at)
VALUES (
    'lucascoda3@gmail.com',
    '$2b$10$ZculHGz6OiF8gksP0eUvFeZeJ1VUGHD/ZuLzzS068fKHjMTLTAOha', -- Pega aquí el hash del script
    'Test',
    'UserOne',
    'TEST001X',
    'active',
    NOW(),
    NOW()
);