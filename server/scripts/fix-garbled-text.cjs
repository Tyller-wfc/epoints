const mysql = require('mysql2/promise');
const getDatabaseConfig = require('./db-config.cjs');

async function fixGarbledText() {
  const config = { ...getDatabaseConfig(), charset: 'utf8mb4' };
  const conn = await mysql.createConnection(config);

  console.log('Fixing garbled text in missions table...');
  await conn.query(`
    UPDATE missions SET 
      title = '升级企业级微服务脚手架至 React 19 / Vite 6', 
      description = '全面升级基础框架，解决遗留的编译警告，优化构建时间至 5 秒以内，以提高全局研发部署响应效率。' 
    WHERE id = 'm-1'
  `);
  await conn.query(`
    UPDATE missions SET 
      title = '🔥 紧急修复支付结算系统高并发接口超时问题', 
      description = '在遭遇高负荷峰值时，结算接口响应超过 3 秒，需要重构 Redis 缓存锁并优化数据库查询索引，属于核心攻坚任务。' 
    WHERE id = 'm-2'
  `);
  await conn.query(`
    UPDATE missions SET 
      title = '重新设计企业福利商城移动端高保真交互原型', 
      description = '针对移动端操作手感优化，绘制完整的 UI 规范，包括兑换成功动效、积分余额滚动增加动效等，提升整体用户体验。' 
    WHERE id = 'm-3'
  `);
  await conn.query(`
    UPDATE missions SET 
      title = '编写客户数据导出模块端到端集成测试', 
      description = '完成导出 Excel/PDF 文件的核心逻辑覆盖率至 90% 以上，防止多线程导出时出现内存泄漏导致节点宕机。',
      proof_of_work = '已完成测试用例编写，代码库 PR 链接: github.com/epoints/corp-web/pull/239。本地通过 50 轮并发压力测试，内存曲线稳定。'
    WHERE id = 'm-4'
  `);
  await conn.query(`
    UPDATE missions SET 
      title = '部署生产环境 K8s 集群双机房热备容灾', 
      description = '实现容灾演练，确保当 A 机房完全断网或断电时，B 机房能在 30 秒内全量接管业务请求，保障系统全天候抗击突发故障的能力。',
      proof_of_work = '双机房 Keepalived + DNS 自动切换配置完毕，断开 A 机房主路由后测试切换时长为 18.4s，符合预期。附件报告已发至 Wiki 归档。'
    WHERE id = 'm-5'
  `);

  console.log('Fixing garbled text in feed table...');
  await conn.query(`
    UPDATE feed SET 
      message = 'ePoints 协同管理系统就绪，各项目组成员已接入。' 
    WHERE id = 'f-1'
  `);
  await conn.query(`
    UPDATE feed SET 
      message = '王方超 成功完成了高价值任务：部署生产环境 K8s 集群双机房热备容灾，获得 1500 积分。' 
    WHERE id = 'f-2'
  `);
  await conn.query(`
    UPDATE feed SET 
      message = '系统自动排单：王方超 极速解决 GPG 签名报错问题，耗时 30 分钟，获得排障激励 150 积分。' 
    WHERE id = 'f-3'
  `);

  console.log('Fixing garbled text in tickets table...');
  await conn.query(`
    UPDATE tickets SET 
      title = '主代码仓库推送报错，提示 GPG 签名校验失败', 
      description = '开发在推送代码到主分支时抛出 GPG signature verify failed 错误，阻塞了当天版本的合并发布，影响开发线。', 
      resolution_note = '已在 GPG 服务端重新分发并信任开发机器的公钥，解决签名阻拦错误。' 
    WHERE id = 't-1'
  `);

  console.log('Garbled text fix completed successfully!');
  await conn.end();
}

fixGarbledText().catch((err) => {
  console.error('Error fixing garbled text:', err);
  process.exit(1);
});
