require('dotenv').config();
const mysql = require('mysql2/promise');
const getDatabaseConfig = require('./db-config.cjs');

async function migrate() {
  const connection = await mysql.createConnection(getDatabaseConfig());

  // Check if u-1 exists in users table
  const [users] = await connection.query("SELECT 1 FROM users WHERE id = 'u-1'");
  if (users.length === 0) {
    console.log("No user with ID 'u-1' found. Database migration skipped or already completed.");
    await connection.end();
    return;
  }

  console.log("Migrating admin user ID from 'u-1' to 'u-2' in production database...");

  const queries = [
    "SET FOREIGN_KEY_CHECKS = 0",
    "UPDATE users SET id = 'u-2' WHERE id = 'u-1'",
    "UPDATE auth_credentials SET user_id = 'u-2' WHERE user_id = 'u-1'",
    "UPDATE user_roles SET user_id = 'u-2', id = REPLACE(id, 'u-1', 'u-2') WHERE user_id = 'u-1'",
    "UPDATE duty SET user_id = 'u-2' WHERE user_id = 'u-1'",
    "UPDATE missions SET assigned_to = 'u-2' WHERE assigned_to = 'u-1'",
    "UPDATE tickets SET reporter_id = 'u-2' WHERE reporter_id = 'u-1'",
    "UPDATE tickets SET assigned_to = 'u-2' WHERE assigned_to = 'u-1'",
    "UPDATE transactions SET user_id = 'u-2' WHERE user_id = 'u-1'",
    "UPDATE point_ledger SET user_id = 'u-2' WHERE user_id = 'u-1'",
    "UPDATE point_ledger SET operator_id = 'u-2' WHERE operator_id = 'u-1'",
    "UPDATE point_ledger SET target_id = 'u-2' WHERE target_type = 'user' AND target_id = 'u-1'",
    "UPDATE service_records SET created_by = 'u-2' WHERE created_by = 'u-1'",
    "UPDATE service_participants SET user_id = 'u-2' WHERE user_id = 'u-1'",
    "UPDATE service_mission_links SET participant_user_id = 'u-2' WHERE participant_user_id = 'u-1'",
    "UPDATE service_feedback SET recorded_by = 'u-2' WHERE recorded_by = 'u-1'",
    "UPDATE service_evaluations SET evaluator_id = 'u-2' WHERE evaluator_id = 'u-1'",
    "UPDATE attachments SET uploaded_by = 'u-2' WHERE uploaded_by = 'u-1'",
    "UPDATE mission_notification_recipients SET user_id = 'u-2' WHERE user_id = 'u-1'",
    "SET FOREIGN_KEY_CHECKS = 1"
  ];

  for (const sql of queries) {
    await connection.query(sql);
  }

  console.log("Migration completed: 'u-1' successfully renamed to 'u-2' across all tables.");
  await connection.end();
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
