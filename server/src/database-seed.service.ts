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
  ) {}

  async onApplicationBootstrap() {
    const userCount = await this.userRepo.count();
    if (userCount > 0) {
      console.log('Database already initialized. Skipping seed.');
      return;
    }

    console.log('Database is empty. Seeding initial ePoints data...');

    // Seed Users
    const initialUsers = [
      { id: "u-1", name: "张建国", role: "项目总监 (效能主管)", roleType: "Admin", points_balance: 500, points_earned_lifetime: 500, avatar: "/avatars/director.png", penalties_count: 0, points_deducted_total: 0 },
      { id: "u-2", name: "李明", role: "资深保障专家 (高级研发)", roleType: "Engineer", points_balance: 1200, points_earned_lifetime: 4800, avatar: "/avatars/senior_dev.png", penalties_count: 0, points_deducted_total: 0 },
      { id: "u-3", name: "王芳", role: "研发保障工程师 (开发工程师)", roleType: "Engineer", points_balance: 850, points_earned_lifetime: 3200, avatar: "/avatars/dev.png", penalties_count: 0, points_deducted_total: 0 },
      { id: "u-4", name: "赵勇", role: "体验设计专家 (UI/UX)", roleType: "Designer", points_balance: 400, points_earned_lifetime: 2100, avatar: "/avatars/designer.png", penalties_count: 0, points_deducted_total: 0 },
      { id: "u-5", name: "刘洋", role: "质量保障工程师 (QA测试)", roleType: "QA", points_balance: 600, points_earned_lifetime: 2800, avatar: "/avatars/qa.png", penalties_count: 0, points_deducted_total: 0 }
    ];
    await this.userRepo.save(initialUsers);

    // Seed Missions
    const initialMissions = [
      {
        id: "m-1",
        title: "升级企业级微服务脚手架至 React 19 / Vite 6",
        description: "全面升级基础框架，解决遗留的编译警告，优化构建时间至 5 秒以内，以提高全局研发部署响应效率。",
        base_points: 600,
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
        base_points: 1000,
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
        base_points: 500,
        multiplier: 1.2,
        status: "In Progress",
        assigned_to: "u-4",
        proof_of_work: "",
        category: "Design"
      },
      {
        id: "m-4",
        title: "编写客户数据导出模块端到端集成测试",
        description: "完成导出 Excel/PDF 文件的核心逻辑覆盖率至 90% 以上，防止多线程导出时出现内存泄漏导致节点宕机。",
        base_points: 400,
        multiplier: 1.0,
        status: "Pending Verification",
        assigned_to: "u-5",
        proof_of_work: "已完成测试用例编写，代码库 PR 链接: github.com/epoints/corp-web/pull/239。本地通过 50 轮并发压力测试，内存曲线稳定。",
        category: "QA"
      },
      {
        id: "m-5",
        title: "部署生产环境 K8s 集群双机房热备容灾",
        description: "实现容灾演练，确保当 A 机房完全断网或断电时，B 机房能在 30 秒内全量接管业务请求，保障系统全天候抗击突发故障的能力。",
        base_points: 1500,
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
      { id: "r-1", title: "星巴克咖啡超值电子兑换券", description: "【L1起兑】极速补充咖啡因，由行政前台即时派发电子核销码。", points_cost: 150, inventory: 99, category: "Lifestyle", image: "☕", level_required: 1 },
      { id: "r-2", title: "ePoints 联名款极客双层随行杯", description: "【L1起兑】磨砂工业质感不锈钢保温杯，专属极客身份象征。", points_cost: 250, inventory: 30, category: "Lifestyle", image: "🥤", level_required: 1 },
      { id: "r-3", title: "极客时间 30天全场通用畅听年卡", description: "【L1起兑】热门前沿IT技术、架构演进及软实力精选课程无限畅听。", points_cost: 450, inventory: 50, category: "Training", image: "🎧", level_required: 1 },
      { id: "r-4", title: "研发极速解压高能零食包", description: "【L1起兑】坚果、燕麦能量棒、高浓度纯黑巧克力下午茶解压补给箱。", points_cost: 100, inventory: 150, category: "Lifestyle", image: "🍿", level_required: 1 },
      { id: "r-5", title: "Keychron K2 双模机械键盘 (铝合金版/红轴)", description: "【L2起兑】极简无线多模键盘，手感柔和，大幅度升级长途打字生产力。", points_cost: 1200, inventory: 5, category: "Hardware", image: "⌨️", level_required: 2 },
      { id: "r-6", title: "罗技 MX Master 3S 旗舰办公鼠标", description: "【L2起兑】电磁金属滚轮，手感舒适，完美适配程序员的多屏多任务操作。", points_cost: 1800, inventory: 6, category: "Hardware", image: "🖱️", level_required: 2 },
      { id: "r-7", title: "Figma 专业版个人年度订阅许可", description: "【L2起兑】设计师专属，解锁无限个人及协同团队协作空间权限。", points_cost: 1000, inventory: 10, category: "Software", image: "🎨", level_required: 2 },
      { id: "r-8", title: "额外 1 天带薪休假 (系统自动注入年假)", description: "【L2起兑】经过高强度攻坚后所需的整理休假，系统自动对接考勤流水。", points_cost: 800, inventory: 99, category: "Lifestyle", image: "🏖️", level_required: 2 },
      { id: "r-9", title: "JetBrains 全家桶 / 任意单品个人年度兑换码", description: "【L2起兑】包含 IntelliJ IDEA, WebStorm, GoLand 等主流开发利器年卡订阅。", points_cost: 2200, inventory: 15, category: "Software", image: "💻", level_required: 2 },
      { id: "r-10", title: "戴尔 UltraSharp 27英寸 4K 护眼显示器", description: "【L3起兑】Type-C 一线直连，极致高清色彩，完美呈现每一行代码与像素细节。", points_cost: 3500, inventory: 3, category: "Hardware", image: "🖥️", level_required: 3 },
      { id: "r-11", title: "索尼 WH-1000XM5 头戴式智能无线降噪耳机", description: "【L3起兑】顶级主动降噪与佩戴感，给您沉浸在写代码和系统设计中的极致宁静。", points_cost: 4800, inventory: 4, category: "Hardware", image: "🎧", level_required: 3 },
      { id: "r-12", title: "AWS / GCP / K8s (CKA) 顶级专业认证考试报名券", description: "【L3起兑】官方专业工程师与架构师报考费用全额报销凭证卡。", points_cost: 3000, inventory: 20, category: "Training", image: "📜", level_required: 3 },
      { id: "r-13", title: "研发小组高级聚餐能量能量基金", description: "【L3起兑】包含精品双人或多人餐、下午茶豪华蛋糕组，为团队提气暖心。", points_cost: 1500, inventory: 8, category: "Lifestyle", image: "🍕", level_required: 3 },
      { id: "r-14", title: "赫曼米勒 Herman Miller Aeron 人体工学办公椅", description: "【L4起兑】腰背健康终极守护方案，硅谷极客大厂标配，极致包裹支撑感。", points_cost: 12000, inventory: 2, category: "Hardware", image: "💺", level_required: 4 },
      { id: "r-15", title: "行政级年度海外自由行定制赞助基金", description: "【L5起兑】海外带薪休假计划，公司全额赞助往返机票与五星酒店住宿额度。", points_cost: 20000, inventory: 2, category: "Lifestyle", image: "✈️", level_required: 5 },
      { id: "r-16", title: "Apple MacBook Pro 16寸 (M3 Max / 64G / 2T)", description: "【L5起兑】极致生产力王牌资产！企业免除折旧回收特权，终身归属于您个人所有。", points_cost: 35000, inventory: 1, category: "Hardware", image: "💻", level_required: 5 }
    ];
    await this.rewardRepo.save(initialRewards);

    // Seed Duty
    const initialDuty = [
      { id: "d-1", user_id: "u-2", shift_start: "09:00", shift_end: "18:00", is_active: true },
      { id: "d-2", user_id: "u-3", shift_start: "18:00", shift_end: "09:00", is_active: false }
    ];
    await this.dutyRepo.save(initialDuty);

    // Seed Tickets
    const initialTickets = [
      {
        id: "t-1",
        reporter_id: "u-4",
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
      { id: "f-2", type: "mission", message: "李明 成功完成了高价值任务：部署生产环境 K8s 集群双机房热备容灾，获得 1500 积分。", timestamp: new Date(Date.now() - 8 * 3600000) },
      { id: "f-3", type: "support", message: "系统自动排单：李明 极速解决 GPG 签名报错问题，耗时 30 分钟，获得排障激励 150 积分。", timestamp: new Date(Date.now() - 11.5 * 3600000) }
    ];
    await this.feedRepo.save(initialFeeds);

    // Seed Settings
    const defaultWebhook = {
      key: 'webhook_url',
      value: 'https://open.feishu.cn/open-apis/bot/v2/hook/mock-webhook-url-xyz'
    };
    await this.settingRepo.save(defaultWebhook);

    console.log('Database seed completed successfully!');
  }
}
