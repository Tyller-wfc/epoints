const mysql = require('mysql2/promise');
const getDatabaseConfig = require('./db-config.cjs');

async function migrate() {
  const connection = await mysql.createConnection({ ...getDatabaseConfig(), charset: 'utf8mb4' });
  console.log('Connected to MySQL database.');

  try {
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'transactions' 
        AND COLUMN_NAME = 'remark'
    `);

    if (columns.length === 0) {
      console.log('Adding remark column to transactions table...');
      await connection.query(`
        ALTER TABLE transactions 
        ADD COLUMN remark VARCHAR(255) NULL 
        COMMENT '报销类目或兑换凭证备注'
      `);
      console.log('Column remark added successfully.');
    } else {
      console.log('Column remark already exists in transactions table.');
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
