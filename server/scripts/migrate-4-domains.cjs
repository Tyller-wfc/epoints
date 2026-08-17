const mysql = require('mysql2/promise');
const getDatabaseConfig = require('./db-config.cjs');

const targetDomains = [
  { id: 'd-cloud', code: 'cloud-delivery', name: '云原生与交付', description: '容器、Kubernetes、CI/CD、发布和容量' },
  { id: 'd-middleware', code: 'middleware-platform', name: '数据库与中间件', description: '数据库、SQL、缓存、消息队列、网关和存储' },
  { id: 'd-software', code: 'software', name: '应用开发', description: '业务功能、前端/后端 API、客户端与脚本' },
  { id: 'd-network', code: 'network-connectivity', name: '网络与安全', description: '网络路由、VPN、防火墙、安全防护与专线' },
];

const oldDomainAliasMap = {
  'd-cloud': 'd-cloud',
  'd-middleware': 'd-middleware',
  'd-observability': 'd-middleware',
  'd-data': 'd-middleware',
  'd-software': 'd-software',
  'd-ai': 'd-software',
  'd-experience': 'd-software',
  'd-quality': 'd-software',
  'd-integration': 'd-software',
  'd-network': 'd-network',
  'd-security': 'd-network',
};

async function migrate() {
  const connection = await mysql.createConnection(getDatabaseConfig());
  await connection.beginTransaction();
  try {
    // 1. Update task_domains: disable all, enable and rename the 4 target domains
    await connection.query('UPDATE task_domains SET enabled = 0');
    for (const d of targetDomains) {
      await connection.query(
        'INSERT INTO task_domains(id, code, name, description, enabled) VALUES(?,?,?,?,1) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), enabled=1',
        [d.id, d.code, d.name, d.description],
      );
    }

    // 2. Remap mission_domains to target 4 domains
    const [missionDomains] = await connection.query('SELECT * FROM mission_domains');
    await connection.query('DELETE FROM mission_domains');
    const missionDomainSet = new Set();
    for (const md of missionDomains) {
      const targetId = oldDomainAliasMap[md.domain_id] || 'd-software';
      const key = `${md.mission_id}:${targetId}`;
      if (!missionDomainSet.has(key)) {
        missionDomainSet.add(key);
        await connection.query(
          'INSERT INTO mission_domains(id, mission_id, domain_id, is_primary) VALUES(?,?,?,?)',
          [key, md.mission_id, targetId, md.is_primary],
        );
      }
    }

    // 3. Remap role_task_domains
    await connection.query('DELETE FROM role_task_domains');
    const roleDomainMappings = [
      ['r-dev', 'd-software'],
      ['r-ops', 'd-cloud'],
      ['r-ops', 'd-middleware'],
      ['r-network', 'd-network'],
    ];
    for (const [roleId, domainId] of roleDomainMappings) {
      await connection.query(
        'INSERT INTO role_task_domains(id, role_id, domain_id, relation_type) VALUES(?,?,?,?)',
        [`${roleId}:${domainId}`, roleId, domainId, 'P'],
      );
    }

    await connection.commit();
    console.log('Successfully migrated task domains to 4 simplified categories!');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
