-- ==========================================================
-- ePoints 效能协同系统 - MySQL 8.0 数据库建库、建表及初始化脚本
-- 连接信息:
-- Host: 192.168.31.180
-- Port: 3306
-- Database: epoints
-- User: root
-- Password: 1qaz@WSX
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
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(32) NOT NULL COMMENT '姓名',
  avatar VARCHAR(255) COMMENT '头像相对路径或Base64',
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
  assigned_to VARCHAR(32) NULL COMMENT '被派发/认领的用户ID',
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
  user_id VARCHAR(32) NOT NULL COMMENT '申请兑换人ID',
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
  user_id VARCHAR(32) NOT NULL COMMENT '值班员ID',
  shift_start VARCHAR(16) NOT NULL COMMENT '值班开始时间 (HH:mm)',
  shift_end VARCHAR(16) NOT NULL COMMENT '值班结束时间 (HH:mm)',
  is_active TINYINT DEFAULT 0 COMMENT '是否处于活跃在岗状态(0/1)',
  CONSTRAINT fk_duty_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技术保障在线值班岗';

-- 8. 创建系统警报工单表
CREATE TABLE tickets (
  id VARCHAR(64) PRIMARY KEY,
  reporter_id VARCHAR(32) NOT NULL COMMENT '故障申报人ID',
  title VARCHAR(255) NOT NULL COMMENT '故障简述',
  description TEXT NOT NULL COMMENT '详细排障现场与受影响业务',
  severity VARCHAR(16) NOT NULL COMMENT '警报级别: Critical / High / Medium / Low',
  assigned_to VARCHAR(32) NOT NULL COMMENT '处理值班员ID',
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
  \`key\` VARCHAR(64) PRIMARY KEY COMMENT '配置键名',
  \`value\` TEXT NOT NULL COMMENT '配置内容值'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置信息表';


-- ==========================================================
-- 11. 初始化种子测试数据 (Seeding Data)
-- ==========================================================

-- 11.1 用户数据种子
INSERT INTO users (id, name, avatar, role, role_type, points_balance, points_earned_lifetime, penalties_count, points_deducted_total) VALUES
('u-1', '张建国', '/avatars/director.png', '项目总监 (效能主管)', 'Admin', 500, 500, 0, 0),
('u-2', '李明', '/avatars/senior_dev.png', '资深保障专家 (高级研发)', 'Engineer', 1200, 4800, 0, 0),
('u-3', '王芳', '/avatars/dev.png', '研发保障工程师 (开发工程师)', 'Engineer', 850, 3200, 0, 0),
('u-4', '赵勇', '/avatars/designer.png', '体验设计专家 (UI/UX)', 'Designer', 400, 2100, 0, 0),
('u-5', '刘洋', '/avatars/qa.png', '质量保障工程师 (QA测试)', 'QA', 600, 2800, 0, 0);

-- 11.2 战术任务种子
INSERT INTO missions (id, title, description, base_points, multiplier, status, category, assigned_to, proof_of_work) VALUES
('m-1', '升级企业级微服务脚手架至 React 19 / Vite 6', '全面升级基础框架，解决遗留的编译警告，优化构建时间至 5 秒以内，以提高全局研发部署响应效率。', 600, 1.0, 'Available', 'Development', NULL, NULL),
('m-2', '🔥 紧急修复支付结算系统高并发接口超时问题', '在遭遇高负荷峰值时，结算接口响应超过 3 秒，需要重构 Redis 缓存锁并优化数据库查询索引，属于核心攻坚任务。', 1000, 2.0, 'Available', 'Development', NULL, NULL),
('m-3', '重新设计企业福利商城移动端高保真交互原型', '针对移动端操作手感优化，绘制完整的 UI 规范，包括兑换成功动效、积分余额滚动增加动效等，提升整体用户体验。', 500, 1.2, 'In Progress', 'Design', 'u-4', NULL),
('m-4', '编写客户数据导出模块端到端集成测试', '完成导出 Excel/PDF 文件的核心逻辑覆盖率至 90% 以上，防止多线程导出时出现内存泄漏导致节点宕机。', 400, 1.0, 'Pending Verification', 'QA', 'u-5', '已完成测试用例编写，代码库 PR 链接: github.com/epoints/corp-web/pull/239。本地通过 50 轮并发压力测试，内存曲线稳定。'),
('m-5', '部署生产环境 K8s 集群双机房热备容灾', '实现容灾演练，确保当 A 机房完全断网或断电时，B 机房能在 30 秒内全量接管业务请求，保障系统全天候抗击突发故障的能力。', 1500, 1.0, 'Completed', 'Operations', 'u-2', '双机房 Keepalived + DNS 自动切换配置完毕，断开 A 机房主路由后测试切换时长为 18.4s，符合预期。附件报告已发至 Wiki 归档。');

-- 11.3 福利商城商品种子
INSERT INTO rewards (id, title, description, points_cost, category, image, inventory, level_required) VALUES
('r-1', '星巴克咖啡超值电子兑换券', '【L1起兑】极速补充咖啡因，由行政前台即时派发电子核销码。', 150, 'Lifestyle', '☕', 99, 1),
('r-2', 'ePoints 联名款极客双层随行杯', '【L1起兑】磨砂工业质感不锈钢保温杯，专属极客身份象征。', 250, 'Lifestyle', '🥤', 30, 1),
('r-3', '极客时间 30天全场通用畅听年卡', '【L1起兑】热门前沿IT技术、架构演进及软实力精选课程无限畅听。', 450, 'Training', '🎧', 50, 1),
('r-4', '研发极速解压高能零食包', '【L1起兑】坚果、燕麦能量棒、高浓度纯黑巧克力下午茶解压补给箱。', 100, 'Lifestyle', '🍿', 150, 1),
('r-5', 'Keychron K2 双模机械键盘 (铝合金版/红轴)', '【L2起兑】极简无线多模键盘，手感柔和，大幅度升级长途打字生产力。', 1200, 'Hardware', '⌨️', 5, 2),
('r-6', '罗技 MX Master 3S 旗舰办公鼠标', '【L2起兑】电磁金属滚轮，手感舒适，完美适配程序员的多屏多任务操作。', 1800, 'Hardware', '🖱️', 6, 2),
('r-7', 'Figma 专业版个人年度订阅许可', '【L2起兑】设计师专属，解锁无限个人及协同团队协作空间权限。', 1000, 'Software', '🎨', 10, 2),
('r-8', '额外 1 天带薪休假 (系统自动注入年假)', '【L2起兑】经过高强度攻坚后所需的整理休假，系统自动对接考勤流水。', 800, 'Lifestyle', '🏖️', 99, 2),
('r-9', 'JetBrains 全家桶 / 任意单品个人年度兑换码', '【L2起兑】包含 IntelliJ IDEA, WebStorm, GoLand 等主流开发利器年卡订阅。', 2200, 'Software', '💻', 15, 2),
('r-10', '戴尔 UltraSharp 27英寸 4K 护眼显示器', '【L3起兑】Type-C 一线直连，极致高清色彩，完美呈现每一行代码与像素细节。', 3500, 'Hardware', '🖥️', 3, 3),
('r-11', '索尼 WH-1000XM5 头戴式智能无线降噪耳机', '【L3起兑】顶级主动降噪与佩戴感，给您沉浸在写代码和系统设计中的极致宁静。', 4800, 'Hardware', '🎧', 4, 3),
('r-12', 'AWS / GCP / K8s (CKA) 顶级专业认证考试报名券', '【L3起兑】官方专业工程师与架构师报考费用全额报销凭证卡。', 3000, 'Training', '📜', 20, 3),
('r-13', '研发小组高级聚餐能量能量基金', '【L3起兑】包含精品双人或多人餐、下午茶豪华蛋糕组，为团队提气暖心。', 1500, 'Lifestyle', '🍕', 8, 3),
('r-14', '赫曼米勒 Herman Miller Aeron 人体工学办公椅', '【L4起兑】腰背健康终极守护方案，硅谷极客大厂标配，极致包裹支撑感。', 12000, 'Hardware', '💺', 2, 4),
('r-15', '行政级年度海外自由行定制赞助基金', '【L5起兑】海外带薪休假计划，公司全额赞助往返机票与五星酒店住宿额度。', 20000, 'Lifestyle', '✈️', 2, 5),
('r-16', 'Apple MacBook Pro 16寸 (M3 Max / 64G / 2T)', '【L5起兑】极致生产力王牌资产！企业免除折旧回收特权，终身归属于您个人所有。', 35000, 'Hardware', '💻', 1, 5);

-- 11.4 值班岗位配置种子
INSERT INTO duty (id, user_id, shift_start, shift_end, is_active) VALUES
('d-1', 'u-2', '09:00', '18:00', 1),
('d-2', 'u-3', '18:00', '09:00', 0);

-- 11.5 系统动态日志事件流
INSERT INTO feed (id, type, message, timestamp) VALUES
('f-1', 'system', 'ePoints 协同管理系统就绪，各项目组成员已接入。', DATE_SUB(NOW(), INTERVAL 10 HOUR)),
('f-2', 'mission', '李明 成功完成了高价值任务：部署生产环境 K8s 集群双机房热备容灾，获得 1500 积分。', DATE_SUB(NOW(), INTERVAL 8 HOUR)),
('f-3', 'support', '系统自动排单：李明 极速解决 GPG 签名报错问题，耗时 30 分钟，获得排障激励 150 积分。', DATE_SUB(NOW(), INTERVAL 11.5 HOUR));

-- 11.6 系统配置初始化
INSERT INTO settings (\`key\`, \`value\`) VALUES
('webhook_url', 'https://open.feishu.cn/open-apis/bot/v2/hook/mock-webhook-url-xyz');

-- 11.7 已解决故障工单种子
INSERT INTO tickets (id, reporter_id, title, description, severity, assigned_to, status, points_reward, created_at, acknowledged_at, resolved_at, resolution_note, points_earned_actual, negligence_penalized, secondary_fault, mtta_minutes, quick_ack_rewarded, mttr_minutes) VALUES
('t-1', 'u-4', '主代码仓库推送报错，提示 GPG 签名校验失败', '开发在推送代码到主分支时抛出 GPG signature verify failed 错误，阻塞了当天版本的合并发布，影响开发线。', 'High', 'u-2', 'Resolved', 150, DATE_SUB(NOW(), INTERVAL 12 HOUR), DATE_SUB(NOW(), INTERVAL 12 HOUR), DATE_SUB(NOW(), INTERVAL 11.5 HOUR), '已在 GPG 服务端重新分发并信任开发机器的公钥，解决签名阻拦错误。', 150, 0, 0, 1, 0, 30);
