const mysql = require('mysql2/promise');
const getDatabaseConfig = require('./db-config.cjs');

const roleAliases = {
  'r-dev': 'r-dev',
  'r-ai': 'r-dev',
  'r-data': 'r-dev',
  'r-quality': 'r-dev',
  'r-integration': 'r-dev',
  'r-experience': 'r-dev',
  'r-ops': 'r-ops',
  'r-network': 'r-network',
  'r-security': 'r-network',
};

const domainMappings = [
  ['r-dev', 'd-software'], ['r-dev', 'd-ai'], ['r-dev', 'd-data'],
  ['r-dev', 'd-quality'], ['r-dev', 'd-integration'], ['r-dev', 'd-experience'],
  ['r-ops', 'd-middleware'], ['r-ops', 'd-cloud'], ['r-ops', 'd-observability'],
  ['r-network', 'd-network'], ['r-network', 'd-security'], ['r-network', 'd-cloud'],
];

async function keepOneAssignment(connection, table, ownerColumn, primaryColumn) {
  const [rows] = await connection.query(
    `SELECT id, \`${ownerColumn}\` AS ownerId, \`${primaryColumn}\` AS isPrimary FROM \`${table}\` ORDER BY \`${ownerColumn}\`, \`${primaryColumn}\` DESC, id`,
  );
  const keepers = new Map();
  for (const row of rows) {
    if (!keepers.has(row.ownerId)) keepers.set(row.ownerId, row.id);
  }
  for (const [ownerId, keepId] of keepers) {
    await connection.query(`DELETE FROM \`${table}\` WHERE \`${ownerColumn}\` = ? AND id != ?`, [ownerId, keepId]);
    await connection.query(`UPDATE \`${table}\` SET \`${primaryColumn}\` = 1 WHERE id = ?`, [keepId]);
  }
}

async function normalizeUserRoles(connection) {
  const [rows] = await connection.query('SELECT user_id AS userId, role_id AS roleId, is_primary AS isPrimary FROM user_roles ORDER BY user_id, is_primary DESC, id');
  const selected = new Map();
  for (const row of rows) {
    if (!selected.has(row.userId)) selected.set(row.userId, roleAliases[row.roleId] || 'r-dev');
  }
  await connection.query('DELETE FROM user_roles');
  for (const [userId, roleId] of selected) {
    await connection.query('INSERT INTO user_roles(id,user_id,role_id,is_primary,level) VALUES(?,?,?,?,1)', [`${userId}:${roleId}`, userId, roleId, 1]);
  }
}

async function migrate() {
  const connection = await mysql.createConnection(getDatabaseConfig());
  await connection.beginTransaction();
  try {
    await connection.query("UPDATE roles SET enabled = IF(id IN ('r-dev','r-ops','r-network'), 1, 0)");
    await normalizeUserRoles(connection);
    await keepOneAssignment(connection, 'mission_domains', 'mission_id', 'is_primary');
    await connection.query('DELETE FROM role_task_domains');
    for (const [roleId, domainId] of domainMappings) {
      await connection.query('INSERT INTO role_task_domains(id,role_id,domain_id,relation_type) VALUES(?,?,?,?)', [`${roleId}:${domainId}`, roleId, domainId, 'P']);
    }
    await connection.commit();
    console.log('Role and domain assignments simplified');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
