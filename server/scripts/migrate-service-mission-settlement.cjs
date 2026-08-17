require('dotenv').config();
const mysql = require('mysql2/promise');
const getDatabaseConfig = require('./db-config.cjs');

async function migrate() {
  const connection = await mysql.createConnection(getDatabaseConfig());
  const addColumnIfMissing = async (table, column, definition) => {
    const [rows] = await connection.query(
      'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
      [table, column],
    );
    if (!rows.length) await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  };
  await addColumnIfMissing('service_records', 'settlement_mode', "varchar(20) NOT NULL DEFAULT 'Standalone' AFTER service_mode");
  await addColumnIfMissing('service_evaluations', 'settlement_type', "varchar(32) NOT NULL DEFAULT 'service_standalone' AFTER points_awarded");
  await addColumnIfMissing('point_ledger', 'target_type', "varchar(20) NOT NULL DEFAULT 'user' AFTER points_delta");
  await addColumnIfMissing('point_ledger', 'target_id', "varchar(255) NOT NULL DEFAULT '' AFTER target_type");
  const statements = [
    `CREATE TABLE IF NOT EXISTS service_mission_links (
      id varchar(255) NOT NULL PRIMARY KEY,
      service_record_id varchar(255) NOT NULL,
      mission_id varchar(255) NOT NULL,
      participant_user_id varchar(255) NOT NULL,
      allocation_weight int NOT NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY service_mission_link_pair (service_record_id, mission_id),
      KEY service_mission_link_mission (mission_id),
      CONSTRAINT service_mission_link_record_fk FOREIGN KEY (service_record_id) REFERENCES service_records(id) ON DELETE CASCADE,
      CONSTRAINT service_mission_link_mission_fk FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE,
      CONSTRAINT service_mission_link_user_fk FOREIGN KEY (participant_user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];
  for (const statement of statements) await connection.query(statement);
  await connection.end();
  console.log('service mission settlement migration completed');
}

migrate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
