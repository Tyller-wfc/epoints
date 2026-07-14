require('dotenv').config();
const mysql = require('mysql2/promise');
const getDatabaseConfig = require('./db-config.cjs');

async function addColumn(connection, column, sql) {
  const [rows] = await connection.query('SHOW COLUMNS FROM users LIKE ?', [column]);
  if (!rows.length) await connection.query(`ALTER TABLE users ADD COLUMN ${sql}`);
}

async function migrate() {
  const db = await mysql.createConnection(getDatabaseConfig());
  await addColumn(db, 'avatar_object_key', '`avatar_object_key` varchar(700) NULL');
  await addColumn(db, 'avatar_mime_type', '`avatar_mime_type` varchar(100) NULL');
  await db.end();
  console.log('personnel avatar migration completed');
}

migrate().catch((error) => { console.error(error); process.exitCode = 1; });
