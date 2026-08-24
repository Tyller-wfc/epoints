/**
 * 中国法定节假日及调休、传统节日与公历节日数据及工具库 (2024 - 2028)
 */

// 法定节假日与调休补班明细表（key: 'YYYY-MM-DD'）
// type: 'holiday' (休假) | 'workday' (调休上班)
export const STATUTORY_DAYS = {
  // ── 2024 ──
  '2024-01-01': { name: '元旦', type: 'holiday' },
  '2024-02-04': { name: '春节调休', type: 'workday' },
  '2024-02-10': { name: '春节', type: 'holiday' },
  '2024-02-11': { name: '春节', type: 'holiday' },
  '2024-02-12': { name: '春节', type: 'holiday' },
  '2024-02-13': { name: '春节', type: 'holiday' },
  '2024-02-14': { name: '春节', type: 'holiday' },
  '2024-02-15': { name: '春节', type: 'holiday' },
  '2024-02-16': { name: '春节', type: 'holiday' },
  '2024-02-17': { name: '春节', type: 'holiday' },
  '2024-02-18': { name: '春节调休', type: 'workday' },
  '2024-04-04': { name: '清明节', type: 'holiday' },
  '2024-04-05': { name: '清明节', type: 'holiday' },
  '2024-04-06': { name: '清明节', type: 'holiday' },
  '2024-04-07': { name: '清明调休', type: 'workday' },
  '2024-04-28': { name: '劳动节调休', type: 'workday' },
  '2024-05-01': { name: '劳动节', type: 'holiday' },
  '2024-05-02': { name: '劳动节', type: 'holiday' },
  '2024-05-03': { name: '劳动节', type: 'holiday' },
  '2024-05-04': { name: '劳动节', type: 'holiday' },
  '2024-05-05': { name: '劳动节', type: 'holiday' },
  '2024-05-11': { name: '劳动节调休', type: 'workday' },
  '2024-06-08': { name: '端午节', type: 'holiday' },
  '2024-06-09': { name: '端午节', type: 'holiday' },
  '2024-06-10': { name: '端午节', type: 'holiday' },
  '2024-09-14': { name: '中秋节调休', type: 'workday' },
  '2024-09-15': { name: '中秋节', type: 'holiday' },
  '2024-09-16': { name: '中秋节', type: 'holiday' },
  '2024-09-17': { name: '中秋节', type: 'holiday' },
  '2024-09-29': { name: '国庆节调休', type: 'workday' },
  '2024-10-01': { name: '国庆节', type: 'holiday' },
  '2024-10-02': { name: '国庆节', type: 'holiday' },
  '2024-10-03': { name: '国庆节', type: 'holiday' },
  '2024-10-04': { name: '国庆节', type: 'holiday' },
  '2024-10-05': { name: '国庆节', type: 'holiday' },
  '2024-10-06': { name: '国庆节', type: 'holiday' },
  '2024-10-07': { name: '国庆节', type: 'holiday' },
  '2024-10-12': { name: '国庆节调休', type: 'workday' },

  // ── 2025 ──
  '2025-01-01': { name: '元旦', type: 'holiday' },
  '2025-01-26': { name: '春节调休', type: 'workday' },
  '2025-01-28': { name: '除夕/春节', type: 'holiday' },
  '2025-01-29': { name: '春节', type: 'holiday' },
  '2025-01-30': { name: '春节', type: 'holiday' },
  '2025-01-31': { name: '春节', type: 'holiday' },
  '2025-02-01': { name: '春节', type: 'holiday' },
  '2025-02-02': { name: '春节', type: 'holiday' },
  '2025-02-03': { name: '春节', type: 'holiday' },
  '2025-02-04': { name: '春节', type: 'holiday' },
  '2025-02-08': { name: '春节调休', type: 'workday' },
  '2025-04-04': { name: '清明节', type: 'holiday' },
  '2025-04-05': { name: '清明节', type: 'holiday' },
  '2025-04-06': { name: '清明节', type: 'holiday' },
  '2025-04-27': { name: '劳动节调休', type: 'workday' },
  '2025-05-01': { name: '劳动节', type: 'holiday' },
  '2025-05-02': { name: '劳动节', type: 'holiday' },
  '2025-05-03': { name: '劳动节', type: 'holiday' },
  '2025-05-04': { name: '劳动节', type: 'holiday' },
  '2025-05-05': { name: '劳动节', type: 'holiday' },
  '2025-05-31': { name: '端午节', type: 'holiday' },
  '2025-06-01': { name: '端午节', type: 'holiday' },
  '2025-06-02': { name: '端午节', type: 'holiday' },
  '2025-09-28': { name: '国庆中秋调休', type: 'workday' },
  '2025-10-01': { name: '国庆节', type: 'holiday' },
  '2025-10-02': { name: '国庆节', type: 'holiday' },
  '2025-10-03': { name: '国庆节', type: 'holiday' },
  '2025-10-04': { name: '国庆节', type: 'holiday' },
  '2025-10-05': { name: '国庆节', type: 'holiday' },
  '2025-10-06': { name: '中秋节', type: 'holiday' },
  '2025-10-07': { name: '国庆节', type: 'holiday' },
  '2025-10-08': { name: '国庆节', type: 'holiday' },
  '2025-10-11': { name: '国庆中秋调休', type: 'workday' },

  // ── 2026 ──
  '2026-01-01': { name: '元旦', type: 'holiday' },
  '2026-01-02': { name: '元旦', type: 'holiday' },
  '2026-01-03': { name: '元旦', type: 'holiday' },
  '2026-01-04': { name: '元旦调休', type: 'workday' },
  '2026-02-14': { name: '春节调休', type: 'workday' },
  '2026-02-16': { name: '除夕/春节', type: 'holiday' },
  '2026-02-17': { name: '春节(初一)', type: 'holiday' },
  '2026-02-18': { name: '春节(初二)', type: 'holiday' },
  '2026-02-19': { name: '春节(初三)', type: 'holiday' },
  '2026-02-20': { name: '春节(初四)', type: 'holiday' },
  '2026-02-21': { name: '春节(初五)', type: 'holiday' },
  '2026-02-22': { name: '春节(初六)', type: 'holiday' },
  '2026-02-23': { name: '春节(初七)', type: 'holiday' },
  '2026-02-28': { name: '春节调休', type: 'workday' },
  '2026-04-04': { name: '清明节', type: 'holiday' },
  '2026-04-05': { name: '清明节', type: 'holiday' },
  '2026-04-06': { name: '清明节', type: 'holiday' },
  '2026-04-26': { name: '劳动节调休', type: 'workday' },
  '2026-05-01': { name: '劳动节', type: 'holiday' },
  '2026-05-02': { name: '劳动节', type: 'holiday' },
  '2026-05-03': { name: '劳动节', type: 'holiday' },
  '2026-05-04': { name: '劳动节', type: 'holiday' },
  '2026-05-05': { name: '劳动节', type: 'holiday' },
  '2026-05-09': { name: '劳动节调休', type: 'workday' },
  '2026-06-19': { name: '端午节', type: 'holiday' },
  '2026-06-20': { name: '端午节', type: 'holiday' },
  '2026-06-21': { name: '端午节', type: 'holiday' },
  '2026-09-25': { name: '中秋节', type: 'holiday' },
  '2026-09-26': { name: '中秋节', type: 'holiday' },
  '2026-09-27': { name: '中秋/国庆调休', type: 'workday' },
  '2026-10-01': { name: '国庆节', type: 'holiday' },
  '2026-10-02': { name: '国庆节', type: 'holiday' },
  '2026-10-03': { name: '国庆节', type: 'holiday' },
  '2026-10-04': { name: '国庆节', type: 'holiday' },
  '2026-10-05': { name: '国庆节', type: 'holiday' },
  '2026-10-06': { name: '国庆节', type: 'holiday' },
  '2026-10-07': { name: '国庆节', type: 'holiday' },
  '2026-10-10': { name: '国庆节调休', type: 'workday' },

  // ── 2027 ──
  '2027-01-01': { name: '元旦', type: 'holiday' },
  '2027-01-02': { name: '元旦', type: 'holiday' },
  '2027-01-03': { name: '元旦', type: 'holiday' },
  '2027-02-05': { name: '除夕/春节', type: 'holiday' },
  '2027-02-06': { name: '春节调休', type: 'workday' },
  '2027-02-07': { name: '春节', type: 'holiday' },
  '2027-02-08': { name: '春节', type: 'holiday' },
  '2027-02-09': { name: '春节', type: 'holiday' },
  '2027-02-10': { name: '春节', type: 'holiday' },
  '2027-02-11': { name: '春节', type: 'holiday' },
  '2027-02-12': { name: '春节', type: 'holiday' },
  '2027-02-20': { name: '春节调休', type: 'workday' },
  '2027-04-03': { name: '清明节', type: 'holiday' },
  '2027-04-04': { name: '清明节', type: 'holiday' },
  '2027-04-05': { name: '清明节', type: 'holiday' },
  '2027-04-25': { name: '劳动节调休', type: 'workday' },
  '2027-05-01': { name: '劳动节', type: 'holiday' },
  '2027-05-02': { name: '劳动节', type: 'holiday' },
  '2027-05-03': { name: '劳动节', type: 'holiday' },
  '2027-05-04': { name: '劳动节', type: 'holiday' },
  '2027-05-05': { name: '劳动节', type: 'holiday' },
  '2027-05-08': { name: '劳动节调休', type: 'workday' },
  '2027-06-09': { name: '端午节', type: 'holiday' },
  '2027-06-10': { name: '端午节', type: 'holiday' },
  '2027-06-11': { name: '端午节', type: 'holiday' },
  '2027-09-15': { name: '中秋节', type: 'holiday' },
  '2027-09-26': { name: '国庆节调休', type: 'workday' },
  '2027-10-01': { name: '国庆节', type: 'holiday' },
  '2027-10-02': { name: '国庆节', type: 'holiday' },
  '2027-10-03': { name: '国庆节', type: 'holiday' },
  '2027-10-04': { name: '国庆节', type: 'holiday' },
  '2027-10-05': { name: '国庆节', type: 'holiday' },
  '2027-10-06': { name: '国庆节', type: 'holiday' },
  '2027-10-07': { name: '国庆节', type: 'holiday' },
  '2027-10-09': { name: '国庆节调休', type: 'workday' },

  // ── 2028 ──
  '2028-01-01': { name: '元旦', type: 'holiday' },
  '2028-01-02': { name: '元旦', type: 'holiday' },
  '2028-01-03': { name: '元旦', type: 'holiday' },
  '2028-01-25': { name: '除夕/春节', type: 'holiday' },
  '2028-01-26': { name: '春节', type: 'holiday' },
  '2028-01-27': { name: '春节', type: 'holiday' },
  '2028-01-28': { name: '春节', type: 'holiday' },
  '2028-01-29': { name: '春节', type: 'holiday' },
  '2028-01-30': { name: '春节', type: 'holiday' },
  '2028-01-31': { name: '春节', type: 'holiday' },
  '2028-02-01': { name: '春节', type: 'holiday' },
  '2028-04-04': { name: '清明节', type: 'holiday' },
  '2028-04-05': { name: '清明节', type: 'holiday' },
  '2028-04-06': { name: '清明节', type: 'holiday' },
  '2028-05-01': { name: '劳动节', type: 'holiday' },
  '2028-05-02': { name: '劳动节', type: 'holiday' },
  '2028-05-03': { name: '劳动节', type: 'holiday' },
  '2028-05-04': { name: '劳动节', type: 'holiday' },
  '2028-05-05': { name: '劳动节', type: 'holiday' },
  '2028-05-28': { name: '端午节', type: 'holiday' },
  '2028-05-29': { name: '端午节', type: 'holiday' },
  '2028-05-30': { name: '端午节', type: 'holiday' },
  '2028-10-01': { name: '国庆节', type: 'holiday' },
  '2028-10-02': { name: '国庆节', type: 'holiday' },
  '2028-10-03': { name: '中秋节', type: 'holiday' },
  '2028-10-04': { name: '国庆节', type: 'holiday' },
  '2028-10-05': { name: '国庆节', type: 'holiday' },
  '2028-10-06': { name: '国庆节', type: 'holiday' },
  '2028-10-07': { name: '国庆节', type: 'holiday' },
  '2028-10-08': { name: '国庆节', type: 'holiday' },
};

