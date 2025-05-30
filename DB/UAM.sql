-- Ensures a clean slate if re-running the script
DROP DATABASE IF EXISTS UAM_App_DB;
CREATE DATABASE UAM_App_DB;
USE UAM_App_DB;

-- -----------------------------------------------------
-- Table `sections`
-- Stores organizational sections or departments.
-- -----------------------------------------------------
CREATE TABLE sections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  management_level INT, -- Consider a more descriptive name or a separate lookup table if levels are predefined
  email VARCHAR(100) UNIQUE,
  parent_section_id INT UNSIGNED NULL, -- For hierarchical dependencies
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sections_parent_section
    FOREIGN KEY (parent_section_id)
    REFERENCES sections (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

-- -----------------------------------------------------
-- Table `roles`
-- Defines user roles within the application.
-- -----------------------------------------------------
CREATE TABLE roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'admin', 'manager', 'employee'
  description VARCHAR(255)
);

-- -----------------------------------------------------
-- Table `users`
-- Stores user account information.
-- -----------------------------------------------------
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NULL, -- Nullable if using OAuth-only users
  first_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NULL,
  avatar_url VARCHAR(255) NULL,
  email_verified_at DATETIME NULL,
  national_id VARCHAR(50) UNIQUE NULL, -- 'ci' translated
  section_id INT UNSIGNED NULL, -- Foreign key to sections table
  status ENUM('active', 'disabled', 'on_vacation', 'pending_approval') DEFAULT 'active',
  birth_date DATE NULL,
  -- 'age' is generally better calculated on the fly rather than stored.
  -- If you need to store it, the trigger would need to be re-evaluated.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_section
    FOREIGN KEY (section_id)
    REFERENCES sections (id)
    ON DELETE SET NULL -- Or RESTRICT, depending on business rules
    ON UPDATE CASCADE
);

-- -----------------------------------------------------
-- Table `user_roles` (Junction table for many-to-many User-Role relationship)
-- Assigns roles to users. A user can have multiple roles.
-- -----------------------------------------------------
CREATE TABLE user_roles (
  user_id INT UNSIGNED NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE -- If user is deleted, their role assignments are removed
    ON UPDATE CASCADE,
  CONSTRAINT fk_user_roles_role
    FOREIGN KEY (role_id)
    REFERENCES roles (id)
    ON DELETE CASCADE -- If a role is deleted, remove assignments (or RESTRICT)
    ON UPDATE CASCADE
);

