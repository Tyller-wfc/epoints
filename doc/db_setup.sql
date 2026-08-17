-- ==========================================================
-- ePoints 效能协同系统 - MySQL 8.0 数据库建库、建表及初始化脚本
-- 连接信息请通过 server/.env 配置，不要在脚本中保存实际凭据。
-- ==========================================================

-- 1. 创建数据库
CREATE DATABASE IF NOT EXISTS epoints CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE epoints;

-- 2. 移除旧表以防万一
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS feed;
DROP TABLE IF EXISTS duty;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS rewards;
DROP TABLE IF EXISTS missions;
DROP TABLE IF EXISTS users;

-- 3. 创建用户表
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(32) NOT NULL COMMENT '姓名',
  avatar VARCHAR(255) COMMENT '头像访问路径',
  avatar_object_key VARCHAR(700) NULL COMMENT 'MinIO 头像对象键',
  avatar_mime_type VARCHAR(100) NULL COMMENT '头像 MIME 类型',
  role VARCHAR(255) NOT NULL COMMENT '企业角色描述',
  role_type VARCHAR(16) NOT NULL COMMENT '角色大类: Admin / Engineer / Designer / QA',
  points_balance INT DEFAULT 0 COMMENT '可用积分余额',
  points_earned_lifetime INT DEFAULT 0 COMMENT '历史累计获得总积分',
  penalties_count INT DEFAULT 0 COMMENT '累计受处罚次数',
  points_deducted_total INT DEFAULT 0 COMMENT '累计被扣除的总积分额度'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户积分账户表';

