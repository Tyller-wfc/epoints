import { calculateMissionAdjustment, calculateServicePoints, calculateServiceScore, CustomerServiceService } from './customer-service.service';
import { CustomerServiceController } from './customer-service.controller';

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
  const mockPiiService = {
    decrypt: jest.fn((val) => `decrypted-${val}`),
    mask: jest.fn((val) => val),
  };
  const mockDataSource = {
    transaction: jest.fn(async (callback) => {
      const manager = {
        save: jest.fn((_entityClass, entity) => Promise.resolve(entity)),
        create: jest.fn((_entityClass, entity) => entity),
      };
      return callback(manager);
    }),
  };
  const mockEpointsService = {
    autoUpdateActiveDuty: jest.fn(),
    sendServiceWecomNotification: jest.fn(),
    pushFeed: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
      mockPiiService as any,
      mockDataSource as any,
      mockEpointsService as any,
    );
  });

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

    const result = await service.createRecord('u-2', payload);
    expect(result).toBeDefined();
    expect(mockEpointsService.pushFeed).toHaveBeenCalledWith(
      'system',
      expect.stringContaining('【企业微信通知失败】服务“日常运维答疑”已登记，但消息推送失败：Webhook 网络连接超时'),
    );
  });
});
