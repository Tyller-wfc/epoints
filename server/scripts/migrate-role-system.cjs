const mysql = require('mysql2/promise');
const getDatabaseConfig = require('./db-config.cjs');

const roles = [
  ['r-dev', 'developer', '开发工程师', '全栈应用、接口、客户端、脚本和系统实现'],
  ['r-ai', 'ai-engineer', '智能应用工程师', '大模型、Agent、RAG、知识库和模型评测'],
  ['r-data', 'data-engineer', '数据工程师', '数据建模、数据库、ETL 和数据治理'],
  ['r-ops', 'operations-engineer', '运维工程师', 'Linux、中间件、云平台、容器和可观测性'],
  ['r-network', 'network-engineer', '网络工程师', '路由、DNS、VPN、负载均衡、防火墙和专线'],
  ['r-security', 'security-engineer', '安全工程师', '身份权限、漏洞、攻防、审计和合规'],
  ['r-quality', 'quality-engineer', '质量工程师', '自动化、性能、回归、质量门禁和验收'],
  ['r-integration', 'integration-engineer', '集成工程师', 'SSO、LDAP、Webhook、第三方系统和流程自动化'],
  ['r-experience', 'product-experience', '产品体验工程师', '需求、业务流程、交互体验、文档和用户采用'],
];

const domains = [
  ['d-software', 'software', '软件与应用开发', '功能、API、客户端、重构和脚本工具'],
  ['d-ai', 'ai-systems', 'AI 与智能系统', 'Agent、RAG、知识库、模型接入和 AI 评测'],
  ['d-data', 'data-database', '数据与数据库', '数据建模、SQL、ETL、备份恢复和治理'],
  ['d-middleware', 'middleware-platform', '中间件与平台', '缓存、消息队列、网关、配置中心和搜索'],
  ['d-cloud', 'cloud-delivery', '云原生与交付', '容器、Kubernetes、CI/CD、发布和容量'],
  ['d-network', 'network-connectivity', '网络与连接', 'DNS、VPN、路由、防火墙、负载均衡和专线'],
  ['d-security', 'security-compliance', '安全与合规', '权限、漏洞、攻防、审计、隐私和数据安全'],
  ['d-quality', 'quality-validation', '质量与验证', '自动化、回归、性能、兼容性和验收'],
  ['d-observability', 'observability-incident', '可观测性与故障', '监控、日志、告警、排障、容灾和复盘'],
  ['d-integration', 'integration-automation', '系统集成与自动化', 'SSO、LDAP、Webhook、SaaS 和审批流程'],
  ['d-experience', 'product-experience', '产品与用户体验', '需求、流程、交互、文档、推广和培训'],
];

const mappings = [
  ['r-dev','d-software','P'], ['r-quality','d-software','R'], ['r-experience','d-software','S'],
  ['r-ai','d-ai','P'], ['r-dev','d-ai','S'], ['r-data','d-ai','S'], ['r-quality','d-ai','R'], ['r-security','d-ai','R'],
  ['r-data','d-data','P'], ['r-dev','d-data','S'], ['r-ops','d-data','S'], ['r-security','d-data','R'],
  ['r-ops','d-middleware','P'], ['r-dev','d-middleware','S'], ['r-data','d-middleware','S'],
  ['r-ops','d-cloud','P'], ['r-dev','d-cloud','S'], ['r-security','d-cloud','R'], ['r-network','d-cloud','S'],
  ['r-network','d-network','P'], ['r-ops','d-network','S'], ['r-security','d-network','R'],
  ['r-security','d-security','P'], ['r-dev','d-security','S'], ['r-ops','d-security','S'], ['r-network','d-security','S'],
  ['r-quality','d-quality','P'], ['r-dev','d-quality','S'], ['r-ai','d-quality','S'],
  ['r-ops','d-observability','P'], ['r-network','d-observability','S'], ['r-dev','d-observability','S'], ['r-data','d-observability','S'], ['r-security','d-observability','R'],
  ['r-integration','d-integration','P'], ['r-dev','d-integration','S'], ['r-ops','d-integration','S'], ['r-network','d-integration','S'],
  ['r-experience','d-experience','P'], ['r-dev','d-experience','S'], ['r-ai','d-experience','S'],
];