-- 4. 创建任务看板表
CREATE TABLE missions (
  id VARCHAR(32) PRIMARY KEY,
  title VARCHAR(255) NOT NULL COMMENT '任务标题',
  description TEXT NOT NULL COMMENT '任务详情描述',
  base_points INT NOT NULL COMMENT '基础奖励积分',
  multiplier FLOAT DEFAULT 1.0 COMMENT '战术倍率',
  status VARCHAR(32) DEFAULT 'Available' COMMENT '任务状态: Available / Claimed / In Progress / Pending Verification / Completed',
  category VARCHAR(64) NOT NULL COMMENT '任务所属分类',
  assigned_to VARCHAR(255) NULL COMMENT '被派发/认领的用户ID',
  proof_of_work TEXT NULL COMMENT '交付成果证明描述或代码链接',
  CONSTRAINT fk_missions_user FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='战术任务看板表';

-- 5. 创建福利礼品表
CREATE TABLE rewards (
  id VARCHAR(32) PRIMARY KEY,
  title VARCHAR(255) NOT NULL COMMENT '福利商品名称',
  description TEXT NOT NULL COMMENT '商品介绍说明',
  points_cost INT NOT NULL COMMENT '兑换所需积分',
  category VARCHAR(64) NOT NULL COMMENT '分类: Lifestyle / Hardware / Training / Software',
  image VARCHAR(255) NOT NULL COMMENT '商品图标(Emoji或图片)',
  inventory INT DEFAULT 10 COMMENT '当前库存数量',
  level_required INT DEFAULT 1 COMMENT '起兑效能级别 (L1-L5)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='福利商城货架表';

-- 6. 创建福利核销交易表
CREATE TABLE transactions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL COMMENT '申请兑换人ID',
  reward_id VARCHAR(32) NOT NULL COMMENT '兑换商品ID',
  points_spent INT NOT NULL COMMENT '消费积分数额',
  status VARCHAR(32) DEFAULT 'Pending Delivery' COMMENT '物流/核销状态: Pending Delivery / Delivered',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '交易时间',
  CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tx_reward FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='福利商城交易明细表';

-- 7. 创建值班表
CREATE TABLE duty (
  id VARCHAR(32) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL COMMENT '值班员ID',
  shift_start VARCHAR(16) NOT NULL COMMENT '值班开始时间 (HH:mm)',
  shift_end VARCHAR(16) NOT NULL COMMENT '值班结束时间 (HH:mm)',
  is_active TINYINT DEFAULT 0 COMMENT '是否处于活跃在岗状态(0/1)',
  CONSTRAINT fk_duty_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技术保障在线值班岗';

-- 8. 创建系统警报工单表
CREATE TABLE tickets (
  id VARCHAR(64) PRIMARY KEY,
  reporter_id VARCHAR(255) NOT NULL COMMENT '故障申报人ID',
  title VARCHAR(255) NOT NULL COMMENT '故障简述',
  description TEXT NOT NULL COMMENT '详细排障现场与受影响业务',
  severity VARCHAR(16) NOT NULL COMMENT '警报级别: Critical / High / Medium / Low',
  assigned_to VARCHAR(255) NOT NULL COMMENT '处理值班员ID',
  status VARCHAR(32) DEFAULT 'Open' COMMENT '状态: Open(待响应) / Acknowledged(接单中) / Resolved(排除完毕)',
  points_reward INT DEFAULT 100 COMMENT '基础故障解决奖励分',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '上报时间',
  acknowledged_at TIMESTAMP NULL COMMENT '响应接单时间',
  resolved_at TIMESTAMP NULL COMMENT '确认排除时间',
  resolution_note TEXT NULL COMMENT '排障结论备忘',
  points_earned_actual INT NULL COMMENT '实际结算发放的积分',
  negligence_penalized TINYINT DEFAULT 0 COMMENT '是否因响应不力/怠慢被扣分处罚(0/1)',
  secondary_fault TINYINT DEFAULT 0 COMMENT '是否属于二次重开次生故障(0/1)',
  mtta_minutes INT NULL COMMENT 'MTTA 响应时延 (分钟)',
  quick_ack_rewarded INT NULL COMMENT '接单响应奖励积分(如黄金10分钟+50 eP)',
  mttr_minutes INT NULL COMMENT 'MTTR 解决时延 (分钟)',
  CONSTRAINT fk_tickets_reporter FOREIGN KEY (reporter_id) REFERENCES users(id),
  CONSTRAINT fk_tickets_assignee FOREIGN KEY (assigned_to) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技术保障中心警报工单';

-- 9. 创建系统动态事件流表
CREATE TABLE feed (
  id VARCHAR(32) PRIMARY KEY,
  type VARCHAR(16) NOT NULL COMMENT '动态类别: system / mission / support',
  message TEXT NOT NULL COMMENT '公告事件消息内容',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '发生时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统实时动态广播流';

-- 10. 创建系统配置表
CREATE TABLE settings (
  `key` VARCHAR(64) PRIMARY KEY COMMENT '配置键名',
  `value` TEXT NOT NULL COMMENT '配置内容值'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置信息表';


-- ==========================================================
-- 11. 初始化种子测试数据 (Seeding Data)
-- ==========================================================

-- 11.1 用户数据种子
INSERT INTO users (id, name, avatar, role, role_type, points_balance, points_earned_lifetime, penalties_count, points_deducted_total) VALUES
('u-2', '王方超', '/avatars/senior_dev.png', '运维工程师', 'Admin', 1200, 4800, 0, 0);

-- 11.2 战术任务种子
INSERT INTO missions (id, title, description, base_points, multiplier, status, category, assigned_to, proof_of_work) VALUES
('m-1', '升级企业级微服务脚手架至 React 19 / Vite 6', '全面升级基础框架，解决遗留的编译警告，优化构建时间至 5 秒以内，以提高全局研发部署响应效率。', 600, 1.0, 'Available', 'Development', NULL, NULL),
('m-2', '🔥 紧急修复支付结算系统高并发接口超时问题', '在遭遇高负荷峰值时，结算接口响应超过 3 秒，需要重构 Redis 缓存锁并优化数据库查询索引，属于核心攻坚任务。', 1000, 2.0, 'Available', 'Development', NULL, NULL),
('m-3', '重新设计企业福利商城移动端高保真交互原型', '针对移动端操作手感优化，绘制完整的 UI 规范，包括兑换成功动效、积分余额滚动增加动效等，提升整体用户体验。', 500, 1.2, 'In Progress', 'Design', 'u-2', NULL),
('m-4', '编写客户数据导出模块端到端集成测试', '完成导出 Excel/PDF 文件的核心逻辑覆盖率至 90% 以上，防止多线程导出时出现内存泄漏导致节点宕机。', 400, 1.0, 'Pending Verification', 'QA', 'u-2', '已完成测试用例编写，代码库 PR 链接: github.com/epoints/corp-web/pull/239。本地通过 50 轮并发压力测试，内存曲线稳定。'),
('m-5', '部署生产环境 K8s 集群双机房热备容灾', '实现容灾演练，确保当 A 机房完全断网或断电时，B 机房能在 30 秒内全量接管业务请求，保障系统全天候抗击突发故障的能力。', 1500, 1.0, 'Completed', 'Operations', 'u-2', '双机房 Keepalived + DNS 自动切换配置完毕，断开 A 机房主路由后测试切换时长为 18.4s，符合预期。附件报告已发至 Wiki 归档。');

-- 11.3 福利商城商品种子
INSERT INTO rewards (id, title, description, points_cost, category, image, inventory, level_required) VALUES
('r-1', '额外 1 天带薪休假', '【L1起兑】经过高强度攻坚后所需的休整假，系统自动对接 HR 考勤流水注入年假。', 500, 'Lifestyle', '🏖️', 99, 1),
('r-2', '中心停车服务', '【L1起兑】园区/中心地下停车场月度免费停放服务，行政统一核销发放。', 400, 'Lifestyle', '🚗', 50, 1),
('r-3', '精品咖啡兑换券', '【L1起兑】极速补充能量与咖啡因，支持星巴克 / 瑞幸 / 行政前台咖啡通用核销。', 30, 'Lifestyle', '☕', 100, 1),
('r-4', '高速 USB 3.2 闪存 U 盘 (128GB)', '【L1起兑】金属防震双接口高速读写 U 盘，办公资料传输与镜像备份必备。', 80, 'Hardware', '💾', 30, 1),
('r-5', '品牌无线降噪耳机', '【L1起兑】主动降噪与高保真音质，沉浸式写代码与系统设计必备。', 350, 'Hardware', '🎧', 15, 1),
('r-6', '百度网盘 SVIP 会员', '【L1起兑】超大云端存储空间与极速下载特权，团队超大文件协同分享。', 60, 'Software', '☁️', 50, 1),
('r-7', '夸克网盘 SVIP 会员', '【L1起兑】高清视频云播、文档扫描与夸克云盘极速同步特权。', 60, 'Software', '📁', 50, 1),
('r-8', 'Kimi 大模型高级会员 / API 额度包', '【L1起兑】长文本长上下文分析、高阶大模型对话与 API 调用额度凭证。', 100, 'Software', '🤖', 40, 1),
('r-9', 'Antigravity AI 平台高级会员', '【L1起兑】Antigravity 智能体开发与自动化编程平台全功能高级订阅。', 120, 'Software', '🚀', 30, 1),
('r-10', 'Codex / Copilot 编程大模型会员', '【L1起兑】智能代码补全、函数生成与 AI 单元测试生成专属订阅。', 150, 'Software', '💻', 30, 1);


-- 11.4 值班岗位配置种子
INSERT INTO duty (id, user_id, shift_start, shift_end, is_active) VALUES
('d-1', 'u-2', '00:00', '24:00', 1);

-- 11.5 系统动态日志事件流
INSERT INTO feed (id, type, message, timestamp) VALUES
('f-1', 'system', 'ePoints 协同管理系统就绪，各项目组成员已接入。', DATE_SUB(NOW(), INTERVAL 10 HOUR)),
('f-2', 'mission', '王方超 成功完成了高价值任务：部署生产环境 K8s 集群双机房热备容灾，获得 1500 积分。', DATE_SUB(NOW(), INTERVAL 8 HOUR)),
('f-3', 'support', '系统自动排单：王方超 极速解决 GPG 签名报错问题，耗时 30 分钟，获得排障激励 150 积分。', DATE_SUB(NOW(), INTERVAL 11.5 HOUR));

-- 11.6 系统配置初始化
INSERT INTO settings (`key`, `value`) VALUES
('webhook_url', ''),
('webhook_mention_mobiles', '');

-- 11.7 已解决故障工单种子
INSERT INTO tickets (id, reporter_id, title, description, severity, assigned_to, status, points_reward, created_at, acknowledged_at, resolved_at, resolution_note, points_earned_actual, negligence_penalized, secondary_fault, mtta_minutes, quick_ack_rewarded, mttr_minutes) VALUES
('t-1', 'u-2', '主代码仓库推送报错，提示 GPG 签名校验失败', '开发在推送代码到主分支时抛出 GPG signature verify failed 错误，阻塞了当天版本的合并发布，影响开发线。', 'High', 'u-2', 'Resolved', 150, DATE_SUB(NOW(), INTERVAL 12 HOUR), DATE_SUB(NOW(), INTERVAL 12 HOUR), DATE_SUB(NOW(), INTERVAL 11.5 HOUR), '已在 GPG 服务端重新分发并信任开发机器的公钥，解决签名阻拦错误。', 150, 0, 0, 1, 0, 30);
