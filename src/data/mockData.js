// mockData.js - 本地存储数据层与核心业务逻辑模拟

const INITIAL_USERS = [
  { id: "u-1", name: "张建国", role: "项目总监 (效能主管)", roleType: "Admin", points_balance: 500, points_earned_lifetime: 500, avatar: "/avatars/director.png" },
  { id: "u-2", name: "李明", role: "资深保障专家 (高级研发)", roleType: "Engineer", points_balance: 1200, points_earned_lifetime: 4800, avatar: "/avatars/senior_dev.png" },
  { id: "u-3", name: "王芳", role: "研发保障工程师 (开发工程师)", roleType: "Engineer", points_balance: 850, points_earned_lifetime: 3200, avatar: "/avatars/dev.png" },
  { id: "u-4", name: "赵勇", role: "体验设计专家 (UI/UX)", roleType: "Designer", points_balance: 400, points_earned_lifetime: 2100, avatar: "/avatars/designer.png" },
  { id: "u-5", name: "刘洋", role: "质量保障工程师 (QA测试)", roleType: "QA", points_balance: 600, points_earned_lifetime: 2800, avatar: "/avatars/qa.png" }
];

const INITIAL_MISSIONS = [
  {
    id: "m-1",
    title: "升级企业级微服务脚手架至 React 19 / Vite 6",
    description: "全面升级基础框架，解决遗留的编译警告，优化构建时间至 5 秒以内，以提高全局研发部署响应效率。",
    base_points: 600,
    multiplier: 1.0,
    status: "Available",
    assigned_to: null,
    proof_of_work: "",
    category: "Development",
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString()
  },
  {
    id: "m-2",
    title: "🔥 紧急修复支付结算系统高并发接口超时问题",
    description: "在遭遇高负荷峰值时，结算接口响应超过 3 秒，需要重构 Redis 缓存锁并优化数据库查询索引，属于核心攻坚任务。",
    base_points: 1000,
    multiplier: 2.0,
    status: "Available",
    assigned_to: null,
    proof_of_work: "",
    category: "Development",
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString()
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
    category: "Design",
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString()
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
    category: "QA",
    createdAt: new Date(Date.now() - 36 * 3600000).toISOString()
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
    category: "Operations",
    createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
    completedAt: new Date(Date.now() - 8 * 3600000).toISOString()
  }
];

