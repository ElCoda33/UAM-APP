
import { getPool } from '../lib/db';

async function migrate() {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    console.log('Adding uplink_asset_id column...');
    await connection.query(`
      ALTER TABLE assets
      ADD COLUMN uplink_asset_id INT NULL DEFAULT NULL AFTER ip_address,
      ADD CONSTRAINT fk_assets_uplink FOREIGN KEY (uplink_asset_id) REFERENCES assets(id) ON DELETE SET NULL;
    `);
    console.log('Column added successfully.');
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists.');
    } else {
      console.error('Error adding column:', error);
    }
  } finally {
    connection.release();
    process.exit(0);
  }
}

migrate();
