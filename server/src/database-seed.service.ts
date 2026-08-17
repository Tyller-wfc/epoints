import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Mission } from './entities/mission.entity';
import { Reward } from './entities/reward.entity';
import { Duty } from './entities/duty.entity';
import { Ticket } from './entities/ticket.entity';
import { Feed } from './entities/feed.entity';
import { Setting } from './entities/setting.entity';
import * as bcrypt from 'bcryptjs';
import { Credential } from './entities/credential.entity';

@Injectable()
export class DatabaseSeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Mission) private readonly missionRepo: Repository<Mission>,
    @InjectRepository(Reward) private readonly rewardRepo: Repository<Reward>,
    @InjectRepository(Duty) private readonly dutyRepo: Repository<Duty>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Feed) private readonly feedRepo: Repository<Feed>,
    @InjectRepository(Setting) private readonly settingRepo: Repository<Setting>,
    @InjectRepository(Credential) private readonly credentialRepo: Repository<Credential>,
  ) {}

  async onApplicationBootstrap() {
    const userCount = await this.userRepo.count();
    if (userCount > 0) {
      const users = await this.userRepo.find();
      const passwordHash = await bcrypt.hash('demo123', 12);
      for (const user of users) {
        const exists = await this.credentialRepo.findOne({ where: { userId: user.id } });
        if (!exists) await this.credentialRepo.save({ userId: user.id, username: user.id.replace('-', ''), passwordHash });
      }
      await this.repairGarbledDataIfNeeded();
      console.log('Database already initialized. Skipping seed.');
      return;
    }

    console.log('Database is empty. Seeding initial ePoints data...');

    // Seed Users
    const passwordHash = await bcrypt.hash('demo123', 12);
    const initialUsers = [
      { id: "u-2", name: "王方超", role: "运维工程师", roleType: "Admin", points_balance: 350, points_earned_lifetime: 1250, avatar: "/avatars/senior_dev.png", penalties_count: 0, points_deducted_total: 0 }
    ];
    await this.userRepo.save(initialUsers);
    await this.credentialRepo.save(initialUsers.map((user) => ({
      userId: user.id,
      username: user.id.replace('-', ''),
      passwordHash,
    })));

    // Seed Missions
    const initialMissions = [
      {
        id: "m-1",
        title: "升级企业级微服务脚手架至 React 19 / Vite 6",
        description: "全面升级基础框架，解决遗留的编译警告，优化构建时间至 5 秒以内，以提高全局研发部署响应效率。",
        base_points: 60,
        multiplier: 1.0,
        status: "Available",
        assigned_to: undefined,
        proof_of_work: "",
        category: "Development"
      },
      {
        id: "m-2",
        title: "🔥 紧急修复支付结算系统高并发接口超时问题",
        description: "在遭遇高负荷峰值时，结算接口响应超过 3 秒，需要重构 Redis 缓存锁并优化数据库查询索引，属于核心攻坚任务。",
        base_points: 100,
        multiplier: 2.0,
        status: "Available",
        assigned_to: undefined,
        proof_of_work: "",
        category: "Development"
      },
      {
        id: "m-3",
        title: "重新设计企业福利商城移动端高保真交互原型",
        description: "针对移动端操作手感优化，绘制完整的 UI 规范，包括兑换成功动效、积分余额滚动增加动效等，提升整体用户体验。",
        base_points: 50,
        multiplier: 1.2,
        status: "In Progress",
        assigned_to: "u-2",
        proof_of_work: "",
        category: "Design"
      },
      {
        id: "m-4",
        title: "编写客户数据导出模块端到端集成测试",
        description: "完成导出 Excel/PDF 文件的核心逻辑覆盖率至 90% 以上，防止多线程导出时出现内存泄漏导致节点宕机。",
        base_points: 40,
        multiplier: 1.0,
        status: "Pending Verification",
        assigned_to: "u-2",
        proof_of_work: "已完成测试用例编写，代码库 PR 链接: github.com/epoints/corp-web/pull/239。本地通过 50 轮并发压力测试，内存曲线稳定。",
        category: "QA"
      },
      {
        id: "m-5",
        title: "部署生产环境 K8s 集群双机房热备容灾",
        description: "实现容灾演练，确保当 A 机房完全断网或断电时，B 机房能在 30 秒内全量接管业务请求，保障系统全天候抗击突发故障的能力。",
        base_points: 150,
        multiplier: 1.0,
        status: "Completed",
        assigned_to: "u-2",
        proof_of_work: "双机房 Keepalived + DNS 自动切换配置完毕，断开 A 机房主路由后测试切换时长为 18.4s，符合预期。附件报告已发至 Wiki 归档。",
        category: "Operations"
      }
    ];
    await this.missionRepo.save(initialMissions);

    // Seed Rewards
    const initialRewards = [
      { id: "r-1", title: "额外 1 天带薪休假", description: "【L1起兑】经过高强度攻坚后所需的休整假，系统自动对接 HR 考勤流水注入年假。", points_cost: 500, inventory: 99, category: "Lifestyle", image: "🏖️", level_required: 1 },
      { id: "r-2", title: "中心停车服务", description: "【L1起兑】园区/中心地下停车场月度免费停放服务，行政统一核销发放。", points_cost: 400, inventory: 50, category: "Lifestyle", image: "🚗", level_required: 1 },
      { id: "r-3", title: "精品咖啡兑换券", description: "【L1起兑】极速补充能量与咖啡因，支持星巴克 / 瑞幸 / 行政前台咖啡通用核销。", points_cost: 30, inventory: 100, category: "Lifestyle", image: "☕", level_required: 1 },
      { id: "r-4", title: "高速 USB 3.2 闪存 U 盘 (128GB)", description: "【L1起兑】金属防震双接口高速读写 U 盘，办公资料传输与镜像备份必备。", points_cost: 80, inventory: 30, category: "Hardware", image: "💾", level_required: 1 },
      { id: "r-5", title: "品牌无线降噪耳机", description: "【L1起兑】主动降噪与高保真音质，沉浸式写代码与系统设计必备。", points_cost: 350, inventory: 15, category: "Hardware", image: "🎧", level_required: 1 },
      { id: "r-6", title: "百度网盘 SVIP 会员", description: "【L1起兑】超大云端存储空间与极速下载特权，团队超大文件协同分享。", points_cost: 60, inventory: 50, category: "Software", image: "☁️", level_required: 1 },
      { id: "r-7", title: "夸克网盘 SVIP 会员", description: "【L1起兑】高清视频云播、文档扫描与夸克云盘极速同步特权。", points_cost: 60, inventory: 50, category: "Software", image: "📁", level_required: 1 },
      { id: "r-8", title: "Kimi 大模型高级会员 / API 额度包", description: "【L1起兑】长文本长上下文分析、高阶大模型对话与 API 调用额度凭证。", points_cost: 100, inventory: 40, category: "Software", image: "🤖", level_required: 1 },
      { id: "r-9", title: "Antigravity AI 平台高级会员", description: "【L1起兑】Antigravity 智能体开发与自动化编程平台全功能高级订阅。", points_cost: 120, inventory: 30, category: "Software", image: "🚀", level_required: 1 },
      { id: "r-10", title: "Codex / Copilot 编程大模型会员", description: "【L1起兑】智能代码补全、函数生成与 AI 单元测试生成专属订阅。", points_cost: 150, inventory: 30, category: "Software", image: "💻", level_required: 1 },
      { id: "r-11", title: "打车出差费用报销包 (100元额度)", description: "【1eP=1元】企业出行与打车费用报销，凭打车行程单与发票按 1:1 核销 100 元额度。", points_cost: 100, inventory: 50, category: "Reimbursement", image: "🚕", level_required: 1 },
      { id: "r-12", title: "差旅住宿费用报销包 (300元额度)", description: "【1eP=1元】出差与项目攻坚住宿费用报销，凭酒店住宿发票按 1:1 核销 300 元额度。", points_cost: 300, inventory: 30, category: "Reimbursement", image: "🏨", level_required: 1 },
      { id: "r-13", title: "餐饮与加班餐费报销包 (150元额度)", description: "【1eP=1元】团队用餐与加班餐费报销，凭餐饮发票按 1:1 核销 150 元额度。", points_cost: 150, inventory: 40, category: "Reimbursement", image: "🍱", level_required: 1 },
      { id: "r-14", title: "现金折现提现包 (100eP 兑 90元现金)", description: "【9折折现】1 eP = 0.9 元人民币现金，兑换 100 eP 获得 90 元现金打款提现。", points_cost: 100, inventory: 99, category: "CashOut", image: "💵", level_required: 1 },
      { id: "r-15", title: "现金折现大额提现包 (500eP 兑 450元现金)", description: "【9折折现】1 eP = 0.9 元人民币现金，大额兑换 500 eP 获得 450 元现金打款提现。", points_cost: 500, inventory: 50, category: "CashOut", image: "💰", level_required: 1 }
    ];
    await this.rewardRepo.save(initialRewards);

    // Seed Duty
    const initialDuty = [
      { id: "d-1", user_id: "u-2", shift_start: "00:00", shift_end: "24:00", is_active: true }
    ];
    await this.dutyRepo.save(initialDuty);

    // Seed Tickets
    const initialTickets = [
      {
        id: "t-1",
        reporter_id: "u-2",
        title: "主代码仓库推送报错，提示 GPG 签名校验失败",
        description: "开发在推送代码到主分支时抛出 GPG signature verify failed 错误，阻塞了当天版本的合并发布，影响开发线。",
        severity: "High",
        assigned_to: "u-2",
        status: "Resolved",
        points_reward: 150,
        created_at: new Date(Date.now() - 12 * 3600000),
        resolved_at: new Date(Date.now() - 11.5 * 3600000),
        resolution_note: "已在 GPG 服务端重新分发并信任开发机器的公钥，解决签名阻拦错误。"
      }
    ];
    await this.ticketRepo.save(initialTickets);

    // Seed Feeds
    const initialFeeds = [
      { id: "f-1", type: "system", message: "ePoints 协同管理系统就绪，各项目组成员已接入。", timestamp: new Date(Date.now() - 10 * 3600000) },
      { id: "f-2", type: "mission", message: "王方超 成功完成了高价值任务：部署生产环境 K8s 集群双机房热备容灾，获得 1500 积分。", timestamp: new Date(Date.now() - 8 * 3600000) },
      { id: "f-3", type: "support", message: "系统自动排单：王方超 极速解决 GPG 签名报错问题，耗时 30 分钟，获得排障激励 150 积分。", timestamp: new Date(Date.now() - 11.5 * 3600000) }
    ];
    await this.feedRepo.save(initialFeeds);

    // Seed Settings
    const defaultWebhook = {
      key: 'webhook_url',
      value: ''
    };
    await this.settingRepo.save(defaultWebhook);

    console.log('Database seed completed successfully!');
  }

  private async repairGarbledDataIfNeeded() {
    const seedMissions = [
      { id: "m-1", title: "升级企业级微服务脚手架至 React 19 / Vite 6", description: "全面升级基础框架，解决遗留的编译警告，优化构建时间至 5 秒以内，以提高全局研发部署响应效率。" },
      { id: "m-2", title: "🔥 紧急修复支付结算系统高并发接口超时问题", description: "在遭遇高负荷峰值时，结算接口响应超过 3 秒，需要重构 Redis 缓存锁并优化数据库查询索引，属于核心攻坚任务。" },
      { id: "m-3", title: "重新设计企业福利商城移动端高保真交互原型", description: "针对移动端操作手感优化，绘制完整的 UI 规范，包括兑换成功动效、积分余额滚动增加动效等，提升整体用户体验。" },
      { id: "m-4", title: "编写客户数据导出模块端到端集成测试", description: "完成导出 Excel/PDF 文件的核心逻辑覆盖率至 90% 以上，防止多线程导出时出现内存泄漏导致节点宕机。", proof_of_work: "已完成测试用例编写，代码库 PR 链接: github.com/epoints/corp-web/pull/239。本地通过 50 轮并发压力测试，内存曲线稳定。" },
      { id: "m-5", title: "部署生产环境 K8s 集群双机房热备容灾", description: "实现容灾演练，确保当 A 机房完全断网或断电时，B 机房能在 30 秒内全量接管业务请求，保障系统全天候抗击突发故障的能力。", proof_of_work: "双机房 Keepalived + DNS 自动切换配置完毕，断开 A 机房主路由后测试切换时长为 18.4s，符合预期。附件报告已发至 Wiki 归档。" }
    ];

    const seedFeeds = [
      { id: "f-1", message: "ePoints 协同管理系统就绪，各项目组成员已接入。" },
      { id: "f-2", message: "王方超 成功完成了高价值任务：部署生产环境 K8s 集群双机房热备容灾，获得 1500 积分。" },
      { id: "f-3", message: "系统自动排单：王方超 极速解决 GPG 签名报错问题，耗时 30 分钟，获得排障激励 150 积分。" }
    ];

    const seedTickets = [
      { id: "t-1", title: "主代码仓库推送报错，提示 GPG 签名校验失败", description: "开发在推送代码到主分支时抛出 GPG signature verify failed 错误，阻塞了当天版本的合并发布，影响开发线。", resolution_note: "已在 GPG 服务端重新分发并信任开发机器的公钥，解决签名阻拦错误。" }
    ];

    const missions = await this.missionRepo.find();
    for (const mission of missions) {
      if (mission.title?.includes('?') || mission.description?.includes('?') || mission.proof_of_work?.includes('?')) {
        const seed = seedMissions.find((m) => m.id === mission.id);
        if (seed) {
          if (mission.title?.includes('?')) mission.title = seed.title;
          if (mission.description?.includes('?')) mission.description = seed.description;
          if (mission.proof_of_work?.includes('?') && seed.proof_of_work) mission.proof_of_work = seed.proof_of_work;
          await this.missionRepo.save(mission);
        }
      }
    }

    const feeds = await this.feedRepo.find();
    for (const feed of feeds) {
      if (feed.message?.includes('?')) {
        const seed = seedFeeds.find((f) => f.id === feed.id);
        if (seed) {
          feed.message = seed.message;
          await this.feedRepo.save(feed);
        }
      }
    }

    const tickets = await this.ticketRepo.find();
    for (const ticket of tickets) {
      if (ticket.title?.includes('?') || ticket.description?.includes('?') || ticket.resolution_note?.includes('?')) {
        const seed = seedTickets.find((t) => t.id === ticket.id);
        if (seed) {
          if (ticket.title?.includes('?')) ticket.title = seed.title;
          if (ticket.description?.includes('?')) ticket.description = seed.description;
          if (ticket.resolution_note?.includes('?') && seed.resolution_note) ticket.resolution_note = seed.resolution_note;
          await this.ticketRepo.save(ticket);
        }
      }
    }
  }
}
