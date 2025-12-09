
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function migrate() {
  try {
    // Read .env
    const envPath = path.resolve(__dirname, '../.env');
    let envConfig = {};
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const val = parts.slice(1).join('=').trim();
          envConfig[key] = val;
        }
      });
    }

    const config = {
      host: envConfig.DB_HOST || 'localhost',
      user: envConfig.DB_USER,
      password: envConfig.DB_PASSWORD,
      database: envConfig.DB_NAME,
      port: Number(envConfig.DB_PORT) || 3306
    };

    console.log('Connecting to DB...', { ...config, password: '***' });
    const connection = await mysql.createConnection(config);

    console.log('Checking assets table...');
    const [rows] = await connection.query("SHOW TABLES LIKE 'assets'");

    if (rows.length === 0) {
      console.log('Assets table missing. Creating it...');
      await connection.query(`
            CREATE TABLE assets (
              id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              serial_number VARCHAR(100) NULL,
              inventory_code VARCHAR(200) NULL,
              description TEXT NULL,
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
              asset_type ENUM('general', 'informatica', 'mobiliario', 'vehiculo', 'otro') DEFAULT 'general',
              it_device_type ENUM('pc', 'notebook', 'server', 'switch', 'router', 'printer', 'access_point', 'other') DEFAULT NULL,
              ip_address VARCHAR(45) DEFAULT NULL,
              uplink_asset_id INT UNSIGNED NULL DEFAULT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              deleted_at TIMESTAMP NULL DEFAULT NULL,
              CONSTRAINT fk_assets_section FOREIGN KEY (current_section_id) REFERENCES sections (id) ON DELETE SET NULL ON UPDATE CASCADE,
              CONSTRAINT fk_assets_location FOREIGN KEY (current_location_id) REFERENCES locations (id) ON DELETE SET NULL ON UPDATE CASCADE,
              CONSTRAINT fk_assets_company FOREIGN KEY (supplier_company_id) REFERENCES companies (id) ON DELETE SET NULL ON UPDATE CASCADE,
              CONSTRAINT fk_assets_uplink FOREIGN KEY (uplink_asset_id) REFERENCES assets(id) ON DELETE SET NULL,
              INDEX idx_assets_deleted_at (deleted_at),
              INDEX idx_assets_serial_number (serial_number),
              INDEX idx_assets_inventory_code (inventory_code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
        `);
      console.log('Assets table created successfully.');
    } else {
      console.log('Assets table exists. Adding column...');
      try {
        await connection.query(`
              ALTER TABLE assets
              ADD COLUMN uplink_asset_id INT UNSIGNED NULL DEFAULT NULL AFTER ip_address,
              ADD CONSTRAINT fk_assets_uplink FOREIGN KEY (uplink_asset_id) REFERENCES assets(id) ON DELETE SET NULL;
            `);
        console.log('Column added successfully.');
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('Column already exists.');
        } else {
          throw err;
        }
      }
    }

    await connection.end();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
