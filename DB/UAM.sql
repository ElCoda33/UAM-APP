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


INSERT INTO roles (name, description) VALUES
('Admin', 'Administrator with full system access');

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

INSERT INTO users (email, password_hash, first_name, last_name, national_id, status, created_at, updated_at)
VALUES ("nicolas.colman@fcea.edu.uy","$10$Vi3kBX7JFXPOPHl1V3p1qeJnHTVYLSXwtY5nBAq/v2CXs/Kx4C4R2","Nicolas","Colman","49108215","active",NOW(),NOW());


select * from users;