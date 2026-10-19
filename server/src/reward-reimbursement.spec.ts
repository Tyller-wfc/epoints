import { BadRequestException } from '@nestjs/common';
import { EpointsService } from './epoints.service';

describe('Reward Reimbursement Workflow (Free Points Input & Categories)', () => {
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
      { id: 'user-1', name: '张工', roleType: 'Member', enabled: true, points_balance: 600 },
    ];

    rewards = [
      { id: 'r-reimburse', title: '行政综合报销通道', points_cost: 1, inventory: 9999, category: 'Reimbursement' },
      { id: 'r-taxi', title: '打车出行费用报销包', points_cost: 100, inventory: 50, category: 'Reimbursement' },
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

  it('allows user to reimburse custom points for 住宿票 with 1:1 ratio', async () => {
    await service.purchaseReward('r-reimburse', 'user-1', 260, '住宿票 - 北京出差全季酒店');

    const user = users.find((u) => u.id === 'user-1');
    expect(user.points_balance).toBe(340);

    expect(transactions).toHaveLength(1);
    expect(transactions[0].points_spent).toBe(260);
    expect(transactions[0].remark).toBe('住宿票 - 北京出差全季酒店');
    expect(transactions[0].status).toBe('Pending Delivery');

    expect((service as any).pushFeed).toHaveBeenCalledWith(
      'system',
      expect.stringContaining('张工 申请行政报销 [类目: 住宿票 - 北京出差全季酒店]：消耗 260 eP，核销报销金额 ¥260.00 元'),
    );
  });

  it('allows user to reimburse custom points for 电子产品 (手机/电脑/平板)', async () => {
    await service.purchaseReward('r-reimburse', 'user-1', 500, '电子产品 - 购买华为平板');

    const user = users.find((u) => u.id === 'user-1');
    expect(user.points_balance).toBe(100);

    expect(transactions).toHaveLength(1);
    expect(transactions[0].points_spent).toBe(500);
    expect(transactions[0].remark).toBe('电子产品 - 购买华为平板');

    expect((service as any).pushFeed).toHaveBeenCalledWith(
      'system',
      expect.stringContaining('张工 申请行政报销 [类目: 电子产品 - 购买华为平板]：消耗 500 eP，核销报销金额 ¥500.00 元'),
    );
  });

  it('allows user to reimburse for 办公用品 and 打车票', async () => {
    await service.purchaseReward('r-reimburse', 'user-1', 80, '办公用品 - 打印纸与签字笔');
    await service.purchaseReward('r-reimburse', 'user-1', 50, '打车票 - 滴滴出行行程发票');

    const user = users.find((u) => u.id === 'user-1');
    expect(user.points_balance).toBe(470);
    expect(transactions).toHaveLength(2);
    expect(transactions[0].remark).toBe('办公用品 - 打印纸与签字笔');
    expect(transactions[1].remark).toBe('打车票 - 滴滴出行行程发票');
  });

  it('rejects reimbursement if custom points exceed available points', async () => {
    await expect(
      service.purchaseReward('r-reimburse', 'user-1', 601, '住宿票'),
    ).rejects.toThrow(BadRequestException);
    expect(users.find((u) => u.id === 'user-1').points_balance).toBe(600);
    expect(transactions).toHaveLength(0);
  });

  it('rejects reimbursement if custom points is non-positive or non-integer', async () => {
    await expect(
      service.purchaseReward('r-reimburse', 'user-1', 0, '打车票'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.purchaseReward('r-reimburse', 'user-1', -100, '打车票'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.purchaseReward('r-reimburse', 'user-1', 50.8, '打车票'),
    ).rejects.toThrow(BadRequestException);
  });

  it('delivers reimbursement transaction with 1:1 reimbursement payout feed', async () => {
    await service.purchaseReward('r-reimburse', 'user-1', 200, '住宿票');
    const txId = transactions[0].id;

    await service.deliverReward('admin-1', txId);

    expect(transactions[0].status).toBe('Delivered');
    expect((service as any).pushFeed).toHaveBeenCalledWith(
      'system',
      expect.stringContaining('【报销款发放】已向 张工 完成行政报销款发放 [类目: 住宿票]：消耗 200 eP，报销实发 ¥200.00 元'),
    );
  });
});
