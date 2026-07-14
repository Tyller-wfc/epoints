require('dotenv').config();
const mysql = require('mysql2/promise');
const getDatabaseConfig = require('./db-config.cjs');

async function migrate() {
  const connection = await mysql.createConnection(getDatabaseConfig());
  await connection.query(`CREATE TABLE IF NOT EXISTS attachments (
    id varchar(255) NOT NULL,
    owner_type varchar(20) NOT NULL,
    owner_id varchar(255) NOT NULL,
    original_name varchar(500) NOT NULL,
    object_key varchar(700) NOT NULL,
    mime_type varchar(150) NOT NULL,
    file_size int unsigned NOT NULL,
    checksum varchar(64) NOT NULL,
    is_image tinyint NOT NULL DEFAULT 0,
    uploaded_by varchar(255) NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY attachments_object_key (object_key),
    KEY attachments_owner (owner_type, owner_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [attachments] = await connection.query('SELECT id, original_name FROM attachments');
  let repaired = 0;
  for (const attachment of attachments) {
    const decoded = Buffer.from(attachment.original_name, 'latin1').toString('utf8');
    if (decoded !== attachment.original_name && !decoded.includes('\uFFFD')) {
      await connection.query('UPDATE attachments SET original_name=? WHERE id=?', [decoded, attachment.id]);
      repaired += 1;
    }
  }
  await connection.end();
  console.log(`attachments migration completed; repaired filenames: ${repaired}`);
}

migrate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
