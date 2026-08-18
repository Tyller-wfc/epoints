const mysql = require('mysql2/promise');
const getDatabaseConfig = require('./db-config.cjs');

async function cleanTestData() {
  const conn = await mysql.createConnection({ ...getDatabaseConfig(), charset: 'utf8mb4' });
  await conn.query("DELETE FROM missions WHERE id NOT IN ('m-1','m-2','m-3','m-4','m-5')");
  await conn.query("DELETE FROM rewards WHERE id NOT IN ('r-1','r-2','r-3','r-4','r-5','r-6','r-7','r-8','r-9','r-10')");
  await conn.query("DELETE FROM tickets WHERE id NOT IN ('t-1')");
  await conn.query("DELETE FROM feed WHERE id NOT IN ('f-1','f-2','f-3')");
  await conn.query("DELETE FROM transactions");
  
  // Clean customer service tables and point ledgers
  await conn.query("DELETE FROM service_evaluations");
  await conn.query("DELETE FROM service_feedback");
  await conn.query("DELETE FROM service_participants");
  await conn.query("DELETE FROM service_mission_links");
  await conn.query("DELETE FROM service_records");
  await conn.query("DELETE FROM external_customers");
  await conn.query("DELETE FROM point_ledger");

  console.log('Cleaned test data successfully.');
  await conn.end();
}

cleanTestData().catch(console.error);
