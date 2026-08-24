import { BadRequestException } from '@nestjs/common';
import { Duty } from './entities/duty.entity';
import { EpointsService } from './epoints.service';

describe('Duty Scheduling & Conflict Validation', () => {
  let service: EpointsService;
  let mockDutyRepo: any;
  let mockUserRepo: any;
  let mockSettingRepo: any;
  let dutiesInDb: Duty[] = [];

  beforeEach(() => {
    dutiesInDb = [];

    mockDutyRepo = {
      find: jest.fn().mockImplementation(async () => [...dutiesInDb]),
      findOne: jest.fn().mockImplementation(async (query: any) => {
        if (query?.where?.id) return dutiesInDb.find(d => d.id === query.where.id) || null;
        if (query?.where?.is_active) return dutiesInDb.find(d => d.is_active) || null;
        return null;
      }),
      create: jest.fn().mockImplementation((dto: any) => ({ ...dto })),
      save: jest.fn().mockImplementation(async (entity: any) => {
        if (Array.isArray(entity)) {
          for (const item of entity) {
            const idx = dutiesInDb.findIndex(d => d.id === item.id);
            if (idx >= 0) dutiesInDb[idx] = item;
            else dutiesInDb.push(item);
          }
          return entity;
        } else {
          const idx = dutiesInDb.findIndex(d => d.id === entity.id);
          if (idx >= 0) dutiesInDb[idx] = entity;
          else dutiesInDb.push(entity);
          return entity;
        }
      }),
      delete: jest.fn().mockImplementation(async (query: any) => {
        if (query?.id) {
          dutiesInDb = dutiesInDb.filter(d => d.id !== query.id);
        }
        return { affected: 1 };
      }),
    };

    mockUserRepo = {
      findOne: jest.fn().mockImplementation(async (query: any) => {
        if (query?.where?.id === 'admin-1') return { id: 'admin-1', name: 'Admin', roleType: 'Admin' };
        if (query?.where?.id === 'user-1') return { id: 'user-1', name: '张三', roleType: 'Engineer' };
        if (query?.where?.id === 'user-2') return { id: 'user-2', name: '李四', roleType: 'Engineer' };
        return null;
      }),
    };

    mockSettingRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation(async (entity) => entity),
    };

    service = Object.create(EpointsService.prototype);
    (service as any).userRepo = mockUserRepo;
    (service as any).dutyRepo = mockDutyRepo;
    (service as any).settingRepo = mockSettingRepo;
    (service as any).pushFeed = jest.fn().mockResolvedValue(undefined);
    (service as any).getAppState = jest.fn().mockImplementation(async () => ({ duty: dutiesInDb }));
    (service as any).autoUpdateActiveDuty = jest.fn().mockResolvedValue(undefined);
  });

  it('should successfully create duty for multiple dates', async () => {
    await service.createDuty('admin-1', {
      userId: 'user-1',
      dutyDates: ['2026-08-25', '2026-08-26', '2026-08-27'],
      shiftStart: '08:00',
      shiftEnd: '18:00',
    });

    expect(dutiesInDb.length).toBe(3);
    expect(dutiesInDb.map(d => d.duty_date)).toEqual(['2026-08-25', '2026-08-26', '2026-08-27']);
    expect(dutiesInDb.every(d => d.user_id === 'user-1')).toBe(true);
  });

  it('should reject when there is a time overlap conflict on the same date', async () => {
    // Existing duty on 2026-08-25 08:00–18:00 for 张三
    dutiesInDb.push({
      id: 'duty-existing-1',
      user_id: 'user-1',
      duty_date: '2026-08-25',
      shift_start: '08:00',
      shift_end: '18:00',
      is_active: false,
    });

    // Attempt to schedule 李四 on 2026-08-25 00:00–24:00 without replacement
    await expect(
      service.createDuty('admin-1', {
        userId: 'user-2',
        dutyDates: ['2026-08-25'],
        shiftStart: '00:00',
        shiftEnd: '24:00',
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow replacement when replaceDutyIds is provided to resolve conflict', async () => {
    // Existing duty on 2026-08-25 08:00–18:00 for 张三
    dutiesInDb.push({
      id: 'duty-existing-1',
      user_id: 'user-1',
      duty_date: '2026-08-25',
      shift_start: '08:00',
      shift_end: '18:00',
      is_active: false,
    });

    // Admin selects to replace duty-existing-1
    await service.createDuty('admin-1', {
      userId: 'user-2',
      dutyDates: ['2026-08-25', '2026-08-26'],
      shiftStart: '08:00',
      shiftEnd: '18:00',
      replaceDutyIds: ['duty-existing-1'],
    });

    expect(dutiesInDb.find(d => d.id === 'duty-existing-1')).toBeUndefined();
    expect(dutiesInDb.length).toBe(2);
    expect(dutiesInDb.every(d => d.user_id === 'user-2')).toBe(true);
  });

  it('should allow non-overlapping shifts on the same day (e.g. 早班 vs 晚班)', async () => {
    // Early shift 08:00–18:00 for 张三
    dutiesInDb.push({
      id: 'duty-early',
      user_id: 'user-1',
      duty_date: '2026-08-25',
      shift_start: '08:00',
      shift_end: '18:00',
      is_active: false,
    });

    // Evening shift 18:00–24:00 for 李四
    await service.createDuty('admin-1', {
      userId: 'user-2',
      dutyDates: ['2026-08-25'],
      shiftStart: '18:00',
      shiftEnd: '24:00',
    });

    expect(dutiesInDb.length).toBe(2);
  });
});
