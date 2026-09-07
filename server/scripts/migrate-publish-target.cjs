const mysql = require('mysql2/promise');
const getDatabaseConfig = require('./db-config.cjs');

async function migrate() {
  const connection = await mysql.createConnection(getDatabaseConfig());
  console.log('Connected to MySQL database.');

  try {
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'missions' 
        AND COLUMN_NAME = 'publish_target'
    `);

    if (columns.length === 0) {
      console.log('Adding publish_target column to missions table...');
      await connection.query(`
        ALTER TABLE missions 
        ADD COLUMN publish_target VARCHAR(20) NOT NULL DEFAULT 'platform' 
        COMMENT '发布目标: platform (平台全员) / self (管理员自承接，仅管理与观察者可见)'
      `);
      console.log('Column publish_target added successfully.');
    } else {
      console.log('Column publish_target already exists in missions table.');
    }

    const [roles] = await connection.query(`
      SELECT id FROM roles WHERE id = 'r-observer' OR code = 'observer'
    `);

    if (roles.length === 0) {
      console.log('Inserting observer role into roles table...');
      await connection.query(`
        INSERT INTO roles (id, code, name, description, enabled) 
        VALUES ('r-observer', 'observer', '观察者', '系统观察与监督角色，可查看全局业务无操作权限', 1)
      `);
      console.log('Role r-observer inserted successfully.');
    } else {
      console.log('Observer role already exists.');
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