async function addColumn(connection, table, column, sql) {
  const [rows] = await connection.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  if (!rows.length) await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN ${sql}`);
}

async function migrate() {
  const db = await mysql.createConnection(getDatabaseConfig());
  await addColumn(db, 'users', 'phone_encrypted', '`phone_encrypted` text NULL');
  await addColumn(db, 'users', 'phone_hash', '`phone_hash` varchar(64) NULL');
  await addColumn(db, 'users', 'enabled', '`enabled` tinyint NOT NULL DEFAULT 1');
  await addColumn(db, 'users', 'availability', "`availability` varchar(20) NOT NULL DEFAULT 'Available'");
  await addColumn(db, 'missions', 'priority', "`priority` varchar(20) NOT NULL DEFAULT 'Normal'");
  await db.query('CREATE TABLE IF NOT EXISTS roles (id varchar(255) PRIMARY KEY, code varchar(60) NOT NULL UNIQUE, name varchar(100) NOT NULL, description text NOT NULL, enabled tinyint NOT NULL DEFAULT 1) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
  await db.query('CREATE TABLE IF NOT EXISTS task_domains (id varchar(255) PRIMARY KEY, code varchar(80) NOT NULL UNIQUE, name varchar(120) NOT NULL, description text NOT NULL, enabled tinyint NOT NULL DEFAULT 1) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
  await db.query('CREATE TABLE IF NOT EXISTS role_task_domains (id varchar(255) PRIMARY KEY, role_id varchar(255) NOT NULL, domain_id varchar(255) NOT NULL, relation_type varchar(10) NOT NULL, UNIQUE KEY role_domain_unique(role_id,domain_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
  await db.query('CREATE TABLE IF NOT EXISTS user_roles (id varchar(255) PRIMARY KEY, user_id varchar(255) NOT NULL, role_id varchar(255) NOT NULL, is_primary tinyint NOT NULL DEFAULT 0, level tinyint NOT NULL DEFAULT 2, UNIQUE KEY user_role_unique(user_id,role_id), KEY user_role_user(user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
  await db.query('CREATE TABLE IF NOT EXISTS mission_domains (id varchar(255) PRIMARY KEY, mission_id varchar(255) NOT NULL, domain_id varchar(255) NOT NULL, is_primary tinyint NOT NULL DEFAULT 0, UNIQUE KEY mission_domain_unique(mission_id,domain_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
  await db.query('CREATE TABLE IF NOT EXISTS mission_notification_recipients (id varchar(255) PRIMARY KEY, mission_id varchar(255) NOT NULL, user_id varchar(255) NOT NULL, match_type varchar(10) NOT NULL, role_names varchar(500) NOT NULL, mentioned tinyint NOT NULL DEFAULT 1, created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, KEY recipient_mission(mission_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
  for (const role of roles) await db.query('INSERT INTO roles(id,code,name,description) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description)', role);
  for (const domain of domains) await db.query('INSERT INTO task_domains(id,code,name,description) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),description=VALUES(description)', domain);
  for (const [roleId, domainId, type] of mappings) await db.query('INSERT INTO role_task_domains(id,role_id,domain_id,relation_type) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE relation_type=VALUES(relation_type)', [`${roleId}:${domainId}`,roleId,domainId,type]);
  const assignments = [
    ['u-2','r-ops',1,4], ['u-2','r-data',0,3],
  ];
  for (const [userId,roleId,primary,level] of assignments) await db.query('INSERT IGNORE INTO user_roles(id,user_id,role_id,is_primary,level) VALUES(?,?,?,?,?)', [`${userId}:${roleId}`,userId,roleId,primary,level]);
  const [missions] = await db.query('SELECT id,category FROM missions');
  const categoryDomain = { Development:'d-software', Design:'d-experience', QA:'d-quality', Operations:'d-observability' };
  for (const mission of missions) {
    const domainId = categoryDomain[mission.category] || 'd-software';
    await db.query('INSERT IGNORE INTO mission_domains(id,mission_id,domain_id,is_primary) VALUES(?,?,?,1)', [`${mission.id}:${domainId}`,mission.id,domainId]);
  }
  await db.end();
  console.log('AI-era role and task-domain migration completed');
}

migrate().catch((error) => { console.error(error); process.exitCode = 1; });
