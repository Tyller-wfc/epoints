import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EpointsService } from './epoints.service';

describe('Mission handoff workflow', () => {
  let service: EpointsService;
  let mission: any;
  let users: any[];
  let mockUserRepo: any;
  let mockMissionRepo: any;
  let mockPointLedgerRepo: any;

  beforeEach(() => {
    mission = {
      id: 'mission-1',
      title: '交接测试任务',
      base_points: 100,
      multiplier: 1.5,
      status: 'In Progress',
      assigned_to: 'member-1',
      publishTarget: 'platform',
      proof_of_work: '旧的成果草稿',
    };
    users = [
      { id: 'u-2', name: '系统管理员', roleType: 'Admin', enabled: true, points_balance: 0, points_earned_lifetime: 0 },
      { id: 'member-1', name: '原承接人', roleType: 'Member', enabled: true, availability: 'Available', points_balance: 10, points_earned_lifetime: 10 },
      { id: 'member-2', name: '接手人', roleType: 'Member', enabled: true, availability: 'Available', points_balance: 20, points_earned_lifetime: 20 },
      { id: 'observer-1', name: '观察者', roleType: 'Observer', enabled: true, availability: 'Available' },
    ];

    mockUserRepo = {
      findOne: jest.fn(async (query: any) => {
        const id = query?.where?.id;
        return id ? users.find((user) => user.id === id) || null : null;
      }),
      find: jest.fn(async (query: any) => {
        if (query?.where?.roleType === 'Admin') {
          return users.filter((user) => user.roleType === 'Admin' && user.enabled);
        }
        return users;
      }),
      save: jest.fn(async (user: any) => user),
    };
    mockMissionRepo = {
      findOne: jest.fn(async () => mission),
      save: jest.fn(async (updatedMission: any) => {
        mission = updatedMission;
        return updatedMission;
      }),
    };
    mockPointLedgerRepo = {
      create: jest.fn((entry: any) => entry),
      save: jest.fn(async (entry: any) => entry),
    };

    service = Object.create(EpointsService.prototype);
    (service as any).userRepo = mockUserRepo;
    (service as any).missionRepo = mockMissionRepo;
    (service as any).pointLedgerRepo = mockPointLedgerRepo;
    (service as any).pushFeed = jest.fn().mockResolvedValue(undefined);
    (service as any).getAppState = jest.fn().mockResolvedValue({ missions: [mission] });
  });

  it('transfers an in-progress mission to another member', async () => {
    await service.transferMission('member-1', 'mission-1', 'member-2');

    expect(mission).toMatchObject({
      assigned_to: 'member-2',
      status: 'In Progress',
      publishTarget: 'platform',
      proof_of_work: '',
    });
    expect((service as any).pushFeed).toHaveBeenCalledWith(
      'mission',
      expect.stringContaining('完成后由接手人获得全部任务积分'),
    );
  });

  it('awards the full mission points to the user who took over and completed it', async () => {
    await service.transferMission('member-1', 'mission-1', 'member-2');
    mission.status = 'Pending Verification';

    await service.verifyMission('u-2', 'mission-1', true);

    expect(users.find((user) => user.id === 'member-2')).toMatchObject({
      points_balance: 170,
      points_earned_lifetime: 170,
    });
    expect(users.find((user) => user.id === 'member-1')).toMatchObject({
      points_balance: 10,
      points_earned_lifetime: 10,
    });
    expect(mockPointLedgerRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'member-2', pointsDelta: 150 }),
    );
  });

  it('returns an in-progress mission to the administrator as a self-managed mission', async () => {
    await service.returnMissionToAdmin('member-1', 'mission-1');

    expect(mission).toMatchObject({
      assigned_to: 'u-2',
      status: 'In Progress',
      publishTarget: 'self',
      proof_of_work: '',
    });
  });

  it('rejects handoff by a non-owner, for a finished workflow, or to an observer', async () => {
    await expect(service.transferMission('member-2', 'mission-1', 'member-1')).rejects.toBeInstanceOf(ForbiddenException);

    mission.status = 'Pending Verification';
    await expect(service.returnMissionToAdmin('member-1', 'mission-1')).rejects.toBeInstanceOf(BadRequestException);

    mission.status = 'In Progress';
    await expect(service.transferMission('member-1', 'mission-1', 'observer-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents the previous assignee from submitting after a transfer', async () => {
    await service.transferMission('member-1', 'mission-1', 'member-2');

    await expect(
      service.submitProof('mission-1', '原承接人尝试提交', 'member-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