// 公历固定节日表（key: 'MM-DD'）
export const SOLAR_FESTIVALS = {
  '01-01': '元旦',
  '02-14': '情人节',
  '03-08': '妇女节',
  '03-12': '植树节',
  '04-01': '愚人节',
  '05-01': '劳动节',
  '05-04': '青年节',
  '06-01': '儿童节',
  '07-01': '建党节',
  '08-01': '建军节',
  '09-10': '教师节',
  '10-01': '国庆节',
  '10-24': '程序员节',
  '12-24': '平安夜',
  '12-25': '圣诞节',
};

// 传统农历节日表（年份-月-日）
export const TRADITIONAL_FESTIVALS = {
  // 2024
  '2024-02-09': '除夕',
  '2024-02-10': '春节',
  '2024-02-24': '元宵节',
  '2024-04-04': '清明节',
  '2024-06-10': '端午节',
  '2024-08-10': '七夕节',
  '2024-08-18': '中元节',
  '2024-09-17': '中秋节',
  '2024-10-11': '重阳节',
  '2025-01-07': '腊八节',

  // 2025
  '2025-01-28': '除夕',
  '2025-01-29': '春节',
  '2025-02-12': '元宵节',
  '2025-04-04': '清明节',
  '2025-05-31': '端午节',
  '2025-08-29': '七夕节',
  '2025-09-06': '中元节',
  '2025-10-06': '中秋节',
  '2025-10-29': '重阳节',
  '2026-01-26': '腊八节',

  // 2026
  '2026-02-16': '除夕',
  '2026-02-17': '春节',
  '2026-03-03': '元宵节',
  '2026-04-05': '清明节',
  '2026-06-19': '端午节',
  '2026-08-19': '七夕节',
  '2026-08-26': '中元节',
  '2026-09-25': '中秋节',
  '2026-10-18': '重阳节',
  '2027-01-16': '腊八节',

  // 2027
  '2027-02-05': '除夕',
  '2027-02-06': '春节',
  '2027-02-21': '元宵节',
  '2027-04-05': '清明节',
  '2027-06-09': '端午节',
  '2027-08-08': '七夕节',
  '2027-08-16': '中元节',
  '2027-09-15': '中秋节',
  '2027-10-08': '重阳节',
  '2028-01-05': '腊八节',

  // 2028
  '2028-01-25': '除夕',
  '2028-01-26': '春节',
  '2028-02-09': '元宵节',
  '2028-04-04': '清明节',
  '2028-05-28': '端午节',
  '2028-08-26': '七夕节',
  '2028-09-03': '中元节',
  '2028-10-03': '中秋节',
  '2028-10-26': '重阳节',
};

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/**
 * 获取某个日期的完整节假日与属性信息
 * @param {string} dateStr 'YYYY-MM-DD'
 * @returns {object}
 */
