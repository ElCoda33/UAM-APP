-- -----------------------------------------------------
-- UAM Database Extension Script
-- Adds support for Advanced Configuration, RBAC, Custom Fields, and Workflows
-- Maintains backward compatibility with original UAM.sql
-- -----------------------------------------------------

USE UAM_App_DB;

-- -----------------------------------------------------
-- 1. System Settings (Key-Value Store for Configuration)
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- 2. Advanced RBAC (Permissions)
-- -----------------------------------------------------
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
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- -----------------------------------------------------
-- 3. Custom Fields for Assets
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- 4. Workflows & Approvals
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- 5. Performance Optimizations (Indexes)
-- -----------------------------------------------------

-- Assets: Optimize search by name and date ranges
CREATE INDEX idx_assets_product_name ON assets(product_name);
CREATE INDEX idx_assets_purchase_date ON assets(purchase_date);
CREATE INDEX idx_assets_status_location ON assets(status, current_location_id);

-- Users: Optimize login and filtering
CREATE INDEX idx_users_status_email ON users(status, email);
CREATE INDEX idx_users_section_id ON users(section_id);

-- Audit Logs: Optimize history queries
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Notifications: Optimize unread count
CREATE INDEX idx_notifications_unread_user ON notifications(user_id, is_read);

-- -----------------------------------------------------
-- 6. Mobile App Support
-- -----------------------------------------------------
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
-- 7. IT Asset Extensions (Network Diagram Support)
-- -----------------------------------------------------
-- Add columns for IT specific details
ALTER TABLE assets
ADD COLUMN asset_type ENUM('general', 'informatica', 'mobiliario', 'vehiculo', 'otro') DEFAULT 'general' AFTER product_name,
ADD COLUMN it_device_type ENUM('pc', 'notebook', 'server', 'switch', 'router', 'printer', 'access_point', 'other') NULL AFTER asset_type,
ADD COLUMN ip_address VARCHAR(45) NULL AFTER it_device_type;

-- Add index for IP address to speed up network searches
CREATE INDEX idx_assets_ip_address ON assets(ip_address);