const INITIAL_REWARDS = [
  // L1级福利 (0-1999 eP)
  { id: "r-1", title: "星巴克咖啡超值电子兑换券", description: "【L1起兑】极速补充咖啡因，由行政前台即时派发电子核销码。", cost: 150, stock: 99, category: "Lifestyle", image: "☕" },
  { id: "r-2", title: "ePoints 联名款极客双层随行杯", description: "【L1起兑】磨砂工业质感不锈钢保温杯，专属极客身份象征。", cost: 250, stock: 30, category: "Lifestyle", image: "🥤" },
  { id: "r-3", title: "极客时间 30天全场通用畅听年卡", description: "【L1起兑】热门前沿IT技术、架构演进及软实力精选课程无限畅听。", cost: 450, stock: 50, category: "Training", image: "🎧" },
  { id: "r-4", title: "研发极速解压高能零食包", description: "【L1起兑】坚果、燕麦能量棒、高浓度纯黑巧克力下午茶解压补给箱。", cost: 100, stock: 150, category: "Lifestyle", image: "🍿" },

  // L2级福利 (2000-4999 eP)
  { id: "r-5", title: "Keychron K2 双模机械键盘 (铝合金版/红轴)", description: "【L2起兑】极简无线多模键盘，手感柔和，大幅度升级长途打字生产力。", cost: 1200, stock: 5, category: "Hardware", image: "⌨️" },
  { id: "r-6", title: "罗技 MX Master 3S 旗舰办公鼠标", description: "【L2起兑】电磁金属滚轮，手感舒适，完美适配程序员的多屏多任务操作。", cost: 1800, stock: 6, category: "Hardware", image: "🖱️" },
  { id: "r-7", title: "Figma 专业版个人年度订阅许可", description: "【L2起兑】设计师专属，解锁无限个人及协同团队协作空间权限。", cost: 1000, stock: 10, category: "Software", image: "🎨" },
  { id: "r-8", title: "额外 1 天带薪休假 (系统自动注入年假)", description: "【L2起兑】经过高强度攻坚后所需的整理休假，系统自动对接考勤流水。", cost: 800, stock: 99, category: "Lifestyle", image: "🏖️" },
  { id: "r-9", title: "JetBrains 全家桶 / 任意单品个人年度兑换码", description: "【L2起兑】包含 IntelliJ IDEA, WebStorm, GoLand 等主流开发利器年卡订阅。", cost: 2200, stock: 15, category: "Software", image: "💻" },

  // L3级福利 (5000-9999 eP)
  { id: "r-10", title: "戴尔 UltraSharp 27英寸 4K 护眼显示器", description: "【L3起兑】Type-C 一线直连，极致高清色彩，完美呈现每一行代码与像素细节。", cost: 3500, stock: 3, category: "Hardware", image: "🖥️" },
  { id: "r-11", title: "索尼 WH-1000XM5 头戴式智能无线降噪耳机", description: "【L3起兑】顶级主动降噪与佩戴感，给您沉浸在写代码和系统设计中的极致宁静。", cost: 4800, stock: 4, category: "Hardware", image: "🎧" },
  { id: "r-12", title: "AWS / GCP / K8s (CKA) 顶级专业认证考试报名券", description: "【L3起兑】官方专业工程师与架构师报考费用全额报销凭证卡。", cost: 3000, stock: 20, category: "Training", image: "📜" },
  { id: "r-13", title: "研发小组高级聚餐能量能量基金", description: "【L3起兑】包含精品双人或多人餐、下午茶豪华蛋糕组，为团队提气暖心。", cost: 1500, stock: 8, category: "Lifestyle", image: "🍕" },

  // L4-L5级福利 (10000+ eP)
  { id: "r-14", title: "赫曼米勒 Herman Miller Aeron 人体工学办公椅", description: "【L4起兑】腰背健康终极守护方案，硅谷极客大厂标配，极致包裹支撑感。", cost: 12000, stock: 2, category: "Hardware", image: "💺" },
  { id: "r-15", title: "行政级年度海外自由行定制赞助基金", description: "【L5起兑】海外带薪休假计划，公司全额赞助往返机票与五星酒店住宿额度。", cost: 20000, stock: 2, category: "Lifestyle", image: "✈️" },
  { id: "r-16", title: "Apple MacBook Pro 16寸 (M3 Max / 64G / 2T)", description: "【L5起兑】极致生产力王牌资产！企业免除折旧回收特权，终身归属于您个人所有。", cost: 35000, stock: 1, category: "Hardware", image: "💻" }
];

const INITIAL_DUTY = [
  { id: "d-1", user_id: "u-2", shift_start: "09:00", shift_end: "18:00", is_active: true },
  { id: "d-2", user_id: "u-3", shift_start: "18:00", shift_end: "09:00", is_active: false }
];

const INITIAL_TICKETS = [
  {
    id: "t-1",
    reporter_id: "u-4",
    title: "主代码仓库推送报错，提示 GPG 签名校验失败",
    description: "开发在推送代码到主分支时抛出 GPG signature verify failed 错误，阻塞了当天版本的合并发布，影响开发线。",
    severity: "High",
    assigned_to: "u-2",
    status: "Resolved",
    points_reward: 150,
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    resolved_at: new Date(Date.now() - 11.5 * 3600000).toISOString()
  }
];

const INITIAL_FEED = [
  { id: "f-1", type: "system", message: "ePoints 协同管理系统就绪，各项目组成员已接入。", timestamp: new Date(Date.now() - 10 * 3600000).toISOString() },
  { id: "f-2", type: "mission", message: "李明 成功完成了高价值任务：部署生产环境 K8s 集群双机房热备容灾，获得 1500 积分。", timestamp: new Date(Date.now() - 8 * 3600000).toISOString() },
  { id: "f-3", type: "support", message: "系统自动排单：李明 极速解决 GPG 签名报错问题，耗时 30 分钟，获得排障激励 150 积分。", timestamp: new Date(Date.now() - 11.5 * 3600000).toISOString() }
];

