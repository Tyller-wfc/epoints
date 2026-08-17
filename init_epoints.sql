-- ============================================================
-- ePoints 数据库初始化脚本
-- 目标数据库: epoints
-- 执行前请确保已连接正确的数据库: USE epoints;
-- ============================================================

USE epoints;

-- ------------------------------------------------------------
-- 第一步：清空业务数据（保留表结构）
-- 按照外键依赖顺序从子表到父表删除
-- ------------------------------------------------------------

-- 客户服务：子表先删
DELETE FROM service_evaluations;
DELETE FROM service_feedback;
DELETE FROM service_participants;
DELETE FROM service_mission_links;
DELETE FROM service_records;
DELETE FROM external_customers;

-- 技术保障中心：故障工单
DELETE FROM tickets;

-- 任务系统：子表先删
DELETE FROM mission_notification_recipients;
DELETE FROM mission_domains;
DELETE FROM missions;

-- 积分 / 兑换流水
DELETE FROM point_ledger;
DELETE FROM transactions;

-- 福利商城商品
DELETE FROM rewards;

-- 值班排班
DELETE FROM duty;

-- 动态信息流
DELETE FROM feed;

-- 附件
DELETE FROM attachments;

-- 清空角色与领域所有关联数据（含旧数据）
DELETE FROM user_roles;
DELETE FROM role_task_domains;
DELETE FROM task_domains;
DELETE FROM roles;

-- ------------------------------------------------------------
-- 第二步：清空用户数据（凭证先删，users 后删）
-- ------------------------------------------------------------

DELETE FROM auth_credentials;
DELETE FROM users;

-- ------------------------------------------------------------
-- 第三步：写入唯一管理员用户
-- ------------------------------------------------------------

INSERT INTO users (
    id,
    name,
    avatar,
    avatar_object_key,
    avatar_mime_type,
    role,
    role_type,
    points_balance,
    points_earned_lifetime,
    penalties_count,
    points_deducted_total,
    phone_encrypted,
    phone_hash,
    enabled,
    availability
) VALUES (
    'u-1',
    '王方超',
    '/avatars/senior_dev.png',
    NULL,
    NULL,
    '管理员',
    'Admin',
    0,
    0,
    0,
    0,
    NULL,
    NULL,
    1,
    'Available'
);

INSERT INTO auth_credentials (
    user_id,
    username,
    password_hash
) VALUES (
    'u-1',
    'wangfangchao',
    '$2b$12$GWu5U8zGtyCPoM1gsUjAleiIY2ogK.vf0AxH1cS1qc06mUSi4Hq1q'
);

-- ------------------------------------------------------------
-- 第四步：写入系统基础配置（Webhook URL 等）
-- 若 settings 表已有记录则跳过
-- ------------------------------------------------------------

INSERT IGNORE INTO settings (`key`, `value`)
VALUES ('webhook_url', '');

-- ------------------------------------------------------------
-- 第五步：写入基础任务领域（4 个）、角色（3 个）及领域映射
-- ------------------------------------------------------------

-- 任务领域
INSERT INTO task_domains (id, code, name, description, enabled) VALUES
  ('d-cloud',      'cloud-delivery',       '云原生与交付',   '容器、Kubernetes、CI/CD、发布和容量',       1),
  ('d-middleware', 'middleware-platform',   '数据库与中间件', '数据库、SQL、缓存、消息队列、网关和存储',   1),
  ('d-software',   'software',             '应用开发',       '业务功能、前端/后端 API、客户端与脚本',     1),
  ('d-network',    'network-connectivity', '网络与安全',     '网络路由、VPN、防火墙、安全防护与专线',     1);

-- 角色
INSERT INTO roles (id, code, name, description, enabled) VALUES
  ('r-dev',     'developer',           '开发工程师', '全栈应用、接口、客户端、脚本和系统实现',  1),
  ('r-ops',     'operations-engineer', '运维工程师', 'Linux、中间件、云平台、容器和可观测性',   1),
  ('r-network', 'network-engineer',    '网络工程师', '路由、DNS、VPN、负载均衡、防火墙和专线', 1);

-- 角色与领域映射
INSERT INTO role_task_domains (id, role_id, domain_id, relation_type) VALUES
  ('r-dev:d-software',    'r-dev',     'd-software',   'P'),
  ('r-ops:d-cloud',       'r-ops',     'd-cloud',      'P'),
  ('r-ops:d-middleware',  'r-ops',     'd-middleware',  'P'),
  ('r-network:d-network', 'r-network', 'd-network',    'P');

-- ============================================================
-- 初始化完成
-- 登录账号: wangfangchao  密码: wangfangchao
-- ============================================================
