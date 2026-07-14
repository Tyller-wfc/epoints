const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const getDatabaseConfig = require('./db-config.cjs');

async function migrate() {
  const db = await mysql.createConnection(getDatabaseConfig());
  await db.beginTransaction();
  try {
    const passwordHash = await bcrypt.hash('demo123', 12);
    await db.query("UPDATE users SET name='王方超', role_type='Admin', role='运维工程师', enabled=1, availability='Available' WHERE id='u-2'");
    await db.query("UPDATE missions SET assigned_to='u-2' WHERE assigned_to IS NOT NULL AND assigned_to!='u-2'");
    await db.query("UPDATE tickets SET reporter_id='u-2' WHERE reporter_id!='u-2'");
    await db.query("UPDATE tickets SET assigned_to='u-2' WHERE assigned_to!='u-2'");
    await db.query("UPDATE transactions SET user_id='u-2' WHERE user_id!='u-2'");
    await db.query("UPDATE attachments SET uploaded_by='u-2' WHERE uploaded_by!='u-2'");
    await db.query("DELETE FROM mission_notification_recipients WHERE user_id!='u-2'");
    await db.query("DELETE FROM duty WHERE user_id!='u-2'");
    await db.query("UPDATE duty SET is_active=1 WHERE user_id='u-2'");
    await db.query("DELETE FROM user_roles WHERE user_id!='u-2'");
    await db.query("DELETE FROM auth_credentials WHERE user_id!='u-2'");
    await db.query("DELETE FROM users WHERE id!='u-2'");
    await db.query("INSERT IGNORE INTO auth_credentials(user_id,username,password_hash) VALUES('u-2','u2',?)", [passwordHash]);
    await db.query("INSERT INTO user_roles(id,user_id,role_id,is_primary,level) VALUES('u-2:r-ops','u-2','r-ops',1,4) ON DUPLICATE KEY UPDATE is_primary=1,level=4");
    await db.query("UPDATE user_roles SET is_primary=0 WHERE user_id='u-2' AND role_id!='r-ops'");
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  }
  await db.end();
  console.log('single owner migration completed; protected user: u-2');
}

migrate().catch((error) => { console.error(error); process.exitCode = 1; });