// 初始化 LocalStorage 数据并自动清除包含旧名字、旧图片或旧版福利的缓存记录
export const initData = () => {
  const existingUsers = localStorage.getItem("ep_users");
  const existingRewards = localStorage.getItem("ep_rewards");
  if (
    (existingUsers && (existingUsers.includes("谢尔盖") || existingUsers.includes("unsplash.com"))) ||
    (existingRewards && !existingRewards.includes("r-16"))
  ) {
    localStorage.removeItem("ep_users");
    localStorage.removeItem("ep_missions");
    localStorage.removeItem("ep_rewards");
    localStorage.removeItem("ep_duty");
    localStorage.removeItem("ep_tickets");
    localStorage.removeItem("ep_feed");
    localStorage.removeItem("ep_current_user_id");
    localStorage.removeItem("ep_transactions");
  }

  if (!localStorage.getItem("ep_users")) localStorage.setItem("ep_users", JSON.stringify(INITIAL_USERS));
  if (!localStorage.getItem("ep_missions")) localStorage.setItem("ep_missions", JSON.stringify(INITIAL_MISSIONS));
  if (!localStorage.getItem("ep_rewards")) localStorage.setItem("ep_rewards", JSON.stringify(INITIAL_REWARDS));
  if (!localStorage.getItem("ep_duty")) localStorage.setItem("ep_duty", JSON.stringify(INITIAL_DUTY));
  if (!localStorage.getItem("ep_tickets")) localStorage.setItem("ep_tickets", JSON.stringify(INITIAL_TICKETS));
  if (!localStorage.getItem("ep_feed")) localStorage.setItem("ep_feed", JSON.stringify(INITIAL_FEED));
  if (!localStorage.getItem("ep_current_user_id")) localStorage.setItem("ep_current_user_id", "u-2"); // 默认是李明
};

// 获取所有实体数据
export const getAppState = () => {
  initData();
  return {
    users: JSON.parse(localStorage.getItem("ep_users")),
    missions: JSON.parse(localStorage.getItem("ep_missions")),
    rewards: JSON.parse(localStorage.getItem("ep_rewards")),
    duty: JSON.parse(localStorage.getItem("ep_duty")),
    tickets: JSON.parse(localStorage.getItem("ep_tickets")),
    feed: JSON.parse(localStorage.getItem("ep_feed")),
    currentUserId: localStorage.getItem("ep_current_user_id")
  };
};

// 状态保存助手
const saveState = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// 重置数据
export const resetAppState = () => {
  localStorage.removeItem("ep_users");
  localStorage.removeItem("ep_missions");
  localStorage.removeItem("ep_rewards");
  localStorage.removeItem("ep_duty");
  localStorage.removeItem("ep_tickets");
  localStorage.removeItem("ep_feed");
  localStorage.removeItem("ep_current_user_id");
  return getAppState();
};

// 切换当前用户
export const setCurrentUser = (userId) => {
  localStorage.setItem("ep_current_user_id", userId);
  return getAppState();
};

