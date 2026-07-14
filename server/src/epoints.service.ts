import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Mission } from './entities/mission.entity';
import { Reward } from './entities/reward.entity';
import { Transaction } from './entities/transaction.entity';
import { Ticket } from './entities/ticket.entity';
import { Duty } from './entities/duty.entity';
import { Feed } from './entities/feed.entity';
import { Setting } from './entities/setting.entity';
import { DatabaseSeedService } from './database-seed.service';
import { Credential } from './entities/credential.entity';
import { Attachment } from './entities/attachment.entity';
import { StorageService } from './storage.service';
import { DataSource } from 'typeorm';
import { Role } from './entities/role.entity';
import { TaskDomain } from './entities/task-domain.entity';
import { RoleTaskDomain } from './entities/role-task-domain.entity';
import { UserRole } from './entities/user-role.entity';
import { MissionDomain } from './entities/mission-domain.entity';
import { MissionNotificationRecipient } from './entities/mission-notification-recipient.entity';
import { PiiService } from './pii.service';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class EpointsService {
  private currentUserId = 'u-2'; // System owner: Wang Fangchao

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Mission) private readonly missionRepo: Repository<Mission>,
    @InjectRepository(Reward) private readonly rewardRepo: Repository<Reward>,
    @InjectRepository(Transaction) private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Ticket) private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Duty) private readonly dutyRepo: Repository<Duty>,
    @InjectRepository(Feed) private readonly feedRepo: Repository<Feed>,
    @InjectRepository(Setting) private readonly settingRepo: Repository<Setting>,
    @InjectRepository(Credential) private readonly credentialRepo: Repository<Credential>,
    @InjectRepository(Attachment) private readonly attachmentRepo: Repository<Attachment>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(TaskDomain) private readonly domainRepo: Repository<TaskDomain>,
    @InjectRepository(RoleTaskDomain) private readonly roleDomainRepo: Repository<RoleTaskDomain>,
    @InjectRepository(UserRole) private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(MissionDomain) private readonly missionDomainRepo: Repository<MissionDomain>,
    @InjectRepository(MissionNotificationRecipient) private readonly missionRecipientRepo: Repository<MissionNotificationRecipient>,
    private readonly storageService: StorageService,
    private readonly piiService: PiiService,
    private readonly dataSource: DataSource,
  ) {}

  async getAppState(requesterId = this.currentUserId) {
    const users = await this.userRepo.find();
    const missions = await this.missionRepo.find();
    const rewards = await this.rewardRepo.find();
    const transactions = await this.transactionRepo.find({ order: { created_at: 'DESC' } });
    const duty = await this.dutyRepo.find();
    const tickets = await this.ticketRepo.find();
    const feed = await this.feedRepo.find({ order: { timestamp: 'DESC' } });
    const attachments = await this.attachmentRepo.find({ order: { createdAt: 'ASC' } });
    const roles = await this.roleRepo.find({ where: { enabled: true } });
    const taskDomains = await this.domainRepo.find({ where: { enabled: true } });
    const roleDomainMappings = await this.roleDomainRepo.find();
    const userRoles = await this.userRoleRepo.find();
    const missionDomains = await this.missionDomainRepo.find();
    const roleById = new Map(roles.map((role) => [role.id, role]));
    const domainById = new Map(taskDomains.map((domain) => [domain.id, domain]));
    const attachmentMap = new Map<string, ReturnType<EpointsService['serializeAttachment']>[]>();
    for (const attachment of attachments) {
      const key = `${attachment.ownerType}:${attachment.ownerId}`;
      const list = attachmentMap.get(key) || [];
      list.push(this.serializeAttachment(attachment));
      attachmentMap.set(key, list);
    }
    
    const webhookSetting = await this.settingRepo.findOne({ where: { key: 'webhook_url' } });
    const mentionSetting = await this.settingRepo.findOne({ where: { key: 'webhook_mention_mobiles' } });
    const webhookUrl = webhookSetting?.value || '';

    return {
      users: users.map((user) => ({
        ...user,
        roles: userRoles.filter((item) => item.userId === user.id).map((item) => ({ ...item, role: roleById.get(item.roleId) })).filter((item) => item.role),
      })),
      missions: missions.map((mission) => ({
        ...mission,
        attachments: attachmentMap.get(`mission:${mission.id}`) || [],
        domains: missionDomains.filter((item) => item.missionId === mission.id).map((item) => ({ ...item, domain: domainById.get(item.domainId) })).filter((item) => item.domain),
      })),
      rewards,
      transactions,
      duty,
      tickets: tickets.map((ticket) => ({ ...ticket, attachments: attachmentMap.get(`ticket:${ticket.id}`) || [] })),
      feed,
      currentUserId: requesterId,
      roles,
      taskDomains,
      roleDomainMappings,
      wecomWebhook: {
        configured: this.isValidWecomWebhook(webhookUrl),
        maskedUrl: this.maskWebhookUrl(webhookUrl),
        mentionMobiles: mentionSetting?.value ? mentionSetting.value.split(',').filter(Boolean) : [],
      },
    };
  }

  async setCurrentUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    this.currentUserId = userId;
    return this.getAppState(userId);
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
    return this.getAppState(userId);
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

  async verifyMission(requesterId: string, missionId: string, isApproved: boolean, penalize = false) {
    await this.assertAdmin(requesterId);
    const mission = await this.missionRepo.findOne({ where: { id: missionId } });
    if (!mission) throw new NotFoundException('Mission not found');
    if (mission.status !== 'Pending Verification') throw new BadRequestException('Mission is not pending verification');

    const earner = await this.userRepo.findOne({ where: { id: mission.assigned_to } });
    if (!earner) throw new NotFoundException('Assignee not found');

    const verifier = await this.userRepo.findOne({ where: { id: requesterId } });
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

    return this.getAppState(requesterId);
  }

  async updateMultiplier(requesterId: string, missionId: string, newMultiplier: number) {
    await this.assertAdmin(requesterId);
    const mission = await this.missionRepo.findOne({ where: { id: missionId } });
    if (!mission) throw new NotFoundException('Mission not found');

    mission.multiplier = newMultiplier;
    await this.missionRepo.save(mission);

    const user = await this.userRepo.findOne({ where: { id: requesterId } });
    const userName = user ? user.name : '主管';

    await this.pushFeed('system', `【战略倍率】主管 ${userName} 将任务【${mission.title}】战略奖励倍率调整为 ${newMultiplier.toFixed(1)}x。`);
    return this.getAppState(requesterId);
  }

  async getPersonnel(requesterId: string) {
    await this.assertAdmin(requesterId);
    const users = await this.userRepo.createQueryBuilder('user').addSelect('user.phoneEncrypted').getMany();
    const roles = await this.roleRepo.find({ where: { enabled: true } });
    const assignments = await this.userRoleRepo.find();
    const credentials = await this.credentialRepo.find();
    return users.map((user) => {
      const phone = this.piiService.decrypt(user.phoneEncrypted);
      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        permissionType: user.roleType,
        username: credentials.find((item) => item.userId === user.id)?.username || '',
        phone,
        phoneMasked: this.piiService.mask(phone),
        enabled: user.enabled,
        availability: user.availability,
        roles: assignments.filter((item) => item.userId === user.id).map((item) => ({ ...item, role: roles.find((role) => role.id === item.roleId) })).filter((item) => item.role),
      };
    });
  }

  async createPersonnel(requesterId: string, data: any) {
    await this.assertAdmin(requesterId);
    const name = String(data.name || '').trim();
    const username = String(data.username || '').trim();
    const password = String(data.password || '');
    if (!name || name.length > 32) throw new BadRequestException('姓名不能为空且不能超过 32 个字符');
    if (!/^[a-zA-Z][a-zA-Z0-9._-]{2,31}$/.test(username)) throw new BadRequestException('登录账号需以字母开头，长度 3-32 位');
    if (password.length < 6) throw new BadRequestException('初始密码不能少于 6 位');
    if (await this.credentialRepo.findOne({ where: { username } })) throw new BadRequestException('登录账号已存在');
    const phone = this.piiService.normalizePhone(data.phone || '');
    const phoneHash = this.piiService.hash(phone);
    if (phoneHash) {
      const duplicate = await this.userRepo.createQueryBuilder('user').addSelect('user.phoneHash').where('user.phoneHash = :phoneHash', { phoneHash }).getOne();
      if (duplicate) throw new BadRequestException('该手机号已绑定其他成员');
    }
    const roleAssignments = await this.validateRoleAssignments(data.roles);
    const primaryRole = await this.roleRepo.findOne({ where: { id: roleAssignments.find((item) => item.isPrimary)!.roleId } });
    if (!primaryRole) throw new BadRequestException('主角色不存在');
    const userId = `u-${randomUUID()}`;
    const user = this.userRepo.create({
      id: userId, name, avatar: '/avatars/dev.png', role: primaryRole.name, roleType: 'Member',
      points_balance: 0, points_earned_lifetime: 0, penalties_count: 0, points_deducted_total: 0,
      phoneEncrypted: this.piiService.encrypt(phone), phoneHash, enabled: data.enabled !== false,
      availability: ['Available', 'Busy', 'Leave'].includes(data.availability) ? data.availability : 'Available',
    });
    await this.dataSource.transaction(async (manager) => {
      await manager.save(User, user);
      await manager.save(Credential, { userId, username, passwordHash: await bcrypt.hash(password, 12) });
      await manager.save(UserRole, roleAssignments.map((item) => ({ id: `${userId}:${item.roleId}`, userId, ...item })));
    });
    await this.pushFeed('system', `【人员新增】管理员添加了成员 ${name}，主角色为 ${primaryRole.name}。`);
    return this.getPersonnel(requesterId);
  }

  async deletePersonnel(requesterId: string, userId: string) {
    await this.assertAdmin(requesterId);
    if (userId === 'u-2') throw new ForbiddenException('王方超是系统初始管理员，不允许删除');
    const user = await this.userRepo.createQueryBuilder('user').addSelect('user.avatarObjectKey').where('user.id = :userId', { userId }).getOne();
    if (!user) throw new NotFoundException('成员不存在');
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Mission, { assigned_to: userId }, { assigned_to: 'u-2' });
      await manager.update(Ticket, { reporter_id: userId }, { reporter_id: 'u-2' });
      await manager.update(Ticket, { assigned_to: userId }, { assigned_to: 'u-2' });
      await manager.update(Transaction, { user_id: userId }, { user_id: 'u-2' });
      await manager.delete(Duty, { user_id: userId });
      await manager.delete(UserRole, { userId });
      await manager.delete(Credential, { userId });
      await manager.delete(User, { id: userId });
    });
    if (user.avatarObjectKey) await this.storageService.deleteObjects([user.avatarObjectKey]);
    await this.pushFeed('system', `【人员移除】管理员移除了成员 ${user.name}，其历史业务记录已转交王方超。`);
    return this.getPersonnel(requesterId);
  }

  async updatePersonnelAvatar(requesterId: string, userId: string, file?: Express.Multer.File) {
    await this.assertAvatarPermission(requesterId, userId);
    if (!file) throw new BadRequestException('请选择头像图片');
    const user = await this.userRepo.createQueryBuilder('user')
      .addSelect('user.avatarObjectKey')
      .addSelect('user.avatarMimeType')
      .where('user.id = :userId', { userId })
      .getOne();
    if (!user) throw new NotFoundException('成员不存在');
    const uploaded = await this.storageService.uploadAvatar(userId, file);
    const previousObjectKey = user.avatarObjectKey;
    try {
      user.avatarObjectKey = uploaded.objectKey;
      user.avatarMimeType = uploaded.mimeType;
      user.avatar = this.buildAvatarUrl(userId, uploaded.objectKey);
      await this.userRepo.save(user);
    } catch (error) {
      await this.storageService.deleteObjects([uploaded.objectKey]);
      throw error;
    }
    if (previousObjectKey) await this.storageService.deleteObjects([previousObjectKey]);
    return { success: true, avatar: user.avatar };
  }

  async resetPersonnelAvatar(requesterId: string, userId: string) {
    await this.assertAvatarPermission(requesterId, userId);
    const user = await this.userRepo.createQueryBuilder('user')
      .addSelect('user.avatarObjectKey')
      .addSelect('user.avatarMimeType')
      .where('user.id = :userId', { userId })
      .getOne();
    if (!user) throw new NotFoundException('成员不存在');
    const previousObjectKey = user.avatarObjectKey;
    user.avatarObjectKey = null;
    user.avatarMimeType = null;
    user.avatar = this.defaultAvatar(userId);
    await this.userRepo.save(user);
    if (previousObjectKey) await this.storageService.deleteObjects([previousObjectKey]);
    return { success: true, avatar: user.avatar };
  }

  private async assertAvatarPermission(requesterId: string, userId: string) {
    if (requesterId === userId) return;
    await this.assertAdmin(requesterId);
  }

  async getPersonnelAvatar(userId: string) {
    const user = await this.userRepo.createQueryBuilder('user')
      .addSelect('user.avatarObjectKey')
      .addSelect('user.avatarMimeType')
      .where('user.id = :userId', { userId })
      .getOne();
    if (!user?.avatarObjectKey || !user.avatarMimeType) throw new NotFoundException('自定义头像不存在');
    return { mimeType: user.avatarMimeType, stream: await this.storageService.getObject(user.avatarObjectKey) };
  }

  private buildAvatarUrl(userId: string, objectKey: string) {
    const version = objectKey.split('/').pop() || randomUUID();
    return `/api/personnel/${encodeURIComponent(userId)}/avatar?v=${encodeURIComponent(version)}`;
  }

  private defaultAvatar(userId: string) {
    return userId === 'u-2' ? '/avatars/senior_dev.png' : '/avatars/dev.png';
  }

  async updatePersonnel(requesterId: string, userId: string, data: any) {
    await this.assertAdmin(requesterId);
    const user = await this.userRepo.createQueryBuilder('user').addSelect('user.phoneEncrypted').addSelect('user.phoneHash').where('user.id = :userId', { userId }).getOne();
    if (!user) throw new NotFoundException('成员不存在');
    const name = String(data.name || '').trim();
    if (!name || name.length > 32) throw new BadRequestException('姓名不能为空且不能超过 32 个字符');
    const phone = this.piiService.normalizePhone(data.phone || '');
    const roleAssignments = await this.validateRoleAssignments(data.roles);
    const roleIds = roleAssignments.map((item) => item.roleId);
    const validRoles = await this.roleRepo.find({ where: { id: In(roleIds), enabled: true } });
    const phoneHash = this.piiService.hash(phone);
    if (phoneHash) {
      const duplicate = await this.userRepo.createQueryBuilder('user').addSelect('user.phoneHash').where('user.phoneHash = :phoneHash AND user.id != :userId', { phoneHash, userId }).getOne();
      if (duplicate) throw new BadRequestException('该手机号已绑定其他成员');
    }
    const primary = roleAssignments.find((item) => item.isPrimary);
    if (!primary) throw new BadRequestException('必须设置一个主角色');
    const primaryRole = validRoles.find((role) => role.id === primary.roleId)!;
    user.name = name;
    user.phoneEncrypted = this.piiService.encrypt(phone);
    user.phoneHash = phoneHash;
    user.enabled = data.enabled !== false;
    user.availability = ['Available', 'Busy', 'Leave'].includes(data.availability) ? data.availability : 'Available';
    user.role = primaryRole.name;
    await this.dataSource.transaction(async (manager) => {
      await manager.save(User, user);
      await manager.delete(UserRole, { userId });
      await manager.save(UserRole, roleAssignments.map((item) => ({
        id: `${userId}:${item.roleId}`,
        userId,
        roleId: item.roleId,
        isPrimary: Boolean(item.isPrimary),
        level: item.level,
      })));
    });
    return this.getPersonnel(requesterId);
  }

  private async validateRoleAssignments(value: any) {
    const assignments = Array.isArray(value) ? value : [];
    if (!assignments.length || assignments.filter((item) => item.isPrimary).length !== 1) throw new BadRequestException('请至少选择一个角色，并设置一个主角色');
    const roleIds = [...new Set(assignments.map((item) => String(item.roleId)))];
    if (roleIds.length !== assignments.length) throw new BadRequestException('角色不能重复');
    const validRoles = await this.roleRepo.find({ where: { id: In(roleIds), enabled: true } });
    if (validRoles.length !== roleIds.length) throw new BadRequestException('包含无效角色');
    return assignments.map((item) => ({ roleId: String(item.roleId), isPrimary: Boolean(item.isPrimary), level: Math.min(4, Math.max(1, Number(item.level) || 2)) }));
  }

  async previewMissionRecipients(requesterId: string, data: any) {
    await this.assertAdmin(requesterId);
    const domainIds = this.parseMissionDomainIds(data);
    const matches = await this.matchMissionRecipients(domainIds);
    return {
      domains: await this.domainRepo.find({ where: { id: In(domainIds) } }),
      recipients: matches.map((item) => ({ userId: item.userId, name: item.name, phoneMasked: this.piiService.mask(item.phone), roleNames: item.roleNames, matchType: item.matchType, mentioned: item.mentioned })),
      mentionCount: matches.filter((item) => item.mentioned && item.phone).length,
    };
  }

  async createMission(missionData: any, files: Express.Multer.File[] = [], userId = this.currentUserId, requestOrigin = '') {
    await this.assertAdmin(userId);
    const domainIds = this.parseMissionDomainIds(missionData);
    const primaryDomainId = missionData.primaryDomainId;
    const domains = await this.domainRepo.find({ where: { id: In(domainIds), enabled: true } });
    if (domains.length !== domainIds.length) throw new BadRequestException('包含无效任务领域');
    const recipients = await this.matchMissionRecipients(domainIds);
    const mission = new Mission();
    mission.id = `m-${Date.now()}`;
    mission.title = missionData.title;
    mission.description = missionData.description;
    mission.base_points = Number(missionData.base_points);
    mission.multiplier = Number(missionData.multiplier || 1.0);
    mission.category = domains.find((item) => item.id === primaryDomainId)?.code || 'software';
    mission.priority = ['Normal', 'High', 'Critical'].includes(missionData.priority) ? missionData.priority : 'Normal';
    mission.status = 'Available';
    const attachments = await this.storageService.uploadFiles('mission', mission.id, userId, files);
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(Mission, mission);
        if (attachments.length) await manager.save(Attachment, attachments);
        await manager.save(MissionDomain, domainIds.map((domainId) => ({ id: `${mission.id}:${domainId}`, missionId: mission.id, domainId, isPrimary: domainId === primaryDomainId })));
        if (recipients.length) await manager.save(MissionNotificationRecipient, recipients.map((item) => ({ id: randomUUID(), missionId: mission.id, userId: item.userId, matchType: item.matchType, roleNames: item.roleNames.join('、'), mentioned: item.mentioned })));
      });
    } catch (error) {
      await this.storageService.deleteObjects(attachments.map((item) => item.objectKey));
      throw error;
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    const userName = user ? user.name : '主管';

    await this.pushFeed('system', `【任务发布】主管 ${userName} 发布了新战术任务：${missionData.title}，基础分 ${missionData.base_points} eP。`);
    try {
      await this.sendMissionWecomNotification(mission, userName, attachments.length, domains.map((item) => item.name), recipients.filter((item) => item.mentioned).map((item) => item.phone).filter(Boolean), requestOrigin);
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      console.error('WeCom mission notification failed:', error);
      await this.pushFeed('system', `【企业微信通知失败】任务“${mission.title}”已发布，但消息推送失败：${message}`);
    }
    return this.getAppState(userId);
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

  async createReward(requesterId: string, data: any, imageFile?: Express.Multer.File) {
    await this.assertAdmin(requesterId);
    const values = this.validateRewardData(data);
    const rewardId = `r-${randomUUID().replace(/-/g, '').slice(0, 30)}`;
    const attachment = imageFile ? await this.storageService.uploadRewardImage(rewardId, requesterId, imageFile) : null;
    const reward = this.rewardRepo.create({ id: rewardId, ...values, image: attachment ? `/api/rewards/${rewardId}/image` : values.image });
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(Reward, reward);
        if (attachment) await manager.save(Attachment, attachment);
      });
    } catch (error) {
      if (attachment) await this.storageService.deleteObjects([attachment.objectKey]);
      throw error;
    }
    await this.pushFeed('system', `【商品新增】管理员上架了福利商品：${reward.title}。`);
    return this.getAppState(requesterId);
  }

  async updateReward(requesterId: string, rewardId: string, data: any, imageFile?: Express.Multer.File) {
    await this.assertAdmin(requesterId);
    const reward = await this.rewardRepo.findOne({ where: { id: rewardId } });
    if (!reward) throw new NotFoundException('商品不存在');
    const values = this.validateRewardData(data);
    const oldAttachment = await this.attachmentRepo.findOne({ where: { ownerType: 'reward', ownerId: rewardId } });
    const newAttachment = imageFile ? await this.storageService.uploadRewardImage(rewardId, requesterId, imageFile) : null;
    const keepsUploadedImage = !imageFile && values.image.includes(`/api/rewards/${rewardId}/image`);
    const currentImage = reward.image;
    Object.assign(reward, values, { image: newAttachment ? `/api/rewards/${rewardId}/image` : keepsUploadedImage ? currentImage : values.image });
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(Reward, reward);
        if (oldAttachment && !keepsUploadedImage) await manager.delete(Attachment, { id: oldAttachment.id });
        if (newAttachment) await manager.save(Attachment, newAttachment);
      });
    } catch (error) {
      if (newAttachment) await this.storageService.deleteObjects([newAttachment.objectKey]);
      throw error;
    }
    if (oldAttachment && !keepsUploadedImage) await this.storageService.deleteObjects([oldAttachment.objectKey]);
    await this.pushFeed('system', `【商品更新】管理员更新了福利商品：${reward.title}。`);
    return this.getAppState(requesterId);
  }

  async deleteReward(requesterId: string, rewardId: string) {
    await this.assertAdmin(requesterId);
    const reward = await this.rewardRepo.findOne({ where: { id: rewardId } });
    if (!reward) throw new NotFoundException('商品不存在');
    const transactionCount = await this.transactionRepo.count({ where: { reward_id: rewardId } });
    if (transactionCount > 0) throw new BadRequestException('该商品已有兑换记录，不能删除；可将库存改为 0 进行下架');
    const attachment = await this.attachmentRepo.findOne({ where: { ownerType: 'reward', ownerId: rewardId } });
    await this.dataSource.transaction(async (manager) => {
      if (attachment) await manager.delete(Attachment, { id: attachment.id });
      await manager.remove(Reward, reward);
    });
    if (attachment) await this.storageService.deleteObjects([attachment.objectKey]);
    await this.pushFeed('system', `【商品删除】管理员删除了福利商品：${reward.title}。`);
    return this.getAppState(requesterId);
  }

  async getRewardImage(rewardId: string) {
    const attachment = await this.attachmentRepo.findOne({ where: { ownerType: 'reward', ownerId: rewardId, isImage: true } });
    if (!attachment) throw new NotFoundException('商品图片不存在');
    return { attachment, stream: await this.storageService.getObject(attachment.objectKey) };
  }

  async getTransactions(requesterId: string) {
    await this.assertAdmin(requesterId);
    return this.transactionRepo.find({ order: { created_at: 'DESC' } });
  }

  async deliverReward(requesterId: string, txId: string) {
    await this.assertAdmin(requesterId);
    const tx = await this.transactionRepo.findOne({ where: { id: txId } });
    if (!tx) throw new NotFoundException('Transaction not found');

    tx.status = 'Delivered';
    await this.transactionRepo.save(tx);

    const user = await this.userRepo.findOne({ where: { id: tx.user_id } });
    const reward = await this.rewardRepo.findOne({ where: { id: tx.reward_id } });
    const userName = user ? user.name : '未知人员';
    const rewardTitle = reward ? reward.title : '未知商品';

    await this.pushFeed('system', `【福利发放】已向 ${userName} 交付了兑换的福利：${rewardTitle}。`);
    return this.getAppState(requesterId);
  }

  async raiseAlert(ticketData: any, files: Express.Multer.File[] = [], reporterId = ticketData.reporter_id) {
    const reporter = await this.userRepo.findOne({ where: { id: reporterId } });
    if (!reporter) throw new NotFoundException('Reporter not found');

    const activeDuty = await this.dutyRepo.findOne({ where: { is_active: true } });
    const assigneeId = activeDuty ? activeDuty.user_id : 'u-2';

    let pointsReward = 100;
    if (ticketData.severity === 'Critical') pointsReward = 300;
    else if (ticketData.severity === 'High') pointsReward = 200;
    else if (ticketData.severity === 'Medium') pointsReward = 100;

    const ticket = new Ticket();
    ticket.id = `t-${Date.now()}`;
    ticket.reporter_id = reporterId;
    ticket.title = ticketData.title;
    ticket.description = ticketData.description;
    ticket.severity = ticketData.severity;
    ticket.assigned_to = assigneeId;
    ticket.status = 'Open';
    ticket.points_reward = pointsReward;
    ticket.created_at = new Date();
    const attachments = await this.storageService.uploadFiles('ticket', ticket.id, reporterId, files);
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(Ticket, ticket);
        if (attachments.length) await manager.save(Attachment, attachments);
      });
    } catch (error) {
      await this.storageService.deleteObjects(attachments.map((item) => item.objectKey));
      throw error;
    }

    const assigneeUser = await this.userRepo.findOne({ where: { id: assigneeId } });
    const assigneeName = assigneeUser ? assigneeUser.name : '王方超';

    const alertLevelText = ticketData.severity === 'Critical' ? '🚨【红色警报】' : '⚠️【系统故障申报】';
    await this.pushFeed('support', `${alertLevelText}${reporter.name} 申报紧急故障：${ticketData.title}。已自动分派给在岗值班员：${assigneeName}！`);

    try {
      await this.sendTicketWecomNotification(ticket, reporter.name, assigneeName, attachments.length);
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      console.error('WeCom ticket notification failed:', error);
      await this.pushFeed('system', `【企业微信通知失败】工单“${ticket.title}”已创建，但消息推送失败：${message}`);
    }

    return this.getAppState();
  }

  async acknowledgeTicket(ticketId: string, _userId: string) {
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

  async updateWecomConfig(requesterId: string, url: string, mentionMobiles: string[] | string = []) {
    await this.assertAdmin(requesterId);
    const saved = await this.settingRepo.findOne({ where: { key: 'webhook_url' } });
    const normalizedUrl = url === undefined ? saved?.value || '' : url.trim();
    if (normalizedUrl && !this.isValidWecomWebhook(normalizedUrl)) {
      throw new BadRequestException('请输入有效的企业微信群机器人 Webhook 地址');
    }
    const mobiles = this.normalizeMentionMobiles(mentionMobiles);
    await this.settingRepo.save({ key: 'webhook_url', value: normalizedUrl });
    await this.settingRepo.save({ key: 'webhook_mention_mobiles', value: mobiles.join(',') });
    await this.pushFeed('system', normalizedUrl ? '【配置更新】企业微信群机器人告警通道已启用。' : '【配置更新】企业微信群机器人告警通道已停用。');
    return this.getAppState();
  }

  async testWecomWebhook(requesterId: string, url?: string, mentionMobiles: string[] | string = []) {
    await this.assertAdmin(requesterId);
    const saved = await this.settingRepo.findOne({ where: { key: 'webhook_url' } });
    const targetUrl = url?.trim() || saved?.value || '';
    if (!this.isValidWecomWebhook(targetUrl)) throw new BadRequestException('请先保存有效的企业微信 Webhook 地址');
    const savedMentions = await this.settingRepo.findOne({ where: { key: 'webhook_mention_mobiles' } });
    const mobiles = this.normalizeMentionMobiles(
      Array.isArray(mentionMobiles) && mentionMobiles.length ? mentionMobiles : savedMentions?.value || '',
    );
    await this.sendWecomText(targetUrl, '【ePoints 通道测试】\n企业微信消息推送连接正常。新项目任务和系统故障上报将自动同步到本群。', mobiles);
    return { success: true, message: '测试消息发送成功，请在企业微信群中确认' };
  }

  async getAttachmentFile(id: string) {
    const attachment = await this.attachmentRepo.findOne({ where: { id } });
    if (!attachment) throw new NotFoundException('附件不存在');
    return { attachment, stream: await this.storageService.getObject(attachment.objectKey) };
  }

  private serializeAttachment(attachment: Attachment) {
    return {
      id: attachment.id,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      isImage: attachment.isImage,
      createdAt: attachment.createdAt,
      url: `/api/attachments/${attachment.id}/content`,
    };
  }

  private parseMissionDomainIds(data: any) {
    const primary = String(data.primaryDomainId || '').trim();
    let secondary: string[] = [];
    try {
      secondary = Array.isArray(data.secondaryDomainIds) ? data.secondaryDomainIds : JSON.parse(data.secondaryDomainIds || '[]');
    } catch {
      throw new BadRequestException('次要任务领域格式不正确');
    }
    const ids = [...new Set([primary, ...secondary.map(String)].filter(Boolean))];
    if (!primary) throw new BadRequestException('请选择主任务领域');
    return ids;
  }

  private async matchMissionRecipients(domainIds: string[]) {
    const mappings = await this.roleDomainRepo.find({ where: { domainId: In(domainIds) } });
    const roleIds = [...new Set(mappings.map((item) => item.roleId))];
    if (!roleIds.length) return [];
    const assignments = await this.userRoleRepo.find({ where: { roleId: In(roleIds) } });
    const userIds = [...new Set(assignments.map((item) => item.userId))];
    if (!userIds.length) return [];
    const users = await this.userRepo.createQueryBuilder('user')
      .addSelect('user.phoneEncrypted')
      .where('user.id IN (:...userIds)', { userIds })
      .andWhere('user.enabled = :enabled', { enabled: true })
      .andWhere('user.availability != :leave', { leave: 'Leave' })
      .getMany();
    const roles = await this.roleRepo.find({ where: { id: In(roleIds) } });
    return users.map((user) => {
      const matchedAssignments = assignments.filter((item) => item.userId === user.id);
      const matchedMappings = mappings.filter((mapping) => matchedAssignments.some((assignment) => assignment.roleId === mapping.roleId));
      const types = matchedMappings.map((item) => item.relationType);
      const matchType = types.includes('P') ? 'P' : types.includes('R') ? 'R' : 'S';
      const phone = this.piiService.decrypt(user.phoneEncrypted);
      return {
        userId: user.id,
        name: user.name,
        phone,
        roleNames: [...new Set(matchedAssignments.map((item) => roles.find((role) => role.id === item.roleId)?.name).filter(Boolean))] as string[],
        matchType,
        mentioned: matchType === 'P' && Boolean(phone),
      };
    });
  }

  private async sendMissionWecomNotification(mission: Mission, publisherName: string, attachmentCount = 0, domainNames: string[] = [], mentionMobiles: string[] = [], requestOrigin = '') {
    const description = (mission.description || '未填写').slice(0, 800);
    const publicWebUrl = (process.env.PUBLIC_WEB_URL || requestOrigin).trim().replace(/\/+$/, '');
    const claimUrl = publicWebUrl ? `${publicWebUrl}/?claimMission=${encodeURIComponent(mission.id)}` : '';
    const content = [
      '## 【ePoints 新项目任务】',
      `> 任务：${mission.title}`,
      `> 任务领域：${domainNames.join('、') || mission.category || '未分类'}`,
      `> 优先级：${mission.priority}`,
      `> 基础积分：${mission.base_points} eP`,
      `> 奖励倍率：${Number(mission.multiplier).toFixed(1)}x`,
      `> 发布人：${publisherName}`,
      `> 任务描述：${description}`,
      `> 附件：${attachmentCount} 个`,
      claimUrl ? `[立即认领任务](${claimUrl})` : '请进入项目任务板查看并认领任务。',
    ].join('\n');
    await this.sendConfiguredWecomMarkdown(content, mentionMobiles);
  }

  private async sendTicketWecomNotification(ticket: Ticket, reporterName: string, assigneeName: string, attachmentCount = 0) {
    const description = (ticket.description || '未填写').slice(0, 800);
    const responseRequirement = ticket.severity === 'Critical'
      ? '请在 10 分钟内进入技术保障中心确认接单。'
      : '请值班负责人尽快进入技术保障中心确认接单。';
    const content = [
      ticket.severity === 'Critical' ? '【ePoints Critical 红色警报】' : '【ePoints 系统故障上报】',
      `故障等级：${ticket.severity}`,
      `故障：${ticket.title}`,
      `上报人：${reporterName}`,
      `值班负责人：${assigneeName}`,
      `描述：${description}`,
      `附件：${attachmentCount} 个`,
      responseRequirement,
    ].join('\n');
    await this.sendConfiguredWecomText(content);
  }

  private async sendConfiguredWecomText(content: string, dynamicMobiles: string[] = []) {
    const webhook = await this.settingRepo.findOne({ where: { key: 'webhook_url' } });
    if (!webhook || !this.isValidWecomWebhook(webhook.value)) return;
    const mentions = await this.settingRepo.findOne({ where: { key: 'webhook_mention_mobiles' } });
    const fixedMobiles = this.normalizeMentionMobiles(mentions?.value || '');
    const mobiles = [...new Set([...fixedMobiles, ...dynamicMobiles].map((phone) => phone.startsWith('+86') && phone.length === 14 ? phone.slice(3) : phone))];
    await this.sendWecomText(webhook.value, content, mobiles);
  }

  private async sendConfiguredWecomMarkdown(content: string, dynamicMobiles: string[] = []) {
    const webhook = await this.settingRepo.findOne({ where: { key: 'webhook_url' } });
    if (!webhook || !this.isValidWecomWebhook(webhook.value)) return;
    await this.sendWecomMarkdown(webhook.value, content);

    if (dynamicMobiles.length) {
      await this.sendConfiguredWecomText('请相关成员及时查看并认领新任务。', dynamicMobiles);
    }
  }

  private async sendWecomMarkdown(url: string, content: string) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msgtype: 'markdown', markdown: { content } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`企业微信接口 HTTP ${response.status}`);
    const result = await response.json() as { errcode?: number; errmsg?: string };
    if (result.errcode !== 0) throw new Error(`企业微信返回 ${result.errcode}: ${result.errmsg || '未知错误'}`);
  }

  private async sendWecomText(url: string, content: string, mobiles: string[]) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msgtype: 'text', text: { content, mentioned_mobile_list: mobiles } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`企业微信接口 HTTP ${response.status}`);
    const result = await response.json() as { errcode?: number; errmsg?: string };
    if (result.errcode !== 0) throw new Error(`企业微信返回 ${result.errcode}: ${result.errmsg || '未知错误'}`);
  }

  private isValidWecomWebhook(url: string) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:'
        && parsed.hostname === 'qyapi.weixin.qq.com'
        && parsed.pathname === '/cgi-bin/webhook/send'
        && Boolean(parsed.searchParams.get('key'));
    } catch {
      return false;
    }
  }

  private maskWebhookUrl(url: string) {
    if (!this.isValidWecomWebhook(url)) return '';
    const parsed = new URL(url);
    const key = parsed.searchParams.get('key') || '';
    return `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=****${key.slice(-6)}`;
  }

  private normalizeMentionMobiles(value: string[] | string) {
    const items = Array.isArray(value) ? value : value.split(/[,，;；\s]+/);
    const mobiles = [...new Set(items.map((item) => item.trim()).filter(Boolean))];
    if (mobiles.some((mobile) => !/^\+?\d{6,20}$/.test(mobile))) {
      throw new BadRequestException('提醒手机号格式不正确，请使用逗号分隔');
    }
    return mobiles;
  }

  private async assertAdmin(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.roleType !== 'Admin') throw new ForbiddenException('仅管理员可执行此操作');
  }

  private validateRewardData(data: any) {
    const title = String(data.title || '').trim();
    const description = String(data.description || '').trim();
    const category = String(data.category || '').trim();
    const image = String(data.image || '').trim();
    const pointsCost = Number(data.points_cost);
    const inventory = Number(data.inventory);
    const levelRequired = Number(data.level_required);
    const categories = ['Hardware', 'Software', 'Training', 'Lifestyle'];
    if (!title) throw new BadRequestException('请输入商品名称');
    if (!description) throw new BadRequestException('请输入商品描述');
    if (!categories.includes(category)) throw new BadRequestException('请选择有效的商品分类');
    if (!image) throw new BadRequestException('请输入商品图标');
    if (!Number.isInteger(pointsCost) || pointsCost <= 0) throw new BadRequestException('兑换积分必须是大于 0 的整数');
    if (!Number.isInteger(inventory) || inventory < 0) throw new BadRequestException('库存必须是大于或等于 0 的整数');
    if (!Number.isInteger(levelRequired) || levelRequired < 1 || levelRequired > 5) throw new BadRequestException('起兑等级必须是 1 到 5 的整数');
    return { title, description, category, image, points_cost: pointsCost, inventory, level_required: levelRequired };
  }

  async setActiveDuty(requesterId: string, dutyId: string) {
    await this.assertAdmin(requesterId);
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
    return this.getAppState(requesterId);
  }

  async resetData(requesterId: string) {
    await this.assertAdmin(requesterId);
    const usersWithAvatars = await this.userRepo.createQueryBuilder('user').addSelect('user.avatarObjectKey').getMany();
    const attachments = await this.attachmentRepo.find();
    await this.storageService.deleteObjects(usersWithAvatars.map((user) => user.avatarObjectKey).filter((key): key is string => Boolean(key)));
    await this.storageService.deleteObjects(attachments.map((item) => item.objectKey));
    await this.attachmentRepo.delete({});
    await this.missionRecipientRepo.delete({});
    await this.missionDomainRepo.delete({});
    await this.userRoleRepo.delete({});
    await this.credentialRepo.delete({});
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
      this.credentialRepo,
    );
    await seedService.onApplicationBootstrap();
    await this.userRoleRepo.save([
      { id: 'u-2:r-ops', userId: 'u-2', roleId: 'r-ops', isPrimary: true, level: 4 },
      { id: 'u-2:r-data', userId: 'u-2', roleId: 'r-data', isPrimary: false, level: 3 },
    ]);
    const seededMissions = await this.missionRepo.find();
    const categoryDomain: Record<string, string> = { Development: 'd-software', Design: 'd-experience', QA: 'd-quality', Operations: 'd-observability' };
    await this.missionDomainRepo.save(seededMissions.map((mission) => ({
      id: `${mission.id}:${categoryDomain[mission.category] || 'd-software'}`,
      missionId: mission.id,
      domainId: categoryDomain[mission.category] || 'd-software',
      isPrimary: true,
    })));
    return this.getAppState();
  }
}
