import { calculateMissionAdjustment, calculateServicePoints, calculateServiceScore, CustomerServiceService } from './customer-service.service';

describe('customer service scoring rules', () => {
  it('weights customer outcome highest', () => {
    expect(calculateServiceScore([100, 80])).toBe(92);
    expect(calculateServiceScore([80, 100])).toBe(88);
  });

  it.each([
    [90, 150],
    [80, 120],
    [70, 100],
    [69, 0],
  ])('converts score %i to the configured point tier', (score, expected) => {
    expect(calculateServicePoints(100, score)).toBe(expected);
  });

  it('adjusts linked mission points by quality score', () => {
    expect(calculateMissionAdjustment(600, 92)).toBe(120);
    expect(calculateMissionAdjustment(600, 65)).toBe(-120);
  });
});

describe('CustomerServiceService createRecord notifications', () => {
  let service: CustomerServiceService;
  let lastTransactionManager: any;
  const mockCustomerRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockRecordRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const mockParticipantRepo = {
    find: jest.fn(),
    exists: jest.fn(),
  };
  const mockFeedbackRepo = {
    find: jest.fn(),
  };
  const mockEvaluationRepo = {
    find: jest.fn(),
  };
  const mockLedgerRepo = {
    find: jest.fn(),
  };
  const mockUserRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockDutyRepo = {
    findOne: jest.fn(),
  };
  const mockMissionRepo = {
    find: jest.fn(),
  };
  const mockMissionLinkRepo = {
    find: jest.fn(),
  };
  const mockAttachmentRepo = {
    find: jest.fn(),
  };
  const mockStorageService = {
    uploadFiles: jest.fn(),
    deleteObjects: jest.fn(),
  };
  const mockPiiService = {
    decrypt: jest.fn((val) => `decrypted-${val}`),
    mask: jest.fn((val) => val),
  };
  const mockDataSource = {
    transaction: jest.fn(async (callback) => {
      lastTransactionManager = {
        save: jest.fn((_entityClass, entity) => Promise.resolve(entity)),
        create: jest.fn((_entityClass, entity) => entity),
        delete: jest.fn(() => Promise.resolve()),
      };
      return callback(lastTransactionManager);
    }),
  };
  const mockEpointsService = {
    autoUpdateActiveDuty: jest.fn(),
    sendServiceWecomNotification: jest.fn(),
    pushFeed: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    lastTransactionManager = null;
    mockEpointsService.autoUpdateActiveDuty.mockResolvedValue(undefined);
    mockEpointsService.sendServiceWecomNotification.mockResolvedValue(undefined);
    mockEpointsService.pushFeed.mockResolvedValue(undefined);
    mockAttachmentRepo.find.mockResolvedValue([]);
    mockStorageService.uploadFiles.mockResolvedValue([]);
    mockStorageService.deleteObjects.mockResolvedValue(undefined);
    service = new CustomerServiceService(
      mockCustomerRepo as any,
      mockRecordRepo as any,
      mockParticipantRepo as any,
      mockFeedbackRepo as any,
      mockEvaluationRepo as any,
      mockLedgerRepo as any,
      mockUserRepo as any,
      mockDutyRepo as any,
      mockMissionRepo as any,
      mockMissionLinkRepo as any,
      mockAttachmentRepo as any,
      mockStorageService as any,
      mockPiiService as any,
      mockDataSource as any,
      mockEpointsService as any,
    );
  });

  const mockEmptyCenter = (requester: any, users: any[] = [requester]) => {
    mockUserRepo.findOne.mockResolvedValue(requester);
    mockParticipantRepo.find.mockResolvedValue([]);
    mockRecordRepo.find.mockResolvedValue([]);
    mockCustomerRepo.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });
    mockUserRepo.find.mockResolvedValue(users);
    mockLedgerRepo.find.mockResolvedValue([]);
    mockDutyRepo.findOne.mockResolvedValue(null);
    mockMissionRepo.find.mockResolvedValue([]);
    mockAttachmentRepo.find.mockResolvedValue([]);
  };

  it('sends WeCom notification to service participants on createRecord', async () => {
    const creatorUser = { id: 'u-2', name: '王方超', roleType: 'Admin', enabled: true };
    const participantUser = { id: 'u-3', name: '张工', phoneEncrypted: 'enc-13800138000', enabled: true, availability: 'Available' };
    const customer = { id: 'c-1', name: '某某科技有限公司', organization: '技术部', enabled: true };

    mockUserRepo.findOne.mockResolvedValue(creatorUser);
    mockCustomerRepo.findOne.mockResolvedValue(customer);

    const mockQueryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([participantUser]),
    };
    mockUserRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    // Mock getCenter dependencies
    mockParticipantRepo.find.mockResolvedValue([]);
    mockRecordRepo.find.mockResolvedValue([]);
    mockCustomerRepo.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });
    mockUserRepo.find.mockResolvedValue([creatorUser, participantUser]);
    mockLedgerRepo.find.mockResolvedValue([]);
    mockDutyRepo.findOne.mockResolvedValue(null);
    mockMissionRepo.find.mockResolvedValue([]);

    const payload = {
      customerId: 'c-1',
      title: '生产环境部署技术支持',
      description: '协助客户完成生产环境首次部署',
      promisedResult: '系统正常上线并输出运维文档',
      priority: 'P1',
      serviceMode: 'Work Hours',
      settlementMode: 'Standalone',
      basePoints: 120,
      participants: [
        { userId: 'u-3', participantRole: 'Service Owner', contributionWeight: 100, responsibility: '全面负责技术支持与交付' },
      ],
    };

    await service.createRecord('u-2', payload, 'http://localhost:5173');

    expect(mockEpointsService.sendServiceWecomNotification).toHaveBeenCalledTimes(1);
    const [savedRecord, notifiedCustomer, creatorName, participants, origin] = mockEpointsService.sendServiceWecomNotification.mock.calls[0];
    expect(savedRecord.title).toBe('生产环境部署技术支持');
    expect(savedRecord.priority).toBe('P1');
    expect(savedRecord.basePoints).toBe(120);
    expect(notifiedCustomer.name).toBe('某某科技有限公司');
    expect(creatorName).toBe('王方超');
    expect(origin).toBe('http://localhost:5173');
    expect(participants).toHaveLength(1);
    expect(participants[0].user.id).toBe('u-3');
    expect(participants[0].phone).toBe('decrypted-enc-13800138000');
    expect(participants[0].role).toBe('Service Owner');
  });

  it('saves uploaded attachments against the created service record', async () => {
    const creatorUser = { id: 'u-2', name: '王方超', roleType: 'Admin', enabled: true };
    const participantUser = { id: 'u-3', name: '张工', phoneEncrypted: 'enc-13800138000', enabled: true, availability: 'Available' };
    const customer = { id: 'c-1', name: '某某科技有限公司', organization: '技术部', enabled: true };
    const uploadedAttachment = {
      id: 'att-1',
      ownerType: 'service',
      ownerId: 'sr-any',
      originalName: '需求说明.pdf',
      objectKey: 'service/2026/08/att-1.pdf',
      mimeType: 'application/pdf',
      fileSize: 128,
      checksum: 'hash',
      isImage: false,
      uploadedBy: 'u-2',
    };

    mockUserRepo.findOne.mockResolvedValue(creatorUser);
    mockCustomerRepo.findOne.mockResolvedValue(customer);
    mockUserRepo.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([participantUser]),
    });
    mockEmptyCenter(creatorUser, [creatorUser, participantUser]);
    mockStorageService.uploadFiles.mockResolvedValue([uploadedAttachment]);

    await service.createRecord('u-2', {
      customerId: 'c-1',
      title: '带附件的客户服务',
      description: '协助客户确认需求材料',
      promisedResult: '输出处理结果',
      priority: 'P2',
      serviceMode: 'Work Hours',
      settlementMode: 'Standalone',
      basePoints: 100,
      participants: [
        { userId: 'u-3', participantRole: 'Service Owner', contributionWeight: 100, responsibility: '负责处理' },
      ],
    }, '', [{ originalname: '需求说明.pdf' }] as any);

    expect(mockStorageService.uploadFiles).toHaveBeenCalledWith('service', expect.stringMatching(/^sr-/), 'u-2', expect.any(Array));
    expect(lastTransactionManager.save).toHaveBeenCalledWith(expect.anything(), [uploadedAttachment]);
  });

  it('handles WeCom notification failure gracefully without interrupting service creation', async () => {
    const creatorUser = { id: 'u-2', name: '王方超', roleType: 'Admin', enabled: true };
    const participantUser = { id: 'u-3', name: '张工', phoneEncrypted: 'enc-13800138000', enabled: true, availability: 'Available' };
    const customer = { id: 'c-1', name: '某某科技有限公司', enabled: true };

    mockUserRepo.findOne.mockResolvedValue(creatorUser);
    mockCustomerRepo.findOne.mockResolvedValue(customer);

    const mockQueryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([participantUser]),
    };
    mockUserRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    mockParticipantRepo.find.mockResolvedValue([]);
    mockRecordRepo.find.mockResolvedValue([]);
    mockCustomerRepo.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });
    mockUserRepo.find.mockResolvedValue([creatorUser, participantUser]);
    mockLedgerRepo.find.mockResolvedValue([]);
    mockDutyRepo.findOne.mockResolvedValue(null);
    mockMissionRepo.find.mockResolvedValue([]);

    mockEpointsService.sendServiceWecomNotification.mockRejectedValue(new Error('Webhook 网络连接超时'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const payload = {
      customerId: 'c-1',
      title: '日常运维答疑',
      description: '日常技术问题沟通',
      promisedResult: '解答客户技术疑问',
      priority: 'Normal',
      serviceMode: 'Work Hours',
      settlementMode: 'Standalone',
      basePoints: 100,
      participants: [
        { userId: 'u-3', participantRole: 'Service Owner', contributionWeight: 100, responsibility: '负责解答' },
      ],
    };

    try {
      const result = await service.createRecord('u-2', payload);
      expect(result).toBeDefined();
      expect(mockEpointsService.pushFeed).toHaveBeenCalledWith(
        'system',
        expect.stringContaining('【企业微信通知失败】服务“日常运维答疑”已登记，但消息推送失败：Webhook 网络连接超时'),
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('allows the assigned participant to accept a newly assigned service record', async () => {
    const participant = { id: 'u-3', name: '张工', roleType: 'Engineer', enabled: true };
    const record = { id: 'sr-1', status: 'New', startedAt: null, returnReason: '旧原因', returnedAt: new Date() };
    mockRecordRepo.findOne.mockResolvedValue(record);
    mockParticipantRepo.exists.mockResolvedValue(true);
    mockRecordRepo.save.mockImplementation(async (item) => item);
    mockEmptyCenter(participant);

    await service.transitionRecord('u-3', 'sr-1', { status: 'Accepted' });

    expect(record.status).toBe('Accepted');
    expect(record.startedAt).toBeInstanceOf(Date);
    expect(record.returnReason).toBeNull();
    expect(record.returnedAt).toBeNull();
    expect(mockRecordRepo.save).toHaveBeenCalledWith(record);
  });

  it('allows the assigned participant to return a service record with a reason', async () => {
    const participant = { id: 'u-3', name: '张工', roleType: 'Engineer', enabled: true };
    const record = {
      id: 'sr-1',
      status: 'New',
      completedAt: new Date(),
      customerConfirmedAt: new Date(),
      resultSummary: '旧结果',
      returnReason: null,
      returnedAt: null,
      customerSatisfaction: 'Satisfied',
    };
    mockRecordRepo.findOne.mockResolvedValue(record);
    mockParticipantRepo.exists.mockResolvedValue(true);
    mockRecordRepo.save.mockImplementation(async (item) => item);
    mockEmptyCenter(participant);

    await service.transitionRecord('u-3', 'sr-1', { status: 'Returned', returnReason: '需要数据库权限人员处理' });

    expect(record.status).toBe('Returned');
    expect(record.returnReason).toBe('需要数据库权限人员处理');
    expect(record.returnedAt).toBeInstanceOf(Date);
    expect(record.completedAt).toBeNull();
    expect(record.customerConfirmedAt).toBeNull();
    expect(record.resultSummary).toBeNull();
    expect(record.customerSatisfaction).toBeNull();
  });

  it('lets an admin edit a returned record and reassign it back to pending acceptance', async () => {
    const admin = { id: 'u-2', name: '王方超', roleType: 'Admin', enabled: true };
    const participantUser = { id: 'u-4', name: '李工', phoneEncrypted: 'enc-13900139000', enabled: true, availability: 'Available' };
    const customer = { id: 'c-1', name: '某某科技有限公司', organization: '技术部', enabled: true };
    const record = {
      id: 'sr-1',
      customerId: 'c-old',
      title: '旧标题',
      serviceType: '咨询支持',
      description: '旧需求',
      promisedResult: '旧承诺',
      priority: 'P3',
      serviceMode: 'Work Hours',
      settlementMode: 'Standalone',
      basePoints: 100,
      startedAt: null,
      promisedAt: null,
      completedAt: null,
      customerConfirmedAt: null,
      resultSummary: null,
      returnReason: '人员不匹配',
      returnedAt: new Date(),
      customerSatisfaction: null,
      status: 'Returned',
    };
    mockUserRepo.findOne.mockResolvedValue(admin);
    mockRecordRepo.findOne.mockResolvedValue(record);
    mockCustomerRepo.findOne.mockResolvedValue(customer);
    mockUserRepo.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([participantUser]),
    });
    mockEmptyCenter(admin, [admin, participantUser]);

    await service.updateReturnedRecord('u-2', 'sr-1', {
      customerId: 'c-1',
      title: '重新分配后的服务',
      serviceType: '运维保障',
      description: '更新后的客户需求',
      promisedResult: '更新后的交付承诺',
      priority: 'P1',
      serviceMode: 'Work Hours',
      settlementMode: 'Standalone',
      basePoints: 150,
      participants: [
        { userId: 'u-4', participantRole: 'Service Owner', contributionWeight: 100, responsibility: '重新负责交付' },
      ],
    });

    expect(record.status).toBe('New');
    expect(record.title).toBe('重新分配后的服务');
    expect(record.customerId).toBe('c-1');
    expect(record.returnReason).toBeNull();
    expect(record.returnedAt).toBeNull();
    expect(lastTransactionManager.delete).toHaveBeenCalledWith(expect.anything(), { serviceRecordId: 'sr-1' });
    expect(mockEpointsService.sendServiceWecomNotification).toHaveBeenCalledTimes(1);
  });
});