export function getHolidayInfo(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { isHoliday: false, isWorkday: false, isWeekend: false, holidayName: null, badgeText: null, badgeType: null, weekdayName: '' };
  }

  const d = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const weekdayName = WEEKDAY_NAMES[dayOfWeek];
  const mmdd = dateStr.slice(5);

  const stat = STATUTORY_DAYS[dateStr];
  const trad = TRADITIONAL_FESTIVALS[dateStr];
  const solar = SOLAR_FESTIVALS[mmdd];

  // 1. 优先法定节假日/调休
  if (stat) {
    if (stat.type === 'holiday') {
      return {
        isHoliday: true,
        isWorkday: false,
        isWeekend,
        holidayName: stat.name,
        badgeText: '休',
        badgeType: 'holiday',
        weekdayName,
      };
    } else if (stat.type === 'workday') {
      return {
        isHoliday: false,
        isWorkday: true,
        isWeekend,
        holidayName: stat.name,
        badgeText: '班',
        badgeType: 'workday',
        weekdayName,
      };
    }
  }

  // 2. 传统或公历节日
  const festName = trad || solar;
  if (festName) {
    return {
      isHoliday: isWeekend,
      isWorkday: false,
      isWeekend,
      holidayName: festName,
      badgeText: isWeekend ? '休' : '节',
      badgeType: isWeekend ? 'holiday' : 'festival',
      weekdayName,
    };
  }

  // 3. 普通周末
  if (isWeekend) {
    return {
      isHoliday: true,
      isWorkday: false,
      isWeekend: true,
      holidayName: '周末',
      badgeText: '休',
      badgeType: 'weekend',
      weekdayName,
    };
  }

  // 4. 普通工作日
  return {
    isHoliday: false,
    isWorkday: false,
    isWeekend: false,
    holidayName: null,
    badgeText: null,
    badgeType: null,
    weekdayName,
  };
}

/**
 * 格式化日期及节日显示
 * 例：'2026-08-24（周一）' 或 '2026-09-25（周五）中秋节 [休]'
 */
export function formatDateWithHoliday(dateStr) {
  const info = getHolidayInfo(dateStr);
  if (!info.weekdayName) return dateStr || '';
  
  let label = `${dateStr}（${info.weekdayName}）`;
  if (info.holidayName && info.holidayName !== '周末') {
    label += ` ${info.holidayName}`;
  }
  if (info.badgeText && info.badgeType !== 'weekend') {
    label += ` [${info.badgeText}]`;
  }
  return label;
}
