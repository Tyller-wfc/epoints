require('dotenv').config();
const mysql = require('mysql2/promise');
const getDatabaseConfig = require('./db-config.cjs');

async function addColumn(connection, table, column, sql) {
  const [rows] = await connection.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  if (!rows.length) {
    await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN ${sql}`);
    console.log(`Column ${column} added to ${table} table`);
  } else {
    console.log(`Column ${column} already exists in ${table} table`);
  }
}

async function migrate() {
  const db = await mysql.createConnection(getDatabaseConfig());
  await addColumn(db, 'duty', 'duty_date', '`duty_date` varchar(10) NULL DEFAULT NULL AFTER `user_id`');
  await db.end();
  console.log('Duty date migration completed');
}

migrate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
