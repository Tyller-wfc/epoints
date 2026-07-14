const mysql = require('mysql2/promise');
const getDatabaseConfig = require('./db-config.cjs');

async function migrate() {
  const connection = await mysql.createConnection(getDatabaseConfig());

  const [columns] = await connection.query("SHOW COLUMNS FROM users LIKE 'id'");
  if (!columns.length) {
    await connection.query('ALTER TABLE users ADD COLUMN id varchar(255) NULL FIRST');
    const users = [
      ['u-1', '宋鹏'], ['u-2', '王方超'], ['u-3', '刘光东'],
      ['u-4', '张淼'], ['u-5', '刘志松'], ['u-6', '张辉'],
    ];
    for (const [id, name] of users) {
      await connection.query('UPDATE users SET id = ? WHERE name = ?', [id, name]);
    }
    const [[{ count }]] = await connection.query('SELECT COUNT(*) AS count FROM users WHERE id IS NULL');
    if (count) throw new Error('存在无法映射的用户，已停止主键迁移');
    await connection.query('ALTER TABLE users MODIFY id varchar(255) NOT NULL, ADD PRIMARY KEY (id)');
    console.log('users.id migration completed');
  } else {
    console.log('users.id already exists');
  }

  const userProfiles = [
    ['u-1', '宋鹏', 'Admin'], ['u-2', '王方超', 'Engineer'],
    ['u-3', '刘光东', 'Engineer'], ['u-4', '张淼', 'Designer'],
    ['u-5', '刘志松', 'QA'], ['u-6', '张辉', 'Admin'],
  ];
  for (const [id, name, roleType] of userProfiles) {
    await connection.query(
      "UPDATE users SET name = IF(name = '', ?, name), role_type = IF(role_type = '', ?, role_type) WHERE id = ?",
      [name, roleType, id],
    );
  }

  const [missionColumns] = await connection.query("SHOW COLUMNS FROM missions LIKE 'id'");
  if (!missionColumns.length) {
    await connection.query('ALTER TABLE missions ADD COLUMN id varchar(255) NULL FIRST');
    const [missions] = await connection.query('SELECT title FROM missions ORDER BY title');
    for (let index = 0; index < missions.length; index += 1) {
      await connection.query('UPDATE missions SET id = ? WHERE title = ?', [`m-${index + 1}`, missions[index].title]);
    }
    await connection.query('ALTER TABLE missions MODIFY id varchar(255) NOT NULL, ADD PRIMARY KEY (id)');
    console.log('missions.id migration completed');
  }

  await connection.query(`CREATE TABLE IF NOT EXISTS auth_credentials (
    user_id varchar(255) NOT NULL,
    username varchar(255) NOT NULL,
    password_hash varchar(255) NOT NULL,
    PRIMARY KEY (user_id),
    UNIQUE KEY auth_credentials_username (username)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await connection.end();
}

migrate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
