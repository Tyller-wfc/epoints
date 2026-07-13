import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Mission } from './entities/mission.entity';
import { Reward } from './entities/reward.entity';
import { Transaction } from './entities/transaction.entity';
import { Ticket } from './entities/ticket.entity';
import { Duty } from './entities/duty.entity';
import { Feed } from './entities/feed.entity';
import { Setting } from './entities/setting.entity';
import { DatabaseSeedService } from './database-seed.service';

@Injectable()
export class EpointsService {
  private currentUserId = 'u-2'; // Default is Li Ming

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Mission) private readonly missionRepo: Repository<Mission>,
    @InjectRepository(Reward) private readonly rewardRepo: Repository<Reward>,
    @InjectRepository(Transaction) private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Duty) private readonly dutyRepo: Repository<Duty>,
    @InjectRepository(Feed) private readonly feedRepo: Repository<Feed>,
    @InjectRepository(Setting) private readonly settingRepo: Repository<Setting>,
  ) {}

  async getAppState() {
    const users = await this.userRepo.find();
    const missions = await this.missionRepo.find();
    const rewards = await this.rewardRepo.find();
    const duty = await this.dutyRepo.find();
    const tickets = await this.ticketRepo.find();
    const feed = await this.feedRepo.find({ order: { timestamp: 'DESC' } });
    
    const webhookSetting = await this.settingRepo.findOne({ where: { key: 'webhook_url' } });
    const webhookUrl = webhookSetting ? webhookSetting.value : '';

    return {
      users,
      missions,
      rewards,
      duty,
      tickets,
      feed,
      currentUserId: this.currentUserId,
      webhookUrl,
    };
  }

  async setCurrentUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    this.currentUserId = userId;
    return this.getAppState();
  }

  async pushFeed(type: string, message: string) {
    const feed = new Feed();
    feed.id = `f-${Date.now()}`;
    feed.type = type;
    feed.message = message;
    feed.timestamp = new Date();
    await this.feedRepo.save(feed);
  }

  async claimMission(missionId: string, userId: string) {
    const mission = await this.missionRepo.findOne({ where: { id: missionId } });
    if (!mission) throw new NotFoundException('Mission not found');
    if (mission.status !== 'Available') throw new BadRequestException('Mission is not available');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    mission.status = 'In Progress';
    mission.assigned_to = userId;
    await this.missionRepo.save(mission);

    await this.pushFeed('mission', `${user.name} 认领了开发任务：${mission.title}。`);
    return this.getAppState();
  }

  async submitProof(missionId: string, proofText: string) {
    const mission = await this.missionRepo.findOne({ where: { id: missionId } });
    if (!mission) throw new NotFoundException('Mission not found');
    if (mission.status !== 'In Progress') throw new BadRequestException('Mission is not in progress');

    const user = await this.userRepo.findOne({ where: { id: mission.assigned_to } });
    const userName = user ? user.name : '未知人员';

    mission.status = 'Pending Verification';
    mission.proof_of_work = proofText;
    await this.missionRepo.save(mission);

    await this.pushFeed('mission', `${userName} 提交了开发任务【${mission.title}】的交付成果，待主管核实。`);
    return this.getAppState();
  }

  async penalizeUser(userId: string, points: number, reason: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;

    user.points_balance = Math.max(0, user.points_balance - points);
    user.penalties_count += 1;
    user.points_deducted_total += points;
    await this.userRepo.save(user);

    await this.pushFeed('support', `🚨【效能问责】针对【${user.name}】进行违规扣分处罚：${reason}，扣减 ${points} eP。`);
  }

  async verifyMission(missionId: string, isApproved: boolean, penalize = false) {
    const mission = await this.missionRepo.findOne({ where: { id: missionId } });
    if (!mission) throw new NotFoundException('Mission not found');
    if (mission.status !== 'Pending Verification') throw new BadRequestException('Mission is not pending verification');

    const earner = await this.userRepo.findOne({ where: { id: mission.assigned_to } });
    if (!earner) throw new NotFoundException('Assignee not found');

    const verifier = await this.userRepo.findOne({ where: { id: this.currentUserId } });
    const verifierName = verifier ? verifier.name : '主管';

    if (isApproved) {
      const awardPoints = Math.round(mission.base_points * mission.multiplier);
      earner.points_balance += awardPoints;
      earner.points_earned_lifetime += awardPoints;
      await this.userRepo.save(earner);

      mission.status = 'Completed';
      await this.missionRepo.save(mission);

      await this.pushFeed('mission', `✅【成果批复】主管 ${verifierName} 审核通过了 ${earner.name} 提交的【${mission.title}】。发放积分 ${awardPoints} eP！`);
    } else {
      mission.status = 'Available';
      mission.proof_of_work = '';
      await this.missionRepo.save(mission);

      await this.pushFeed('mission', `❌【成果驳回】主管 ${verifierName} 驳回了 ${earner.name} 提交的【${mission.title}】交付成果，任务退回看板。`);

      if (penalize) {
        await this.penalizeUser(earner.id, 50, `虚报【${mission.title}】的交付成果/进度灌水`);
      }
    }

    return this.getAppState();
  }

  async updateMultiplier(missionId: string, newMultiplier: number) {
    const mission = await this.missionRepo.findOne({ where: { id: missionId } });
    if (!mission) throw new NotFoundException('Mission not found');

    mission.multiplier = newMultiplier;
    await this.missionRepo.save(mission);

    const user = await this.userRepo.findOne({ where: { id: this.currentUserId } });
    const userName = user ? user.name : '主管';

    await this.pushFeed('system', `【战略倍率】主管 ${userName} 将任务【${mission.title}】战略奖励倍率调整为 ${newMultiplier.toFixed(1)}x。`);
    return this.getAppState();
  }

  async createMission(missionData: any) {
    const mission = new Mission();
    mission.id = `m-${Date.now()}`;
    mission.title = missionData.title;
    mission.description = missionData.description;
    mission.base_points = Number(missionData.base_points);
    mission.multiplier = Number(missionData.multiplier || 1.0);
    mission.category = missionData.category;
    mission.status = 'Available';
    await this.missionRepo.save(mission);

    const user = await this.userRepo.findOne({ where: { id: this.currentUserId } });
    const userName = user ? user.name : '主管';

    await this.pushFeed('system', `【任务发布】主管 ${userName} 发布了新战术任务：${missionData.title}，基础分 ${missionData.base_points} eP。`);
    return this.getAppState();
  }

  async purchaseReward(rewardId: string, userId: string) {
    const reward = await this.rewardRepo.findOne({ where: { id: rewardId } });
    if (!reward) throw new NotFoundException('Reward not found');
    if (reward.inventory <= 0) throw new BadRequestException('Out of stock');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.points_balance < reward.points_cost) {
      throw new BadRequestException('Insufficient points');
    }

    // Deduct points and stock
    user.points_balance -= reward.points_cost;
    await this.userRepo.save(user);

    reward.inventory -= 1;
    await this.rewardRepo.save(reward);

    // Save transaction
    const tx = new Transaction();
    tx.id = `tx-${Date.now()}`;
    tx.user_id = userId;
    tx.reward_id = rewardId;
    tx.points_spent = reward.points_cost;
    tx.status = 'Pending Delivery';
    tx.created_at = new Date();
    await this.transactionRepo.save(tx);

    await this.pushFeed('system', `🛒【商城兑换】${user.name} 申请兑换福利礼品：${reward.title}，消耗 ${reward.points_cost} eP。`);
    return this.getAppState();
  }

  async getTransactions() {
    return this.transactionRepo.find({ order: { created_at: 'DESC' } });
  }

  async deliverReward(txId: string) {
    const tx = await this.transactionRepo.findOne({ where: { id: txId } });
    if (!tx) throw new NotFoundException('Transaction not found');

    tx.status = 'Delivered';
    await this.transactionRepo.save(tx);

    const user = await this.userRepo.findOne({ where: { id: tx.user_id } });
    const reward = await this.rewardRepo.findOne({ where: { id: tx.reward_id } });
    const userName = user ? user.name : '未知人员';
    const rewardTitle = reward ? reward.title : '未知商品';

    await this.pushFeed('system', `【福利发放】已向 ${userName} 交付了兑换的福利：${rewardTitle}。`);
    return this.getAppState();
  }

  async raiseAlert(ticketData: any) {
    const reporter = await this.userRepo.findOne({ where: { id: ticketData.reporter_id } });
    if (!reporter) throw new NotFoundException('Reporter not found');

    const activeDuty = await this.dutyRepo.findOne({ where: { is_active: true } });
    const assigneeId = activeDuty ? activeDuty.user_id : 'u-2';

    let pointsReward = 100;
    if (ticketData.severity === 'Critical') pointsReward = 300;
    else if (ticketData.severity === 'High') pointsReward = 200;
    else if (ticketData.severity === 'Medium') pointsReward = 100;

    const ticket = new Ticket();
    ticket.id = `t-${Date.now()}`;
    ticket.reporter_id = ticketData.reporter_id;
    ticket.title = ticketData.title;
    ticket.description = ticketData.description;
    ticket.severity = ticketData.severity;
    ticket.assigned_to = assigneeId;
    ticket.status = 'Open';
    ticket.points_reward = pointsReward;
    ticket.created_at = new Date();
    await this.ticketRepo.save(ticket);

    const assigneeUser = await this.userRepo.findOne({ where: { id: assigneeId } });
    const assigneeName = assigneeUser ? assigneeUser.name : '王方超';

    const alertLevelText = ticketData.severity === 'Critical' ? '🚨【红色警报】' : '⚠️【系统故障申报】';
    await this.pushFeed('support', `${alertLevelText}${reporter.name} 申报紧急故障：${ticketData.title}。已自动分派给在岗值班员：${assigneeName}！`);

    // Webhook Notification Push
    const webhookSetting = await this.settingRepo.findOne({ where: { key: 'webhook_url' } });
    if (webhookSetting && webhookSetting.value.startsWith('http') && !webhookSetting.value.includes('mock-webhook-url')) {
      (async () => {
        try {
          const payload = {
            msg_type: 'post',
            content: {
              post: {
                zh_cn: {
                  title: `🚨 ePoints 紧急故障警报 (${ticketData.severity}级)`,
                  content: [
                    [{ tag: 'text', text: `故障标题: ${ticketData.title}\n` }],
                    [{ tag: 'text', text: `负责人: ${assigneeName}\n` }],
                    [{ tag: 'text', text: `系统描述: ${ticketData.description}\n` }],
                    [{ tag: 'text', text: '请值班员在 10 分钟内确认接单响应，避免超时扣分处罚！' }]
                  ]
                }
              }
            }
          };
          const genericPayload = {
            msgtype: 'markdown',
            markdown: {
              content: `### 🚨 ePoints 紧急故障警报 (${ticketData.severity}级)\n> **故障标题**: ${ticketData.title}\n> **负责人**: ${assigneeName}\n> **描述**: ${ticketData.description}\n\n请值班员在 10 分钟内确认接单响应，避免超时扣减 100 eP 处罚！`
            }
          };

          await fetch(webhookSetting.value, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookSetting.value.includes('feishu') ? payload : genericPayload),
            mode: 'no-cors'
          });
        } catch (err) {
          console.error('Webhook push failed:', err);
        }
      })();
    }

    return this.getAppState();
  }

  async acknowledgeTicket(ticketId: string, userId: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket || ticket.status !== 'Open') return this.getAppState();

    let quickAckReward = 0;
    const created = new Date(ticket.created_at).getTime();
    const acknowledgedAt = new Date();
    const elapsedMinutes = (acknowledgedAt.getTime() - created) / 60000;

    if (elapsedMinutes <= 10) {
      quickAckReward = 50;
    }

    ticket.status = 'Acknowledged';
    ticket.acknowledged_at = acknowledgedAt;
    ticket.mtta_minutes = Math.round(elapsedMinutes);
    ticket.quick_ack_rewarded = quickAckReward;
    await this.ticketRepo.save(ticket);

    const user = await this.userRepo.findOne({ where: { id: ticket.assigned_to } });
    if (user && quickAckReward > 0) {
      user.points_balance += quickAckReward;
      user.points_earned_lifetime += quickAckReward;
      await this.userRepo.save(user);
    }

    const userName = user ? user.name : '值班员';
    await this.pushFeed('support', `⚡【故障接单】值班员 ${userName} 已接单响应故障：${ticket.title} (响应耗时: ${Math.round(elapsedMinutes)}分钟${quickAckReward > 0 ? '，获得极速响应奖励 +50 eP' : ''})。`);

    return this.getAppState();
  }

  async resolveTicket(ticketId: string, resolutionNote: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket || ticket.status !== 'Acknowledged' || !ticket.acknowledged_at) return this.getAppState();

    const acknowledged = new Date(ticket.acknowledged_at).getTime();
    const now = Date.now();
    const elapsedMinutes = (now - acknowledged) / 60000;

    let multiplier = 1.0;
    if (elapsedMinutes <= 30) multiplier = 1.5;
    else if (elapsedMinutes <= 60) multiplier = 1.2;
    else if (elapsedMinutes > 120) multiplier = 0.7;

    const pointsEarned = Math.round(ticket.points_reward * multiplier);

    ticket.status = 'Resolved';
    ticket.resolved_at = new Date();
    ticket.resolution_note = resolutionNote;
    ticket.points_earned_actual = pointsEarned;
    ticket.mttr_minutes = Math.round(elapsedMinutes);
    await this.ticketRepo.save(ticket);

    const resolver = await this.userRepo.findOne({ where: { id: ticket.assigned_to } });
    if (resolver) {
      resolver.points_balance += pointsEarned;
      resolver.points_earned_lifetime += pointsEarned;
      await this.userRepo.save(resolver);

      await this.pushFeed('support', `✅【故障排除】值班员 ${resolver.name} 成功修复了故障：${ticket.title}。SLA 恢复耗时: ${Math.round(elapsedMinutes)}分钟，结算积分奖赏 ${pointsEarned} eP。`);
    }

    return this.getAppState();
  }

  async penalizeNegligence(ticketId: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket || ticket.status === 'Resolved') return this.getAppState();

    ticket.negligence_penalized = true;
    await this.ticketRepo.save(ticket);

    await this.penalizeUser(ticket.assigned_to, 100, `值班期间对紧急故障【${ticket.title}】响应不力/未及时处理`);
    return this.getAppState();
  }

  async flagSecondaryIncident(ticketId: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket || ticket.status !== 'Resolved') return this.getAppState();

    const resolverId = ticket.assigned_to;

    ticket.status = 'Open';
    ticket.acknowledged_at = null;
    ticket.resolved_at = null;
    ticket.resolution_note = '';
    ticket.points_earned_actual = 0;
    ticket.secondary_fault = true;
    ticket.created_at = new Date();
    await this.ticketRepo.save(ticket);

    await this.penalizeUser(resolverId, 150, `故障修复方案不过关，导致【${ticket.title}】在短时间内二次重开/引发次生故障`);
    return this.getAppState();
  }

  async updateWebhookUrl(url: string) {
    const setting = new Setting();
    setting.key = 'webhook_url';
    setting.value = url;
    await this.settingRepo.save(setting);

    await this.pushFeed('system', `【配置更新】群机器人告警 Webhook 地址已更新。`);
    return this.getAppState();
  }

  async setActiveDuty(dutyId: string) {
    const duties = await this.dutyRepo.find();
    let onDutyName = '未分配';
    for (const d of duties) {
      d.is_active = d.id === dutyId;
      await this.dutyRepo.save(d);
      if (d.is_active) {
        const u = await this.userRepo.findOne({ where: { id: d.user_id } });
        if (u) onDutyName = u.name;
      }
    }

    await this.pushFeed('system', `【值班交接】技术保障中心完成交接班，当前在岗技术值班员：${onDutyName}。`);
    return this.getAppState();
  }

  async resetData() {
    await this.userRepo.delete({});
    await this.missionRepo.delete({});
    await this.rewardRepo.delete({});
    await this.transactionRepo.delete({});
    await this.ticketRepo.delete({});
    await this.feedRepo.delete({});
    await this.settingRepo.delete({});
    await this.dutyRepo.delete({});

    const seedService = new DatabaseSeedService(
      this.userRepo,
      this.missionRepo,
      this.rewardRepo,
      this.dutyRepo,
      this.ticketRepo,
      this.feedRepo,
      this.settingRepo,
    );
    await seedService.onApplicationBootstrap();
    return this.getAppState();
  }
}
