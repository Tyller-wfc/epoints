import { BadRequestException } from '@nestjs/common';
import { EpointsService } from './epoints.service';

describe('Reward CashOut Workflow (Free Points Input)', () => {
  let service: EpointsService;
  let users: any[];
  let rewards: any[];
  let transactions: any[];
  let mockUserRepo: any;
  let mockRewardRepo: any;
  let mockTransactionRepo: any;

  beforeEach(() => {
    users = [
      { id: 'admin-1', name: '系统管理员', roleType: 'Admin', enabled: true, points_balance: 1000 },
      { id: 'user-1', name: '张工', roleType: 'Member', enabled: true, points_balance: 300 },
    ];

    rewards = [
      { id: 'r-cashout', title: '现金折现提现通道', points_cost: 1, inventory: 100, category: 'CashOut' },
      { id: 'r-coffee', title: '精品咖啡券', points_cost: 30, inventory: 10, category: 'Lifestyle' },
    ];

    transactions = [];

    mockUserRepo = {
      findOne: jest.fn(async (query: any) => {
        const id = query?.where?.id;
        return users.find((u) => u.id === id) || null;
      }),
      save: jest.fn(async (user: any) => {
        const idx = users.findIndex((u) => u.id === user.id);
        if (idx >= 0) users[idx] = user;
        return user;
      }),
    };

    mockRewardRepo = {
      findOne: jest.fn(async (query: any) => {
        const id = query?.where?.id;
        return rewards.find((r) => r.id === id) || null;
      }),
      save: jest.fn(async (reward: any) => {
        const idx = rewards.findIndex((r) => r.id === reward.id);
        if (idx >= 0) rewards[idx] = reward;
        return reward;
      }),
    };

    mockTransactionRepo = {
      findOne: jest.fn(async (query: any) => {
        const id = query?.where?.id;
        return transactions.find((t) => t.id === id) || null;
      }),
      save: jest.fn(async (tx: any) => {
        transactions.push(tx);
        return tx;
      }),
    };

    service = Object.create(EpointsService.prototype);
    (service as any).userRepo = mockUserRepo;
    (service as any).rewardRepo = mockRewardRepo;
    (service as any).transactionRepo = mockTransactionRepo;
    (service as any).pushFeed = jest.fn().mockResolvedValue(undefined);
    (service as any).getAppState = jest.fn().mockImplementation((userId) => Promise.resolve({ userId, ok: true }));
    (service as any).assertAdmin = jest.fn().mockResolvedValue(undefined);
  });

  it('allows user to withdraw custom points within available balance', async () => {
    await service.purchaseReward('r-cashout', 'user-1', 120);

    const user = users.find((u) => u.id === 'user-1');
    expect(user.points_balance).toBe(180);

    expect(transactions).toHaveLength(1);
    expect(transactions[0].points_spent).toBe(120);
    expect(transactions[0].status).toBe('Pending Delivery');

    expect((service as any).pushFeed).toHaveBeenCalledWith(
      'system',
      expect.stringContaining('张工 申请积分提现：消耗 120 eP，折现 ¥108.00 元现金打款'),
    );
  });

  it('allows user to withdraw all points (entire balance)', async () => {
    await service.purchaseReward('r-cashout', 'user-1', 300);

    const user = users.find((u) => u.id === 'user-1');
    expect(user.points_balance).toBe(0);

    expect(transactions[0].points_spent).toBe(300);
    expect((service as any).pushFeed).toHaveBeenCalledWith(
      'system',
      expect.stringContaining('张工 申请积分提现：消耗 300 eP，折现 ¥270.00 元现金打款'),
    );
  });

  it('rejects withdrawal if custom points exceed available points', async () => {
    await expect(service.purchaseReward('r-cashout', 'user-1', 301)).rejects.toThrow(
      BadRequestException,
    );
    expect(users.find((u) => u.id === 'user-1').points_balance).toBe(300);
    expect(transactions).toHaveLength(0);
  });

  it('rejects withdrawal if custom points is non-positive or non-integer', async () => {
    await expect(service.purchaseReward('r-cashout', 'user-1', 0)).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.purchaseReward('r-cashout', 'user-1', -50)).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.purchaseReward('r-cashout', 'user-1', 50.5)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('still supports normal fixed rewards without custom points', async () => {
    await service.purchaseReward('r-coffee', 'user-1');

    const user = users.find((u) => u.id === 'user-1');
    expect(user.points_balance).toBe(270);
    expect(transactions[0].points_spent).toBe(30);
    expect((service as any).pushFeed).toHaveBeenCalledWith(
      'system',
      expect.stringContaining('张工 申请兑换福利礼品：精品咖啡券，消耗 30 eP'),
    );
  });

  it('delivers cashout transaction with cash payout feed notification', async () => {
    await service.purchaseReward('r-cashout', 'user-1', 100);
    const txId = transactions[0].id;

    await service.deliverReward('admin-1', txId);

    expect(transactions[0].status).toBe('Delivered');
    expect((service as any).pushFeed).toHaveBeenCalledWith(
      'system',
      expect.stringContaining('【提现打款到账】已向 张工 完成积分提现现金打款：消耗 100 eP，折现实发 ¥90.00 元'),
    );
  });
});
