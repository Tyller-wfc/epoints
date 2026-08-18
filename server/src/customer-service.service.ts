import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { ExternalCustomer } from './entities/external-customer.entity';
import { ServiceRecord } from './entities/service-record.entity';
import { ServiceParticipant } from './entities/service-participant.entity';
import { ServiceFeedback } from './entities/service-feedback.entity';
import { ServiceEvaluation } from './entities/service-evaluation.entity';
import { PointLedger } from './entities/point-ledger.entity';
import { User } from './entities/user.entity';
import { Duty } from './entities/duty.entity';
import { Feed } from './entities/feed.entity';
import { PiiService } from './pii.service';
import { Mission } from './entities/mission.entity';
import { ServiceMissionLink } from './entities/service-mission-link.entity';

const TRANSITIONS: Record<string, string[]> = {
  New: ['Accepted', 'Cancelled'],
  Accepted: ['In Progress', 'Cancelled'],
  'In Progress': ['Waiting Customer', 'Completed', 'Escalated'],
  'Waiting Customer': ['In Progress', 'Completed'],
  Completed: ['Pending Evaluation', 'Reopened'],
  'Pending Evaluation': ['Reopened'],
  Reopened: ['In Progress', 'Escalated'],
  Escalated: ['In Progress', 'Completed'],
};

export function calculateServiceScore(scores: number[]) {
  if (scores.length >= 2) {
    return Math.round(scores[0] * 0.6 + scores[1] * 0.4);
  }
  return Math.round(scores[0] || 0);
}

export function calculateServicePoints(basePoints: number, totalScore: number) {
  const multiplier = totalScore >= 90 ? 1.5 : totalScore >= 80 ? 1.2 : totalScore >= 70 ? 1 : 0;
  return Math.round(basePoints * multiplier);
}

export function calculateMissionAdjustment(basePoints: number, totalScore: number) {
  const multiplier = totalScore >= 90 ? 1.2 : totalScore >= 80 ? 1.1 : totalScore >= 70 ? 1 : totalScore >= 60 ? 0.8 : 0;
  return Math.round(basePoints * (multiplier - 1));
}

