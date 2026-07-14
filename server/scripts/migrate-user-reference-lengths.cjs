const mysql = require('mysql2/promise');
const getDatabaseConfig = require('./db-config.cjs');

const columns = [
  ['users', 'id'],
  ['missions', 'assigned_to'],
  ['transactions', 'user_id'],
  ['duty', 'user_id'],
  ['tickets', 'reporter_id'],
  ['tickets', 'assigned_to'],
  ['attachments', 'uploaded_by'],
  ['auth_credentials', 'user_id'],
  ['user_roles', 'user_id'],
  ['mission_notification_recipients', 'user_id'],
];

async function migrate() {
  const connection = await mysql.createConnection(getDatabaseConfig());

  try {
    for (const [table, column] of columns) {
      const [rows] = await connection.query(
        `SELECT COLUMN_TYPE, IS_NULLABLE
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column],
      );
      if (!rows.length || rows[0].COLUMN_TYPE.toLowerCase() === 'varchar(255)') continue;

      const nullable = rows[0].IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      await connection.query(`ALTER TABLE \`${table}\` MODIFY \`${column}\` varchar(255) ${nullable}`);
      console.log(`Expanded ${table}.${column} to varchar(255)`);
    }
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