-- -----------------------------------------------------
-- Table `companies`
-- Stores information about external companies/vendors.
-- -----------------------------------------------------
CREATE TABLE companies (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tax_id VARCHAR(50) UNIQUE NOT NULL, -- 'rut' translated
  phone_number VARCHAR(50) NULL,
  trade_name VARCHAR(100) NULL, -- 'nombre_fantasia'
  legal_name VARCHAR(100) NOT NULL, -- 'razon_social'
  email VARCHAR(100) UNIQUE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Table `locations`
-- Defines physical or logical locations where assets can be.
-- -----------------------------------------------------
CREATE TABLE locations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  section_id INT UNSIGNED NULL, -- Section responsible for or containing this location
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_locations_section
    FOREIGN KEY (section_id)
    REFERENCES sections (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

-- -----------------------------------------------------
-- Table `assets`
-- Stores information about tangible or intangible assets.
-- -----------------------------------------------------
CREATE TABLE assets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  serial_number VARCHAR(100) UNIQUE NULL, -- Can be null if not applicable, but if exists, should be unique
  inventory_code VARCHAR(200) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  warranty_expiry_date DATE NULL,
  current_section_id INT UNSIGNED NULL, -- Section currently possessing or responsible for the asset
  current_location_id INT UNSIGNED NULL, -- Physical location of the asset
  supplier_company_id INT UNSIGNED NULL, -- 'rut_empresa' linked to companies.id
  purchase_date DATE NULL, -- 'fecha_venta' implies purchase for the organization
  invoice_number VARCHAR(50) NULL,
  acquisition_procedure VARCHAR(200) NULL,
  status ENUM('in_use', 'in_storage', 'under_repair', 'disposed', 'lost') DEFAULT 'in_storage',
  image_url VARCHAR(255) NULL, -- 'avatar' for asset
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_assets_section
    FOREIGN KEY (current_section_id)
    REFERENCES sections (id)
    ON DELETE SET NULL -- Or RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_assets_location
    FOREIGN KEY (current_location_id)
    REFERENCES locations (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_assets_company
    FOREIGN KEY (supplier_company_id)
    REFERENCES companies (id)
    ON DELETE SET NULL -- Or RESTRICT
    ON UPDATE CASCADE
);

-- -----------------------------------------------------
-- Table `asset_assignments` (replaces `mueve` for clarity, assuming it's about user responsibility)
-- Log of which user is currently assigned or responsible for an asset.
-- This might be simplified if an asset is only tied to a section/location rather than a specific user.
-- If it's purely a movement log, the `asset_transfers` table might be sufficient.
-- Assuming `mueve` was about user assignment/responsibility:
-- -----------------------------------------------------
CREATE TABLE asset_assignments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id INT UNSIGNED NOT NULL,
  assigned_to_user_id INT UNSIGNED NOT NULL,
  assignment_date DATE NOT NULL,
  return_date DATE NULL, -- Optional: if assignments are temporary
  notes TEXT NULL,
  signature_image_url VARCHAR(255) NULL, -- 'firma'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_asset_assignments_asset
    FOREIGN KEY (asset_id)
    REFERENCES assets (id)
    ON DELETE RESTRICT -- Or CASCADE, depending on rules
    ON UPDATE CASCADE,
  CONSTRAINT fk_asset_assignments_user
    FOREIGN KEY (assigned_to_user_id)
    REFERENCES users (id)
    ON DELETE RESTRICT -- User deletion might require asset reassignment
    ON UPDATE CASCADE
);

-- -----------------------------------------------------
-- Table `asset_transfers` (replaces `movimientos`)
-- Log of asset movements between locations, sections, or users.
-- -----------------------------------------------------
CREATE TABLE asset_transfers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id INT UNSIGNED NOT NULL,
  transfer_date DATETIME NOT NULL,
  
  from_section_id INT UNSIGNED NULL,
  from_location_id INT UNSIGNED NULL,
  from_user_id INT UNSIGNED NULL, -- User who had it before transfer

  to_section_id INT UNSIGNED NULL,
  to_location_id INT UNSIGNED NULL,
  to_user_id INT UNSIGNED NULL, -- User receiving/responsible after transfer

  transfer_reason TEXT NULL,
  authorized_by_user_id INT UNSIGNED NULL, -- User who authorized the transfer
  received_by_user_id INT UNSIGNED NULL, -- User who physically received (if different from to_user_id)
  received_date DATETIME NULL,
  
  -- `lugar_destino`, `sector`, `dependencia`, `tipo_ubicacion` from original `movimientos`
  -- seem to be covered by `to_location_id` and `to_section_id` and their properties.
  -- `persona_recibe` covered by `received_by_user_id`.
  
  signature_image_url VARCHAR(255) NULL, -- 'firma_movimiento'
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_asset_transfers_asset
    FOREIGN KEY (asset_id)
    REFERENCES assets (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_asset_transfers_from_section
    FOREIGN KEY (from_section_id)
    REFERENCES sections (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_asset_transfers_from_location
    FOREIGN KEY (from_location_id)
    REFERENCES locations (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_asset_transfers_from_user
    FOREIGN KEY (from_user_id)
    REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_asset_transfers_to_section
    FOREIGN KEY (to_section_id)
    REFERENCES sections (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_asset_transfers_to_location
    FOREIGN KEY (to_location_id)
    REFERENCES locations (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_asset_transfers_to_user
    FOREIGN KEY (to_user_id)
    REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_asset_transfers_authorized_by
    FOREIGN KEY (authorized_by_user_id)
    REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_asset_transfers_received_by
    FOREIGN KEY (received_by_user_id)
    REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE
);
USE UAM_App_DB;

-- -----------------------------------------------------
-- Datos para `sections`
-- -----------------------------------------------------
INSERT INTO sections (name, management_level, email, parent_section_id, created_at, updated_at) VALUES
('IT Department', 1, 'it@example.com', NULL, '2024-01-10 08:00:00', '2024-01-10 08:00:00'),
('Human Resources', 1, 'hr@example.com', NULL, '2024-01-11 09:00:00', '2024-01-11 09:00:00'),
('Software Development', 2, 'dev@example.com', 1, '2024-01-15 10:00:00', '2024-01-15 10:00:00'), -- Asume que 'IT Department' tiene id=1
('Recruitment', 2, 'recruitment@example.com', 2, '2024-01-16 11:00:00', '2024-01-16 11:00:00'); -- Asume que 'Human Resources' tiene id=2

-- -----------------------------------------------------
-- Datos para `roles`
-- -----------------------------------------------------
INSERT INTO roles (name, description) VALUES
('Admin', 'Administrator with full system access'),
('Manager', 'Managerial role with oversight capabilities'),
('Employee', 'Standard employee access'),
('Technician', 'Technical staff for asset management');

-- -----------------------------------------------------
-- Datos para `companies`
-- -----------------------------------------------------
INSERT INTO companies (tax_id, phone_number, trade_name, legal_name, email, created_at, updated_at) VALUES
('B01234567', '+1-555-0101', 'Tech Solutions Ltd.', 'Tech Solutions Limited liability Company', 'sales@techsolutions.com', '2023-05-15 14:00:00', '2023-05-15 14:00:00'),
('A08901234', '+1-555-0202', 'Office Supplies Co.', 'Office Supplies Corporation', 'contact@officesupplies.co', '2023-06-20 10:30:00', '2023-06-20 10:30:00'),
('C12345678', '+1-555-0303', 'Secure Assets Inc.', 'Secure Assets Incorporated', 'info@secureassets.inc', '2024-02-01 11:00:00', '2024-02-01 11:00:00');

-- -----------------------------------------------------
-- Datos para `locations`
-- -----------------------------------------------------
INSERT INTO locations (name, description, section_id, created_at, updated_at) VALUES
('Main Office - Building A', 'Primary office building, floor 1', 1, '2024-01-20 12:00:00', '2024-01-20 12:00:00'), -- IT Department
('Warehouse West', 'Storage facility, west wing', NULL, '2024-01-21 13:00:00', '2024-01-21 13:00:00'),
('Data Center Room 101', 'Secure server room', 1, '2024-02-01 15:00:00', '2024-02-01 15:00:00'), -- IT Department
('HR Office Suite', 'Human Resources office area', 2, '2024-02-05 09:30:00', '2024-02-05 09:30:00'); -- Human Resources

-- -----------------------------------------------------
-- Datos para `users`
-- Nota: password_hash debe ser un hash bcrypt real. El valor aquí es un placeholder.
-- '$2b$10$abcdefghijklmnopqrstuv' es un ejemplo de la estructura, pero no es un hash válido.
-- Para pruebas reales, genera hashes con bcrypt para contraseñas como "password123".
-- -----------------------------------------------------
INSERT INTO users (email, password_hash, first_name, last_name, avatar_url, email_verified_at, national_id, section_id, status, birth_date, created_at, updated_at) VALUES
('admin@example.com', '$2b$10$K1G.O0o0i9J3e.fP8qH3qOJVDEuTORO8uT7gK.SgPUx2n9YJz55.q', 'Admin', 'User', 'https://i.pravatar.cc/150?u=admin@example.com', '2024-01-01 10:00:00', '1234567A', 1, 'active', '1980-05-15', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
('manager@example.com', '$2b$10$K1G.O0o0i9J3e.fP8qH3qOJVDEuTORO8uT7gK.SgPUx2n9YJz55.q', 'Manager', 'Person', 'https://i.pravatar.cc/150?u=manager@example.com', '2024-01-02 11:00:00', '8901234B', 2, 'active', '1985-08-20', '2024-01-02 11:00:00', '2024-01-02 11:00:00'),
('employee1@example.com', '$2b$10$K1G.O0o0i9J3e.fP8qH3qOJVDEuTORO8uT7gK.SgPUx2n9YJz55.q', 'Regular', 'Employee', NULL, '2024-01-03 12:00:00', '5678901C', 3, 'active', '1990-11-25', '2024-01-03 12:00:00', '2024-01-03 12:00:00'),
('tech@example.com', '$2b$10$K1G.O0o0i9J3e.fP8qH3qOJVDEuTORO8uT7gK.SgPUx2n9YJz55.q', 'Tech', 'Support', 'https://i.pravatar.cc/150?u=tech@example.com', '2024-01-04 13:00:00', '2345678D', 1, 'on_vacation', '1992-03-10', '2024-01-04 13:00:00', '2024-03-01 13:00:00'),
('disabled@example.com', '$2b$10$K1G.O0o0i9J3e.fP8qH3qOJVDEuTORO8uT7gK.SgPUx2n9YJz55.q', 'Former', 'User', NULL, NULL, '9012345E', 2, 'disabled', '1988-07-07', '2024-01-05 14:00:00', '2024-04-01 14:00:00');

-- -----------------------------------------------------
-- Datos para `user_roles`
-- Asume que los IDs de users son 1 (admin), 2 (manager), 3 (employee1), 4 (tech), 5 (disabled)
-- Asume que los IDs de roles son 1 (Admin), 2 (Manager), 3 (Employee), 4 (Technician)
-- -----------------------------------------------------
INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES
(1, 1, NOW()), -- admin@example.com es Admin
(1, 3, NOW()), -- admin@example.com también es Employee (ejemplo de rol múltiple)
(2, 2, NOW()), -- manager@example.com es Manager
(2, 3, NOW()), -- manager@example.com también es Employee
(3, 3, NOW()), -- employee1@example.com es Employee
(4, 4, NOW()), -- tech@example.com es Technician
(4, 3, NOW()); -- tech@example.com también es Employee

-- -----------------------------------------------------
-- Datos para `assets`
-- Asume IDs: sections(1:IT, 2:HR, 3:Dev), locations(1:MainOffice, 2:Warehouse, 3:DataCenter), companies(1:TechSol, 2:OfficeSup, 3:SecureAssets)
-- -----------------------------------------------------
INSERT INTO assets (serial_number, inventory_code, description, product_name, warranty_expiry_date, current_section_id, current_location_id, supplier_company_id, purchase_date, invoice_number, acquisition_procedure, status, image_url, created_at, updated_at) VALUES
('SN001LAPTOP', 'INV-LP-001', 'Developer Laptop 15 inch, 16GB RAM, 512GB SSD', 'Dell XPS 15', '2026-06-15', 3, 1, 1, '2024-06-15', 'INV2024-001', 'Direct Purchase', 'in_use', 'https://example.com/images/laptop.png', '2024-06-15 10:00:00', '2024-06-15 10:00:00'),
('SN002SERVER', 'INV-SRV-001', 'Application Server, 2x Xeon, 128GB RAM', 'HPE ProLiant DL380', '2027-07-20', 1, 3, 1, '2024-07-20', 'INV2024-002', 'Leasing', 'in_use', 'https://example.com/images/server.png', '2024-07-20 11:00:00', '2024-07-20 11:00:00'),
('SN003MONITOR', 'INV-MON-001', '27 inch 4K Monitor for Design', 'Dell UltraSharp U2723QE', '2026-08-01', 3, 1, 2, '2024-08-01', 'INV2024-003', 'Bulk Order', 'in_storage', NULL, '2024-08-01 12:00:00', '2024-08-01 12:00:00'),
('SN004PRINTER', 'INV-PRN-001', 'Office Multifunction Printer', 'HP LaserJet Pro MFP', '2025-09-10', 2, 4, 2, '2023-09-10', 'INV2023-105', 'Direct Purchase', 'under_repair', NULL, '2023-09-10 14:00:00', '2024-05-10 14:00:00'),
(NULL, 'INV-SOFT-001', 'Project Management Software License - 10 Users', 'Jira Standard', NULL, 1, NULL, 3, '2024-01-01', 'INV2024-S001', 'Subscription', 'in_use', NULL, '2024-01-01 09:00:00', '2024-01-01 09:00:00');

-- -----------------------------------------------------
-- Datos para `asset_assignments`
-- Asume IDs: assets(1:Laptop, 2:Server, 3:Monitor), users(1:Admin, 3:Employee1, 4:Tech)
-- -----------------------------------------------------
INSERT INTO asset_assignments (asset_id, assigned_to_user_id, assignment_date, return_date, notes, signature_image_url, created_at, updated_at) VALUES
(1, 3, '2024-06-20', NULL, 'Assigned for development tasks', 'https://example.com/signatures/sig001.png', '2024-06-20 09:00:00', '2024-06-20 09:00:00'), -- Laptop a Employee1
(2, 4, '2024-07-25', NULL, 'Server under maintenance by tech', NULL, '2024-07-25 10:00:00', '2024-07-25 10:00:00'), -- Server a Tech
(3, 1, '2024-08-05', '2024-08-10', 'Monitor for temporary use by admin', 'https://example.com/signatures/sig002.png', '2024-08-05 11:00:00', '2024-08-10 11:00:00'); -- Monitor a Admin (devuelto)

-- -----------------------------------------------------
-- Datos para `asset_transfers`
-- Asume IDs: assets(1:Laptop, 2:Server), sections(1:IT, 3:Dev), locations(1:MainOffice, 3:DataCenter), users(1:Admin, 2:Manager, 4:Tech)
-- -----------------------------------------------------
INSERT INTO asset_transfers (asset_id, transfer_date, from_section_id, from_location_id, from_user_id, to_section_id, to_location_id, to_user_id, transfer_reason, authorized_by_user_id, received_by_user_id, received_date, signature_image_url, notes, created_at) VALUES
(1, '2024-09-01 10:00:00', 3, 1, 3, 1, 1, 4, 'Laptop required for IT support tasks', 2, 4, '2024-09-01 10:05:00', 'https://example.com/signatures/transfer001.png', 'Temporary assignment to IT', NOW()), -- Laptop de Dev (Employee1) a IT (Tech) en MainOffice
(2, '2024-09-05 14:30:00', 1, 3, 4, 1, 3, NULL, 'Server maintenance complete, returned to general pool in Data Center', 1, NULL, '2024-09-05 14:35:00', 'https://example.com/signatures/transfer002.png', 'Server operational', NOW()), -- Server de Tech a pool general en DataCenter (sin usuario específico asignado)
(3, '2024-10-10 11:00:00', NULL, 2, NULL, 3, 1, 3, 'New monitor from warehouse assigned to developer', 2, 3, '2024-10-10 11:05:00', NULL, 'First assignment', NOW()); -- Monitor desde Warehouse a Dev (Employee1) en MainOffice




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


select * from users;