@Injectable()
export class CustomerServiceService {
  constructor(
    @InjectRepository(ExternalCustomer) private readonly customerRepo: Repository<ExternalCustomer>,
    @InjectRepository(ServiceRecord) private readonly recordRepo: Repository<ServiceRecord>,
    @InjectRepository(ServiceParticipant) private readonly participantRepo: Repository<ServiceParticipant>,
    @InjectRepository(ServiceFeedback) private readonly feedbackRepo: Repository<ServiceFeedback>,
    @InjectRepository(ServiceEvaluation) private readonly evaluationRepo: Repository<ServiceEvaluation>,
    @InjectRepository(PointLedger) private readonly ledgerRepo: Repository<PointLedger>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Duty) private readonly dutyRepo: Repository<Duty>,
    @InjectRepository(Mission) private readonly missionRepo: Repository<Mission>,
    @InjectRepository(ServiceMissionLink) private readonly missionLinkRepo: Repository<ServiceMissionLink>,
    private readonly piiService: PiiService,
    private readonly dataSource: DataSource,
  ) {}

  async getCenter(requesterId: string) {
    const requester = await this.requireUser(requesterId);
    const allParticipants = await this.participantRepo.find();
    const visibleIds = requester.roleType === 'Admin'
      ? null
      : new Set(allParticipants.filter((item) => item.userId === requesterId).map((item) => item.serviceRecordId));
    const records = (await this.recordRepo.find({ order: { createdAt: 'DESC' } }))
      .filter((item) => !visibleIds || visibleIds.has(item.id) || item.createdBy === requesterId);
    const recordIds = records.map((item) => item.id);
    const participants = allParticipants.filter((item) => recordIds.includes(item.serviceRecordId));
    const participantIds = participants.map((item) => item.id);
    const [customers, feedback, evaluations, users, ledger, activeDuty, links, missions] = await Promise.all([
      this.customerRepo.createQueryBuilder('customer').addSelect('customer.contactPhoneEncrypted').getMany(),
      recordIds.length ? this.feedbackRepo.find({ where: { serviceRecordId: In(recordIds) }, order: { occurredAt: 'DESC' } }) : [],
      participantIds.length ? this.evaluationRepo.find({ where: { participantId: In(participantIds) }, order: { evaluatedAt: 'DESC' } }) : [],
      this.userRepo.find(),
      this.ledgerRepo.find({ where: { userId: requesterId }, order: { createdAt: 'DESC' } }),
      this.dutyRepo.findOne({ where: { is_active: true } }),
      recordIds.length ? this.missionLinkRepo.find({ where: { serviceRecordId: In(recordIds) } }) : [],
      this.missionRepo.find(),
    ]);
    const customerIds = new Set(records.map((item) => item.customerId));
    return {
      customers: customers.filter((item) => requester.roleType === 'Admin' || customerIds.has(item.id)).map((item) => ({
        id: item.id,
        name: item.name,
        organization: item.organization,
        contactName: item.contactName,
        contactPhoneMasked: this.piiService.mask(this.piiService.decrypt(item.contactPhoneEncrypted)),
        servicePreferences: item.servicePreferences,
        enabled: item.enabled,
      })),
      records,
      participants,
      feedback,
      evaluations,
      missionLinks: links,
      missions: missions.map(({ id, title, base_points, status, assigned_to }) => ({ id, title, base_points, status, assigned_to })),
      users: users.map(({ id, name, role, availability, enabled }) => ({ id, name, role, availability, enabled })),
      mySummary: this.buildSummary(requesterId, participants, evaluations, ledger),
      canManage: requester.roleType === 'Admin',
      activeDutyUserId: activeDuty?.user_id || null,
      policy: {
        standardWorkdayHours: 8,
        standardWorkweekDays: 5,
        restProtection: '非值班人员在休息和休假期间不承担即时响应义务，不得因此扣分。',
        servicePrinciples: ['专业', '热情', '主动', '公平', '个性化'],
      },
    };
  }

  async createCustomer(requesterId: string, data: any) {
    await this.assertAdmin(requesterId);
    const name = String(data.name || '').trim();
    if (!name || name.length > 120) throw new BadRequestException('客户名称不能为空且不能超过 120 个字符');
    const phone = this.piiService.normalizePhone(String(data.contactPhone || ''));
    await this.customerRepo.save(this.customerRepo.create({
      id: `c-${randomUUID()}`,
      name,
      organization: String(data.organization || '').trim().slice(0, 160),
      contactName: String(data.contactName || '').trim().slice(0, 80),
      contactPhoneEncrypted: this.piiService.encrypt(phone),
      servicePreferences: String(data.servicePreferences || '').trim() || null,
      enabled: true,
    }));
    return this.getCenter(requesterId);
  }

  async createRecord(requesterId: string, data: any) {
    const creator = await this.requireUser(requesterId);
    const customer = await this.customerRepo.findOne({ where: { id: String(data.customerId), enabled: true } });
    if (!customer) throw new BadRequestException('请选择有效客户');
    const title = String(data.title || '').trim();
    const description = String(data.description || '').trim();
    const promisedResult = String(data.promisedResult || '').trim();
    if (!title || !description || !promisedResult) throw new BadRequestException('标题、客户需求和承诺结果不能为空');
    const rawParticipants = Array.isArray(data.participants) ? data.participants : [];
    if (!rawParticipants.length) throw new BadRequestException('请至少指定一名内部服务人员');
    const userIds = [...new Set(rawParticipants.map((item: any) => String(item.userId || '')))];
    if (userIds.length !== rawParticipants.length) throw new BadRequestException('服务参与人员不能重复');
    const users = await this.userRepo.find({ where: { id: In(userIds), enabled: true } });
    if (users.length !== userIds.length) throw new BadRequestException('包含无效或停用的服务人员');
    if (users.some((item) => item.availability === 'Leave')) throw new BadRequestException('休假人员不能被分派服务');
    const weights = rawParticipants.map((item: any) => Number(item.contributionWeight));
    if (weights.some((item: number) => !Number.isInteger(item) || item < 1 || item > 100) || weights.reduce((sum: number, item: number) => sum + item, 0) !== 100) {
      throw new BadRequestException('参与人员贡献权重必须为整数且合计 100%');
    }
    const serviceMode = data.serviceMode === 'On Call' ? 'On Call' : 'Work Hours';
    const settlementMode = data.settlementMode === 'Mission Linked' ? 'Mission Linked' : 'Standalone';
    const rawLinks = Array.isArray(data.missionLinks) ? data.missionLinks : [];
    if (settlementMode === 'Mission Linked' && !rawLinks.length) throw new BadRequestException('任务关联服务至少需要关联一个内部任务');
    if (settlementMode === 'Standalone' && rawLinks.length) throw new BadRequestException('独立服务不能关联内部任务');
    if (rawLinks.length) {
      const missionIds = [...new Set(rawLinks.map((item: any) => String(item.missionId || '')))].filter(Boolean);
      const missions = await this.missionRepo.find({ where: { id: In(missionIds) } });
      if (missions.length !== missionIds.length) throw new BadRequestException('包含不存在的内部任务');
      const linkWeights = rawLinks.map((item: any) => Number(item.allocationWeight));
      if (linkWeights.some((item: number) => !Number.isInteger(item) || item < 1 || item > 100) || linkWeights.reduce((sum: number, item: number) => sum + item, 0) !== 100) throw new BadRequestException('任务关联权重必须为整数且合计 100%');
    }
    if (serviceMode === 'On Call') {
      const coordinatorIds = rawParticipants.filter((item: any) => item.participantRole === 'On-Call Coordinator').map((item: any) => String(item.userId));
      const activeDuty = await this.dutyRepo.findOne({ where: { is_active: true } });
      if (!activeDuty || !coordinatorIds.includes(activeDuty.user_id)) throw new BadRequestException('非工作时间服务必须由当前值班人员担任协调人');
    }
    const recordId = `sr-${randomUUID()}`;
    await this.dataSource.transaction(async (manager) => {
      await manager.save(ServiceRecord, manager.create(ServiceRecord, {
        id: recordId,
        customerId: customer.id,
        title: title.slice(0, 255),
        serviceType: String(data.serviceType || '咨询支持').trim().slice(0, 80),
        description,
        promisedResult,
        priority: ['P0', 'P1', 'P2', 'P3', 'Normal'].includes(data.priority) ? data.priority : 'Normal',
        serviceMode,
        settlementMode,
        basePoints: Math.min(1000, Math.max(0, Number(data.basePoints) || 100)),
        promisedAt: data.promisedAt ? new Date(data.promisedAt) : null,
        createdBy: creator.id,
      }));
      const savedParticipants = await manager.save(ServiceParticipant, rawParticipants.map((item: any) => manager.create(ServiceParticipant, {
        id: `sp-${randomUUID()}`,
        serviceRecordId: recordId,
        userId: String(item.userId),
        participantRole: ['Service Owner', 'Primary Provider', 'Collaborator', 'On-Call Coordinator'].includes(item.participantRole) ? item.participantRole : 'Collaborator',
        responsibility: String(item.responsibility || '').trim() || '按服务负责人安排完成服务工作',
        contributionWeight: Number(item.contributionWeight),
        workSummary: null,
      })));
      if (rawLinks.length) {
        await manager.save(ServiceMissionLink, rawLinks.map((item: any) => manager.create(ServiceMissionLink, {
          id: `sml-${randomUUID()}`,
          serviceRecordId: recordId,
          missionId: String(item.missionId),
          participantUserId: String(item.userId || savedParticipants[0].userId),
          allocationWeight: Number(item.allocationWeight),
        })));
      }
      await manager.save(Feed, manager.create(Feed, { id: `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`, type: 'service', message: `【客户服务】${customer.name} 的服务事项“${title}”已登记。`, timestamp: new Date() }));
    });
    return this.getCenter(requesterId);
  }

  async transitionRecord(requesterId: string, recordId: string, data: any) {
    const record = await this.requireRecord(recordId);
    await this.assertCanWorkOn(requesterId, record);
    const nextStatus = String(data.status || '');
    if (!(TRANSITIONS[record.status] || []).includes(nextStatus)) throw new BadRequestException(`不能从 ${record.status} 转为 ${nextStatus}`);
    if (nextStatus === 'Completed' && !String(data.resultSummary || '').trim()) throw new BadRequestException('完成服务时必须填写结果摘要');
    record.status = nextStatus;
    if (['Accepted', 'In Progress'].includes(nextStatus) && !record.startedAt) record.startedAt = new Date();
    if (nextStatus === 'Completed') {
      record.completedAt = new Date();
      record.resultSummary = String(data.resultSummary).trim();
    }
    if (nextStatus === 'Pending Evaluation') record.customerConfirmedAt = new Date();
    await this.recordRepo.save(record);
    return this.getCenter(requesterId);
  }

  async addFeedback(requesterId: string, recordId: string, data: any) {
    const record = await this.requireRecord(recordId);
    await this.assertCanWorkOn(requesterId, record);
    const content = String(data.content || '').trim();
    if (!content) throw new BadRequestException('反馈内容不能为空');
    const level = ['Satisfied', 'Neutral', 'Dissatisfied'].includes(data.satisfactionLevel) ? data.satisfactionLevel : 'Neutral';
    await this.feedbackRepo.save(this.feedbackRepo.create({
      id: `sf-${randomUUID()}`,
      serviceRecordId: record.id,
      sourceType: String(data.sourceType || 'Customer Confirmation').slice(0, 40),
      satisfactionLevel: level,
      content,
      evidenceNote: String(data.evidenceNote || '').trim() || null,
      recordedBy: requesterId,
    }));
    record.customerSatisfaction = level;
    if (record.status === 'Completed') {
      record.status = 'Pending Evaluation';
      record.customerConfirmedAt = new Date();
    }
    await this.recordRepo.save(record);
    return this.getCenter(requesterId);
  }

  async evaluateParticipant(requesterId: string, recordId: string, participantId: string, data: any) {
    await this.assertAdmin(requesterId);
    const record = await this.requireRecord(recordId);
    if (!['Completed', 'Pending Evaluation'].includes(record.status)) throw new BadRequestException('服务完成后才能评价');
    if (!await this.feedbackRepo.exists({ where: { serviceRecordId: record.id } })) throw new BadRequestException('请先记录客户反馈证据');
    const participant = await this.participantRepo.findOne({ where: { id: participantId, serviceRecordId: record.id } });
    if (!participant) throw new NotFoundException('服务参与人不存在');
    if (await this.evaluationRepo.exists({ where: { serviceRecordId: record.id, participantId } })) throw new BadRequestException('该参与人已经评价并结算');
    const scores = ['outcomeScore', 'professionalismScore']
      .map((key) => this.requireScore(data[key]));
    const totalScore = calculateServiceScore(scores);
    const links = record.settlementMode === 'Mission Linked' ? await this.missionLinkRepo.find({ where: { serviceRecordId: record.id } }) : [];
    if (record.settlementMode === 'Mission Linked' && !links.length) throw new BadRequestException('任务关联服务缺少任务配置');
    const pointsAwarded = record.settlementMode === 'Standalone'
      ? calculateServicePoints(record.basePoints, totalScore)
      : 0;
    const comment = String(data.evaluationComment || '').trim();
    if (!comment) throw new BadRequestException('管理员必须填写评分依据');
    const evaluationId = `se-${randomUUID()}`;
    const participantUser = await this.requireUser(participant.userId);
    await this.dataSource.transaction(async (manager) => {
      const evaluation = manager.create(ServiceEvaluation, {
        id: evaluationId,
        serviceRecordId: record.id,
        participantId,
        evaluatorId: requesterId,
        outcomeScore: scores[0],
        professionalismScore: scores[1],
        initiativeScore: scores[1],
        warmthScore: scores[1],
        fairnessScore: scores[1],
        collaborationScore: scores[1],
        totalScore,
        pointsAwarded,
        settlementType: record.settlementMode === 'Standalone' ? 'service_standalone' : 'mission_service_adjustment',
        evaluationComment: comment,
        improvementRequired: String(data.improvementRequired || '').trim() || null,
      });
      const settlements = record.settlementMode === 'Standalone'
        ? [{ userId: participant.userId, targetType: 'user', targetId: participant.userId, sourceType: 'service_standalone', points: pointsAwarded, reason: `独立客户服务“${record.title}”管理员评价 ${totalScore} 分` }]
        : await Promise.all(links.map(async (link) => {
          const mission = await manager.findOne(Mission, { where: { id: link.missionId } });
          if (!mission || !mission.assigned_to) throw new BadRequestException('关联任务必须存在责任人');
          const points = calculateMissionAdjustment(mission.base_points, totalScore);
          return { userId: mission.assigned_to, targetType: 'mission', targetId: mission.id, sourceType: 'mission_service_adjustment', points, reason: `客户服务“${record.title}”评价 ${totalScore} 分对任务“${mission.title}”的服务调整` };
        }));
      for (const settlement of settlements) {
        await manager.save(PointLedger, manager.create(PointLedger, {
          id: `pl-${randomUUID()}`,
          userId: settlement.userId,
          sourceType: settlement.sourceType,
          sourceId: evaluationId,
          targetType: settlement.targetType,
          targetId: settlement.targetId,
          pointsDelta: settlement.points,
          reason: settlement.reason,
          operatorId: requesterId,
        }));
        const targetUser = settlement.userId === participant.userId ? participantUser : await manager.findOneOrFail(User, { where: { id: settlement.userId } });
        targetUser.points_balance = Math.max(0, targetUser.points_balance + settlement.points);
        if (settlement.points > 0) targetUser.points_earned_lifetime += settlement.points;
        await manager.save(User, targetUser);
      }
      evaluation.pointsAwarded = settlements.reduce((sum, settlement) => sum + settlement.points, 0);
      await manager.save(ServiceEvaluation, evaluation);
      await manager.save(User, participantUser);
      const evaluatedCount = await manager.count(ServiceEvaluation, { where: { serviceRecordId: record.id } });
      const participantCount = await manager.count(ServiceParticipant, { where: { serviceRecordId: record.id } });
      if (evaluatedCount >= participantCount) {
        record.status = 'Evaluated';
        await manager.save(ServiceRecord, record);
      }
      await manager.save(Feed, manager.create(Feed, {
        id: `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: 'service',
        message: `【服务评价】${participantUser.name} 在“${record.title}”中获得 ${totalScore} 分，结算 ${record.settlementMode === 'Standalone' ? `${pointsAwarded} eP` : '关联任务调整分'}。`,
        timestamp: new Date(),
      }));
    });
    return this.getCenter(requesterId);
  }

  private buildSummary(userId: string, participants: ServiceParticipant[], evaluations: ServiceEvaluation[], ledger: PointLedger[]) {
    const participantIds = new Set(participants.filter((item) => item.userId === userId).map((item) => item.id));
    const own = evaluations.filter((item) => participantIds.has(item.participantId));
    return {
      participatedCount: participantIds.size,
      evaluatedCount: own.length,
      averageScore: own.length ? Math.round(own.reduce((sum, item) => sum + item.totalScore, 0) / own.length) : 0,
      excellentCount: own.filter((item) => item.totalScore >= 90).length,
      servicePoints: ledger.filter((item) => ['service_standalone', 'mission_service_adjustment'].includes(item.sourceType)).reduce((sum, item) => sum + item.pointsDelta, 0),
    };
  }

  private requireScore(value: any) {
    const score = Number(value);
    if (!Number.isInteger(score) || score < 0 || score > 100) throw new BadRequestException('各评分项必须为 0 至 100 的整数');
    return score;
  }

  private async requireUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId, enabled: true } });
    if (!user) throw new NotFoundException('内部人员不存在或已停用');
    return user;
  }

  private async requireRecord(recordId: string) {
    const record = await this.recordRepo.findOne({ where: { id: recordId } });
    if (!record) throw new NotFoundException('服务记录不存在');
    return record;
  }

  private async assertAdmin(userId: string) {
    if ((await this.requireUser(userId)).roleType !== 'Admin') throw new ForbiddenException('仅管理员可以执行此操作');
  }

  private async assertCanWorkOn(userId: string, record: ServiceRecord) {
    const user = await this.requireUser(userId);
    if (user.roleType === 'Admin' || record.createdBy === userId) return;
    if (!await this.participantRepo.exists({ where: { serviceRecordId: record.id, userId } })) throw new ForbiddenException('只能操作自己参与的服务');
  }
}