// 添加一条动态流
const pushFeed = (type, message) => {
  const feeds = JSON.parse(localStorage.getItem("ep_feed")) || [];
  const newFeed = {
    id: `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type,
    message,
    timestamp: new Date().toISOString()
  };
  feeds.unshift(newFeed);
  saveState("ep_feed", feeds.slice(0, 30)); // 仅保存最近 30 条
};

// 认领任务
export const claimMission = (missionId, userId) => {
  const state = getAppState();
  const missions = state.missions.map(m => {
    if (m.id === missionId && m.status === "Available") {
      const user = state.users.find(u => u.id === userId);
      pushFeed("mission", `${user.name} 领受了任务：${m.title}`);
      return { ...m, status: "In Progress", assigned_to: userId };
    }
    return m;
  });
  saveState("ep_missions", missions);
  return getAppState();
};

// 提交工作证明（待验证）
export const submitProof = (missionId, proofText) => {
  const state = getAppState();
  const missions = state.missions.map(m => {
    if (m.id === missionId && m.status === "In Progress") {
      const user = state.users.find(u => u.id === m.assigned_to);
      pushFeed("mission", `${user.name} 提交了任务【${m.title}】的成果证明，等待项目总监核实。`);
      return { ...m, status: "Pending Verification", proof_of_work: proofText };
    }
    return m;
  });
  saveState("ep_missions", missions);
  return getAppState();
};

// 项目总监审核任务并拨付积分
export const verifyMission = (missionId, isApproved) => {
  const state = getAppState();
  let pointsReward = 0;
  let earnerId = null;
  let missionTitle = "";

  const missions = state.missions.map(m => {
    if (m.id === missionId && m.status === "Pending Verification") {
      missionTitle = m.title;
      earnerId = m.assigned_to;
      if (isApproved) {
        pointsReward = Math.round(m.base_points * m.multiplier);
        return { ...m, status: "Completed", completedAt: new Date().toISOString() };
      } else {
        // 被拒，退回进行中
        return { ...m, status: "In Progress", proof_of_work: "" };
      }
    }
    return m;
  });

  if (isApproved && earnerId) {
    const users = state.users.map(u => {
      if (u.id === earnerId) {
        pushFeed("system", `【成果核实成功】${u.name} 完成任务【${missionTitle}】，拨付积分 ${pointsReward} ePoints。`);
        return {
          ...u,
          points_balance: u.points_balance + pointsReward,
          points_earned_lifetime: u.points_earned_lifetime + pointsReward
        };
      }
      return u;
    });
    saveState("ep_users", users);
  } else if (!isApproved && earnerId) {
    const user = state.users.find(u => u.id === earnerId);
    pushFeed("system", `【核实驳回】项目总监退回了 ${user.name} 提交的任务【${missionTitle}】证明，请补充细节。`);
  }

  saveState("ep_missions", missions);
  return getAppState();
};

// 动态调整倍率
export const updateMultiplier = (missionId, newMultiplier) => {
  const state = getAppState();
  let mTitle = "";
  const missions = state.missions.map(m => {
    if (m.id === missionId) {
      mTitle = m.title;
      return { ...m, multiplier: parseFloat(newMultiplier) };
    }
    return m;
  });
  pushFeed("system", `【倍率调控】主管调整任务【${mTitle}】的倍率至 ${newMultiplier}x。`);
  saveState("ep_missions", missions);
  return getAppState();
};

// 创建新任务
export const createMission = (missionData) => {
  const state = getAppState();
  const newMission = {
    id: `m-${Date.now()}`,
    title: missionData.title,
    description: missionData.description,
    base_points: parseInt(missionData.base_points) || 100,
    multiplier: parseFloat(missionData.multiplier) || 1.0,
    status: "Available",
    assigned_to: null,
    proof_of_work: "",
    category: missionData.category || "Development",
    createdAt: new Date().toISOString()
  };
  state.missions.unshift(newMission);
  pushFeed("mission", `发布新项目任务：${newMission.title} (基础分: ${newMission.base_points} ePoints)`);
  saveState("ep_missions", state.missions);
  return getAppState();
};

// 商城兑换商品
export const purchaseReward = (rewardId, userId) => {
  const state = getAppState();
  const user = state.users.find(u => u.id === userId);
  const reward = state.rewards.find(r => r.id === rewardId);

  if (!user || !reward) return { error: "用户或商品不存在" };
  if (user.points_balance < reward.cost) return { error: "您的效能积分不足，请加紧工作赚取积分" };
  if (reward.stock <= 0) return { error: "商品库存告罄，行政部门正在补充货源中" };

  // 扣减积分与库存
  const updatedUsers = state.users.map(u => {
    if (u.id === userId) {
      return { ...u, points_balance: u.points_balance - reward.cost };
    }
    return u;
  });

  const updatedRewards = state.rewards.map(r => {
    if (r.id === rewardId) {
      return { ...r, stock: r.stock - 1 };
    }
    return r;
  });

  // 创建交易
  const newTx = {
    id: `t-${Date.now()}`,
    user_id: userId,
    reward_id: rewardId,
    points_spent: reward.cost,
    timestamp: new Date().toISOString(),
    status: "Pending Delivery"
  };

  const transactions = JSON.parse(localStorage.getItem("ep_transactions")) || [];
  transactions.unshift(newTx);
  localStorage.setItem("ep_transactions", JSON.stringify(transactions));

  pushFeed("shop", `${user.name} 消耗 ${reward.cost} 积分，兑换了：${reward.title}。`);

  saveState("ep_users", updatedUsers);
  saveState("ep_rewards", updatedRewards);

  return getAppState();
};

// 获取历史交易记录
export const getTransactions = () => {
  return JSON.parse(localStorage.getItem("ep_transactions")) || [];
};

// 确认发放福利
export const deliverReward = (txId) => {
  const transactions = JSON.parse(localStorage.getItem("ep_transactions")) || [];
  const state = getAppState();
  let user_name = "";
  let reward_title = "";

  const updatedTxs = transactions.map(tx => {
    if (tx.id === txId) {
      const user = state.users.find(u => u.id === tx.user_id);
      const reward = state.rewards.find(r => r.id === tx.reward_id);
      user_name = user ? user.name : "未知用户";
      reward_title = reward ? reward.title : "未知商品";
      return { ...tx, status: "Delivered" };
    }
    return tx;
  });

  localStorage.setItem("ep_transactions", JSON.stringify(updatedTxs));
  pushFeed("system", `【福利发放】已向 ${user_name} 交付了兑换的福利：${reward_title}。`);
  return getAppState();
};

// 一键上报红警警报/售后工单
export const raiseAlert = (ticketData) => {
  const state = getAppState();
  const reporter = state.users.find(u => u.id === ticketData.reporter_id);

  // 寻找当前活动的值班保障人员
  const activeDuty = state.duty.find(d => d.is_active);
  const assigneeId = activeDuty ? activeDuty.user_id : "u-2"; // 兜底给李明

  // 红色警报赋予高额排障基准积分，高优和紧急工单也提供积分
  let pointsReward = 100;
  if (ticketData.severity === "Critical") pointsReward = 300;
  else if (ticketData.severity === "High") pointsReward = 200;
  else if (ticketData.severity === "Medium") pointsReward = 100;

  const newTicket = {
    id: `t-${Date.now()}`,
    reporter_id: ticketData.reporter_id,
    title: ticketData.title,
    description: ticketData.description,
    severity: ticketData.severity,
    assigned_to: assigneeId,
    status: "Open",
    points_reward: pointsReward,
    created_at: new Date().toISOString(),
    resolved_at: null
  };

  const assigneeUser = state.users.find(u => u.id === assigneeId);

  state.tickets.unshift(newTicket);
  saveState("ep_tickets", state.tickets);

  const alertLevelText = ticketData.severity === "Critical" ? "🚨【红色警报】" : "⚠️【系统故障申报】";
  pushFeed("support", `${alertLevelText}${reporter.name} 申报紧急故障：${ticketData.title}。已自动分派给在岗值班员：${assigneeUser.name}！`);

  return { state: getAppState(), newTicketId: newTicket.id };
};

// 解决工单，计算极速修复加分并下发
export const resolveTicket = (ticketId, resolutionNote) => {
  const state = getAppState();
  let pointsEarned = 0;
  let resolverId = null;
  let ticketTitle = "";

  const tickets = state.tickets.map(t => {
    if (t.id === ticketId && t.status !== "Resolved") {
      ticketTitle = t.title;
      resolverId = t.assigned_to;
      const created = new Date(t.created_at).getTime();
      const now = Date.now();
      const elapsedMinutes = (now - created) / 60000;

      // 极速排障算法：如果是在 10 分钟内解决，积分获得 1.5 倍加成，30 分钟内 1.2 倍加成，超过 2 小时衰减至 0.8 倍
      let multiplier = 1.0;
      if (elapsedMinutes <= 10) multiplier = 1.5;
      else if (elapsedMinutes <= 30) multiplier = 1.2;
      else if (elapsedMinutes > 120) multiplier = 0.8;

      pointsEarned = Math.round(t.points_reward * multiplier);

      return {
        ...t,
        status: "Resolved",
        resolved_at: new Date().toISOString(),
        resolution_note: resolutionNote,
        points_earned_actual: pointsEarned
      };
    }
    return t;
  });

  if (resolverId && pointsEarned > 0) {
    const resolver = state.users.find(u => u.id === resolverId);
    const users = state.users.map(u => {
      if (u.id === resolverId) {
        return {
          ...u,
          points_balance: u.points_balance + pointsEarned,
          points_earned_lifetime: u.points_earned_lifetime + pointsEarned
        };
      }
      return u;
    });
    saveState("ep_users", users);
    pushFeed("support", `✅【故障排除】值班员 ${resolver.name} 成功修复了故障：${ticketTitle}。快速排障，结算积分奖赏 ${pointsEarned} ePoints。`);
  }

  saveState("ep_tickets", tickets);
  return getAppState();
};

// 切换保障值班人
export const setActiveDuty = (dutyId) => {
  const state = getAppState();
  let onDutyName = "";
  const updatedDuty = state.duty.map(d => {
    if (d.id === dutyId) {
      const user = state.users.find(u => u.id === d.user_id);
      onDutyName = user.name;
      return { ...d, is_active: true };
    }
    return { ...d, is_active: false };
  });

  pushFeed("system", `【值班交接】技术保障中心完成交接班，当前在岗技术值班员：${onDutyName}。`);
  saveState("ep_duty", updatedDuty);
  return getAppState();
};
