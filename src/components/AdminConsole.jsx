import React, { useState, useMemo } from 'react';
import { PlusCircle, Check, X, SlidersHorizontal, ShoppingCart, UserCheck, Send, Save, Power, CalendarDays, Trash2, Clock, ChevronLeft, ChevronRight, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import AttachmentPicker from './AttachmentPicker';
import PersonnelManager from './PersonnelManager';
import { getHolidayInfo } from '../utils/holidays';

// ─── 排班管理子组件 ────────────────────────────────────────────────────────────
function DutyScheduler({ duty, users, onSetActiveDuty, onCreateDuty, onDeleteDuty }) {
  // 周视图偏移（0 = 本周）
  const [weekOffset, setWeekOffset] = useState(0);

  // 新增排班表单状态
  const [formUserId, setFormUserId] = useState(users[0]?.id || '');
  // 多选日期状态（支持多个日期）
  const [selectedDates, setSelectedDates] = useState(() => [new Date().toISOString().slice(0, 10)]);
  const [formShiftPreset, setFormShiftPreset] = useState('全天');
  const [formStart, setFormStart] = useState('00:00');
  const [formEnd, setFormEnd] = useState('24:00');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // 日历视图当前月份
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());
  // 是否展示日历选择面板
  const [showCalendarGrid, setShowCalendarGrid] = useState(true);

  // 冲突协商弹窗状态
  const [conflictModalData, setConflictModalData] = useState(null);

  const SHIFT_PRESETS = {
    '全天':   { start: '00:00', end: '24:00' },
    '早班':   { start: '08:00', end: '18:00' },
    '晚班':   { start: '18:00', end: '24:00' },
    '夜班':   { start: '22:00', end: '08:00' },
    '自定义': null,
  };

  const handlePresetChange = (preset) => {
    setFormShiftPreset(preset);
    if (SHIFT_PRESETS[preset]) {
      setFormStart(SHIFT_PRESETS[preset].start);
      setFormEnd(SHIFT_PRESETS[preset].end);
    }
  };

  // 切换单个日期的选中状态
  const toggleDate = (dateStr) => {
    setSelectedDates(prev => {
      if (prev.includes(dateStr)) {
        return prev.filter(d => d !== dateStr);
      } else {
        return [...prev, dateStr].sort();
      }
    });
  };

  // 快捷选择日期集合
  const applyQuickPreset = (preset) => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    
    if (preset === 'today') {
      setSelectedDates([todayStr]);
      return;
    }
    if (preset === 'tomorrow') {
      const tmr = new Date(today);
      tmr.setDate(today.getDate() + 1);
      setSelectedDates([tmr.toISOString().slice(0, 10)]);
      return;
    }
    
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // 1=周一
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + 1);
    
    if (preset === 'thisWeekWorkdays') {
      const dates = [0, 1, 2, 3, 4].map(i => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d.toISOString().slice(0, 10);
      });
      setSelectedDates(dates);
      return;
    }
    if (preset === 'thisWeekWeekend') {
      const dates = [5, 6].map(i => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d.toISOString().slice(0, 10);
      });
      setSelectedDates(dates);
      return;
    }
    if (preset === 'thisWeekAll') {
      const dates = [0, 1, 2, 3, 4, 5, 6].map(i => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d.toISOString().slice(0, 10);
      });
      setSelectedDates(dates);
      return;
    }
    if (preset === 'nextWeekAll') {
      const dates = [7, 8, 9, 10, 11, 12, 13].map(i => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d.toISOString().slice(0, 10);
      });
      setSelectedDates(dates);
      return;
    }
    if (preset === 'clear') {
      setSelectedDates([]);
      return;
    }
  };

  // 计算本周（偏移后）的周一到周日
  const weekDays = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // 1=周一
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + 1 + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [weekOffset]);

  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return '本周';
    if (weekOffset === 1) return '下周';
    if (weekOffset === -1) return '上周';
    const d = new Date(weekDays[0]);
    return `${d.getMonth() + 1}月${d.getDate()}日起`;
  }, [weekOffset, weekDays]);

  const DAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  // 按日期分组 duty 列表（含 duty_date 为 null 的旧记录）
  const dutyByDate = useMemo(() => {
    const map = {};
    for (const d of duty) {
      const key = d.duty_date || '__legacy__';
      if (!map[key]) map[key] = [];
      map[key].push(d);
    }
    return map;
  }, [duty]);

  // 无日期的旧记录
  const legacyDuty = dutyByDate['__legacy__'] || [];

  // 日历网格数据计算
  const calendarYear = calendarViewDate.getFullYear();
  const calendarMonth = calendarViewDate.getMonth(); // 0-11

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const dayOfWeek = firstDay.getDay() === 0 ? 7 : firstDay.getDay(); // 1=周一
    const blanksCount = dayOfWeek - 1;
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    const blanks = Array.from({ length: blanksCount }, () => null);
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const mStr = String(calendarMonth + 1).padStart(2, '0');
      const dStr = String(i + 1).padStart(2, '0');
      return `${calendarYear}-${mStr}-${dStr}`;
    });
    return [...blanks, ...days];
  }, [calendarYear, calendarMonth]);

  // 时段区间转换
  const parseDutyRange = (dutyDate, shiftStart, shiftEnd) => {
    if (!dutyDate || !shiftStart || !shiftEnd) return null;
    const baseDate = new Date(`${dutyDate}T00:00:00+08:00`);
    if (isNaN(baseDate.getTime())) return null;
    const [sh, sm] = shiftStart.split(':').map(Number);
    const [eh, em] = shiftEnd.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;

    const start = baseDate.getTime() + (sh * 60 + sm) * 60 * 1000;
    let end;
    if (shiftEnd === '24:00' || (eh === 24 && em === 0)) {
      end = baseDate.getTime() + 24 * 60 * 60 * 1000;
    } else if (eh < sh || (eh === sh && em <= sm)) {
      end = baseDate.getTime() + (24 * 60 + eh * 60 + em) * 60 * 1000;
    } else {
      end = baseDate.getTime() + (eh * 60 + em) * 60 * 1000;
    }
    return { start, end };
  };

  const doDutiesOverlap = (d1, d2) => {
    if (!d1.duty_date || !d2.duty_date) return false;
    const r1 = parseDutyRange(d1.duty_date, d1.shift_start, d1.shift_end);
    const r2 = parseDutyRange(d2.duty_date, d2.shift_start, d2.shift_end);
    if (!r1 || !r2) return false;
    return r1.start < r2.end && r2.start < r1.end;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedDates.length === 0) {
      setFormError('请至少选择一个排班日期');
      return;
    }
    setFormError('');

    // 检测所选日期和时段与现有排班是否存在冲突
    const conflicts = [];
    const nonConflictDates = [];

    for (const dateStr of selectedDates) {
      const candidate = { duty_date: dateStr, shift_start: formStart, shift_end: formEnd };
      const overlapping = duty.filter(d => d.duty_date && doDutiesOverlap(candidate, d));
      if (overlapping.length > 0) {
        conflicts.push({
          date: dateStr,
          shiftStart: formStart,
          shiftEnd: formEnd,
          conflictingDuties: overlapping,
        });
      } else {
        nonConflictDates.push(dateStr);
      }
    }

    if (conflicts.length > 0) {
      // 存在冲突，弹出冲突协商对话框
      const initialDecisions = {};
      for (const c of conflicts) {
        initialDecisions[c.date] = 'replace'; // 默认替换
      }
      setConflictModalData({
        conflicts,
        nonConflictDates,
        decisions: initialDecisions,
      });
      return;
    }

    // 无冲突，直接提交
    setFormSubmitting(true);
    try {
      await onCreateDuty({
        userId: formUserId,
        dutyDate: selectedDates[0],
        dutyDates: selectedDates,
        shiftStart: formStart,
        shiftEnd: formEnd,
      });
      setFormError('');
    } catch (err) {
      setFormError(err.message || '添加排班失败');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmConflictResolution = async () => {
    if (!conflictModalData) return;
    const { conflicts, nonConflictDates, decisions } = conflictModalData;

    const replaceDutyIds = [];
    const datesToSchedule = [...nonConflictDates];

    for (const c of conflicts) {
      const action = decisions[c.date];
      if (action === 'replace') {
        datesToSchedule.push(c.date);
        for (const d of c.conflictingDuties) {
          replaceDutyIds.push(d.id);
        }
      }
    }

    if (datesToSchedule.length === 0) {
      alert('所有冲突时段均选择了保留原人员，且无新增无冲突日期，未做任何排班修改。');
      setConflictModalData(null);
      return;
    }

    setFormSubmitting(true);
    try {
      await onCreateDuty({
        userId: formUserId,
        dutyDate: datesToSchedule[0],
        dutyDates: datesToSchedule,
        shiftStart: formStart,
        shiftEnd: formEnd,
        replaceDutyIds,
      });
      setConflictModalData(null);
      setFormError('');
    } catch (err) {
      alert(err.message || '提交排班失败');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (dutyId) => {
    setDeletingId(dutyId);
    try {
      await onDeleteDuty(dutyId);
    } catch (err) {
      alert(err.message || '删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const selectedUser = users.find(u => u.id === formUserId) || { name: '未知人员' };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h3 className="military-font glow-text-cyan" style={{ fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CalendarDays size={18} />
        技术运维值班排班管理
      </h3>

      {/* ── 新增排班表单 ── */}
      <form onSubmit={handleSubmit} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-cyan)', borderRadius: '6px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 'bold', marginBottom: '12px', letterSpacing: '0.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>＋ 新增排班记录（支持多选日期 & 冲突协商）</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
            已选 <strong style={{ color: 'var(--accent-cyan)' }}>{selectedDates.length}</strong> 天
          </span>
        </div>

        {/* 表单基本项 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
          {/* 人员 */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '5px' }}>值班人员</label>
            <select className="cyber-select" value={formUserId} onChange={e => setFormUserId(e.target.value)} style={{ fontSize: '0.82rem', width: '100%' }}>
              {users.filter(u => u.enabled !== false && u.roleType !== 'Observer').map(u => (
                <option key={u.id} value={u.id}>{u.name}（{u.role}）</option>
              ))}
            </select>
          </div>

          {/* 班次预设 */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '5px' }}>班次预设</label>
            <select className="cyber-select" value={formShiftPreset} onChange={e => handlePresetChange(e.target.value)} style={{ fontSize: '0.82rem', width: '100%' }}>
              {Object.keys(SHIFT_PRESETS).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* 自定义时间段 */}
          {formShiftPreset === '自定义' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '5px' }}>开始时间</label>
                <input type="time" className="cyber-input" value={formStart} onChange={e => setFormStart(e.target.value)} required style={{ fontSize: '0.82rem', width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '5px' }}>结束时间</label>
                <input type="time" className="cyber-input" value={formEnd} onChange={e => setFormEnd(e.target.value)} required style={{ fontSize: '0.82rem', width: '100%' }} />
              </div>
            </>
          )}
        </div>

        {formShiftPreset !== '自定义' && (
          <div style={{ marginBottom: '14px', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={12} /> 时段设定：<strong style={{ color: 'var(--text-bright)' }}>{formStart} – {formEnd}</strong>
          </div>
        )}

        {/* ── 日期快捷多选栏 ── */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>排班日期多选与快捷设定</label>
            <button
              type="button"
              className="cyber-btn"
              onClick={() => setShowCalendarGrid(v => !v)}
              style={{ padding: '2px 8px', fontSize: '0.7rem' }}
            >
              <CalendarIcon size={12} /> {showCalendarGrid ? '收起日历选择' : '展开日历选择'}
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button type="button" className="cyber-btn" onClick={() => applyQuickPreset('today')} style={{ padding: '4px 8px', fontSize: '0.72rem' }}>今天</button>
            <button type="button" className="cyber-btn" onClick={() => applyQuickPreset('tomorrow')} style={{ padding: '4px 8px', fontSize: '0.72rem' }}>明天</button>
            <button type="button" className="cyber-btn" onClick={() => applyQuickPreset('thisWeekWorkdays')} style={{ padding: '4px 8px', fontSize: '0.72rem' }}>本周工作日 (5天)</button>
            <button type="button" className="cyber-btn" onClick={() => applyQuickPreset('thisWeekWeekend')} style={{ padding: '4px 8px', fontSize: '0.72rem' }}>本周末 (2天)</button>
            <button type="button" className="cyber-btn" onClick={() => applyQuickPreset('thisWeekAll')} style={{ padding: '4px 8px', fontSize: '0.72rem' }}>本周整周 (7天)</button>
            <button type="button" className="cyber-btn" onClick={() => applyQuickPreset('nextWeekAll')} style={{ padding: '4px 8px', fontSize: '0.72rem' }}>下周整周 (7天)</button>
            {selectedDates.length > 0 && (
              <button type="button" className="cyber-btn danger" onClick={() => applyQuickPreset('clear')} style={{ padding: '4px 8px', fontSize: '0.72rem' }}>清空所选</button>
            )}
          </div>
        </div>

        {/* ── 内嵌交互式日历多选面板（含节假日展示） ── */}
        {showCalendarGrid && (
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-muted)', borderRadius: '6px', padding: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarIcon size={14} style={{ color: 'var(--accent-cyan)' }} />
                {calendarYear} 年 {calendarMonth + 1} 月
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>（点击日期切换选中状态）</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="cyber-btn"
                  onClick={() => setCalendarViewDate(new Date(calendarYear, calendarMonth - 1, 1))}
                  style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  type="button"
                  className="cyber-btn"
                  onClick={() => setCalendarViewDate(new Date())}
                  style={{ padding: '2px 8px', fontSize: '0.68rem' }}
                >
                  本月
                </button>
                <button
                  type="button"
                  className="cyber-btn"
                  onClick={() => setCalendarViewDate(new Date(calendarYear, calendarMonth + 1, 1))}
                  style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>

            {/* 星期表头 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '4px' }}>
              {['一', '二', '三', '四', '五', '六', '日'].map((w, i) => (
                <div key={w} style={{ fontSize: '0.68rem', color: i >= 5 ? 'var(--accent-orange)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                  {w}
                </div>
              ))}
            </div>

            {/* 月份日期格子 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {calendarDays.map((dateStr, idx) => {
                if (!dateStr) {
                  return <div key={`blank-${idx}`} style={{ minHeight: '44px', opacity: 0 }} />;
                }
                const isSelected = selectedDates.includes(dateStr);
                const isToday = dateStr === today;
                const holiday = getHolidayInfo(dateStr);
                const dayDuties = dutyByDate[dateStr] || [];
                const dayNum = parseInt(dateStr.slice(8), 10);

                let badgeBg = 'transparent';
                let badgeColor = 'var(--text-muted)';
                let badgeText = holiday.badgeText;
                if (holiday.badgeType === 'holiday') {
                  badgeBg = 'rgba(255, 75, 75, 0.25)';
                  badgeColor = '#ff6b6b';
                } else if (holiday.badgeType === 'workday') {
                  badgeBg = 'rgba(255, 165, 0, 0.25)';
                  badgeColor = '#ffa500';
                } else if (holiday.badgeType === 'festival') {
                  badgeBg = 'rgba(0, 212, 255, 0.15)';
                  badgeColor = 'var(--accent-cyan)';
                }

                return (
                  <button
                    type="button"
                    key={dateStr}
                    onClick={() => toggleDate(dateStr)}
                    style={{
                      background: isSelected ? 'rgba(0, 212, 255, 0.18)' : (isToday ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.2)'),
                      border: `1px solid ${isSelected ? 'var(--accent-cyan)' : (isToday ? 'rgba(255,255,255,0.25)' : 'var(--border-muted)')}`,
                      borderRadius: '4px',
                      padding: '4px 2px',
                      minHeight: '46px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      position: 'relative',
                      boxShadow: isSelected ? '0 0 6px var(--accent-cyan-glow)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* 顶部：日期号 + 节假日标 */}
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: isToday || isSelected ? 'bold' : 'normal', color: isSelected ? 'var(--accent-cyan)' : (isToday ? 'var(--text-bright)' : 'var(--text-primary)') }}>
                        {dayNum}
                      </span>
                      {badgeText && (
                        <span style={{ fontSize: '0.58rem', padding: '0 2px', borderRadius: '2px', background: badgeBg, color: badgeColor, fontWeight: 'bold', lineHeight: 1.2 }}>
                          {badgeText}
                        </span>
                      )}
                    </div>

                    {/* 中部：节日名称或已有排班人员提示 */}
                    <div style={{ width: '100%', textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', padding: '0 2px' }}>
                      {holiday.holidayName && holiday.holidayName !== '周末' ? (
                        <span style={{ fontSize: '0.58rem', color: badgeColor }}>{holiday.holidayName}</span>
                      ) : dayDuties.length > 0 ? (
                        <span style={{ fontSize: '0.58rem', color: dayDuties.some(d => d.is_active) ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                          {dayDuties.length === 1 ? (users.find(u => u.id === dayDuties[0].user_id)?.name || '已有排班') : `${dayDuties.length}人值班`}
                        </span>
                      ) : null}
                    </div>

                    {/* 底部选中标记点 */}
                    {isSelected && (
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--accent-cyan)', marginTop: '2px' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 已选日期标签清单 ── */}
        {selectedDates.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>已选日期列表（点击 × 可移除）：</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
              {selectedDates.map(d => {
                const info = getHolidayInfo(d);
                return (
                  <span
                    key={d}
                    style={{
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      background: 'rgba(0, 212, 255, 0.1)',
                      border: '1px solid var(--border-cyan)',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--text-bright)',
                    }}
                  >
                    📅 {d}（{info.weekdayName}）
                    {info.holidayName && info.holidayName !== '周末' && (
                      <span style={{ color: 'var(--accent-cyan)', fontSize: '0.65rem' }}>{info.holidayName}</span>
                    )}
                    {info.badgeText && info.badgeType !== 'weekend' && (
                      <span style={{ fontSize: '0.6rem', color: info.badgeType === 'workday' ? '#ffa500' : '#ff6b6b', fontWeight: 'bold' }}>[{info.badgeText}]</span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleDate(d)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: 0 }}
                      title="移除此日期"
                    >
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {formError && <div className="attachment-error" style={{ marginTop: '8px' }}>{formError}</div>}

        <button
          type="submit"
          disabled={formSubmitting || selectedDates.length === 0}
          className="cyber-btn success"
          style={{ marginTop: '6px', padding: '8px 20px', fontSize: '0.82rem' }}
        >
          <PlusCircle size={14} />
          {formSubmitting ? '正在提交排班...' : `确认添加排班（为 ${selectedUser.name} 排 ${selectedDates.length} 天）`}
        </button>
      </form>

      {/* ── 冲突协商解决弹窗 (Conflict Resolution Modal) ── */}
      {conflictModalData && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: 'min(100%, 640px)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              border: '1px solid var(--accent-orange)',
              boxShadow: '0 0 24px rgba(255, 165, 0, 0.25)',
              borderRadius: '8px',
            }}
          >
            {/* 弹窗头部 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-orange)', fontWeight: 'bold', fontSize: '1rem' }}>
                <AlertTriangle size={20} />
                排班时段冲突协商处理
              </div>
              <button
                type="button"
                onClick={() => setConflictModalData(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* 规则说明与批量操作 */}
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
              ⚡ 规则校验：<strong>同一个时间段内，只允许保留一个值班人员</strong>。<br />
              系统检测到以下 <strong style={{ color: 'var(--accent-orange)' }}>{conflictModalData.conflicts.length}</strong> 处日期时段已存在排班人员，请选择每个冲突时段所保留的人员：
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button
                type="button"
                className="cyber-btn"
                onClick={() => {
                  const nextDecisions = {};
                  conflictModalData.conflicts.forEach(c => { nextDecisions[c.date] = 'replace'; });
                  setConflictModalData(prev => ({ ...prev, decisions: nextDecisions }));
                }}
                style={{ padding: '4px 10px', fontSize: '0.72rem' }}
              >
                全部设为：替换为新人员 ({selectedUser.name})
              </button>
              <button
                type="button"
                className="cyber-btn"
                onClick={() => {
                  const nextDecisions = {};
                  conflictModalData.conflicts.forEach(c => { nextDecisions[c.date] = 'keep'; });
                  setConflictModalData(prev => ({ ...prev, decisions: nextDecisions }));
                }}
                style={{ padding: '4px 10px', fontSize: '0.72rem' }}
              >
                全部设为：保留原值班人员
              </button>
            </div>

            {/* 冲突项目列表 */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px', marginBottom: '16px' }}>
              {conflictModalData.conflicts.map(c => {
                const info = getHolidayInfo(c.date);
                const currentAction = conflictModalData.decisions[c.date] || 'replace';

                return (
                  <div
                    key={c.date}
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-muted)',
                      borderRadius: '6px',
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'var(--text-bright)' }}>
                        📅 {c.date}（{info.weekdayName}）
                        {info.holidayName && <span style={{ color: 'var(--accent-cyan)', fontSize: '0.72rem', marginLeft: '6px' }}>{info.holidayName}</span>}
                        {info.badgeText && <span style={{ fontSize: '0.65rem', marginLeft: '4px', color: info.badgeType === 'workday' ? '#ffa500' : '#ff6b6b' }}>[{info.badgeText}]</span>}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-orange)' }}>
                        时段：{c.shiftStart}–{c.shiftEnd}
                      </span>
                    </div>

                    {/* 现有排班人员 */}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>现有值班：</span>
                      {c.conflictingDuties.map(d => {
                        const u = users.find(user => user.id === d.user_id) || { name: '未知人员' };
                        return (
                          <span key={d.id} style={{ color: 'var(--text-primary)', fontWeight: 'bold', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '3px' }}>
                            {u.name} ({d.shift_start}–{d.shift_end})
                          </span>
                        );
                      })}
                    </div>

                    {/* 选择人员 Radio */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '4px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: currentAction === 'replace' ? 'var(--accent-green)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name={`conflict-${c.date}`}
                          checked={currentAction === 'replace'}
                          onChange={() => {
                            setConflictModalData(prev => ({
                              ...prev,
                              decisions: { ...prev.decisions, [c.date]: 'replace' },
                            }));
                          }}
                        />
                        <span>
                          <strong>替换为新人员：{selectedUser.name}</strong>
                          <small style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>(将自动移除原排班记录)</small>
                        </span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: currentAction === 'keep' ? 'var(--accent-cyan)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name={`conflict-${c.date}`}
                          checked={currentAction === 'keep'}
                          onChange={() => {
                            setConflictModalData(prev => ({
                              ...prev,
                              decisions: { ...prev.decisions, [c.date]: 'keep' },
                            }));
                          }}
                        />
                        <span>
                          <strong>保留原值班人员</strong>
                          <small style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>(放弃 {selectedUser.name} 在此时段的排班)</small>
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 无冲突日期概要 */}
            {conflictModalData.nonConflictDates.length > 0 && (
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-green)', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '4px', padding: '8px 12px', marginBottom: '16px' }}>
                ✅ 无冲突日期（共 {conflictModalData.nonConflictDates.length} 天）：将正常为 <strong>{selectedUser.name}</strong> 创建排班。
              </div>
            )}

            {/* 弹窗底部操作按钮 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-muted)', paddingTop: '14px' }}>
              <button
                type="button"
                className="cyber-btn"
                onClick={() => setConflictModalData(null)}
                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
              >
                取消
              </button>
              <button
                type="button"
                className="cyber-btn success"
                disabled={formSubmitting}
                onClick={handleConfirmConflictResolution}
                style={{ padding: '6px 18px', fontSize: '0.78rem' }}
              >
                {formSubmitting ? '正在处理...' : '确认执行排班'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 周视图导航 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CalendarDays size={14} style={{ color: 'var(--accent-cyan)' }} />
          {weekLabel}排班概览
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
            （{weekDays[0]} ~ {weekDays[6]}）
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="cyber-btn" onClick={() => setWeekOffset(w => w - 1)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
            <ChevronLeft size={14} />
          </button>
          {weekOffset !== 0 && (
            <button className="cyber-btn" onClick={() => setWeekOffset(0)} style={{ padding: '4px 10px', fontSize: '0.72rem' }}>
              回到本周
            </button>
          )}
          <button className="cyber-btn" onClick={() => setWeekOffset(w => w + 1)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── 周视图格子（含节假日/调休显示） ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '20px' }}>
        {weekDays.map((dateStr, i) => {
          const dayDuties = dutyByDate[dateStr] || [];
          const isToday = dateStr === today;
          const holiday = getHolidayInfo(dateStr);

          let badgeBg = 'transparent';
          let badgeColor = 'var(--text-muted)';
          if (holiday.badgeType === 'holiday') {
            badgeBg = 'rgba(255, 75, 75, 0.2)';
            badgeColor = '#ff6b6b';
          } else if (holiday.badgeType === 'workday') {
            badgeBg = 'rgba(255, 165, 0, 0.2)';
            badgeColor = '#ffa500';
          } else if (holiday.badgeType === 'festival') {
            badgeBg = 'rgba(0, 212, 255, 0.15)';
            badgeColor = 'var(--accent-cyan)';
          }

          return (
            <div
              key={dateStr}
              style={{
                background: isToday ? 'rgba(0,212,255,0.06)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${isToday ? 'var(--accent-cyan)' : 'var(--border-muted)'}`,
                borderRadius: '4px',
                padding: '8px 6px',
                minHeight: '96px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* 星期 + 节假日标 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 'bold', color: isToday ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                  {DAY_NAMES[i]}
                </span>
                {holiday.badgeText && (
                  <span style={{ fontSize: '0.58rem', padding: '1px 3px', borderRadius: '2px', background: badgeBg, color: badgeColor, fontWeight: 'bold', lineHeight: 1 }}>
                    {holiday.badgeText}
                  </span>
                )}
              </div>

              {/* 日期号 + 节日名 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <span>{dateStr.slice(5)}</span>
                {holiday.holidayName && holiday.holidayName !== '周末' && (
                  <span style={{ color: badgeColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '42px' }}>
                    {holiday.holidayName}
                  </span>
                )}
              </div>

              {/* 当日值班人员 */}
              <div style={{ flex: 1 }}>
                {dayDuties.length === 0 ? (
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '10px' }}>—</div>
                ) : (
                  dayDuties.map(d => {
                    const u = users.find(u => u.id === d.user_id);
                    return (
                      <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', background: d.is_active ? 'rgba(74,222,128,0.1)' : 'transparent', padding: '2px 4px', borderRadius: '2px' }}>
                        {u?.avatar && (
                          <img src={u.avatar} alt="" style={{ width: '16px', height: '16px', borderRadius: '50%', border: d.is_active ? '1px solid var(--accent-green)' : '1px solid transparent', flexShrink: 0 }} />
                        )}
                        <div style={{ overflow: 'hidden', width: '100%' }}>
                          <div style={{ fontSize: '0.68rem', color: d.is_active ? 'var(--accent-green)' : 'var(--text-bright)', fontWeight: d.is_active ? 'bold' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {u?.name || '—'}
                          </div>
                          <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>{d.shift_start}–{d.shift_end}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 全量排班列表 ── */}
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '10px', borderTop: '1px solid var(--border-muted)', paddingTop: '14px' }}>
        全部排班记录（按日期排序）
      </div>

      {duty.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '20px' }}>
          暂无排班记录，请通过上方表单新增。
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
          {/* 有日期的记录按日期排序 */}
          {[...duty]
            .sort((a, b) => {
              if (!a.duty_date && !b.duty_date) return 0;
              if (!a.duty_date) return 1;
              if (!b.duty_date) return -1;
              return a.duty_date.localeCompare(b.duty_date);
            })
            .map(d => {
              const u = users.find(u => u.id === d.user_id) || { name: '未知人员', avatar: '' };
              const isActive = d.is_active;
              const holiday = d.duty_date ? getHolidayInfo(d.duty_date) : null;

              return (
                <div
                  key={d.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '4px',
                    background: isActive ? 'rgba(74,222,128,0.04)' : 'rgba(0,0,0,0.2)',
                    border: `1px solid ${isActive ? 'var(--accent-green)' : 'var(--border-muted)'}`,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <img src={u.avatar} alt={u.name} style={{ width: '30px', height: '30px', borderRadius: '50%', border: isActive ? '2px solid var(--accent-green)' : '1px solid var(--border-muted)', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-bright)' }}>{u.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {d.duty_date ? (
                          <span>
                            📅 {d.duty_date}（{holiday?.weekdayName}）
                            {holiday?.holidayName && holiday?.holidayName !== '周末' && (
                              <span style={{ color: 'var(--accent-cyan)', marginLeft: '4px' }}>{holiday.holidayName}</span>
                            )}
                            {holiday?.badgeText && holiday?.badgeType !== 'weekend' && (
                              <span style={{ fontSize: '0.62rem', marginLeft: '3px', color: holiday.badgeType === 'workday' ? '#ffa500' : '#ff6b6b', fontWeight: 'bold' }}>
                                [{holiday.badgeText}]
                              </span>
                            )}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--accent-orange)' }}>历史记录（无日期）</span>
                        )}
                        <span><Clock size={10} style={{ verticalAlign: 'middle' }} /> {d.shift_start} – {d.shift_end}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {isActive ? (
                      <span className="badge green" style={{ fontSize: '0.7rem' }}>在岗值班中</span>
                    ) : (
                      <button
                        onClick={() => onSetActiveDuty(d.id)}
                        className="cyber-btn"
                        style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                      >
                        <UserCheck size={12} /> 切换在岗
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (isActive) { alert('当前在岗的排班记录不能删除，请先切换到其他人值班后再删除。'); return; }
                        if (window.confirm(`确定删除 ${u.name} 在 ${d.duty_date || '未知日期'} 的排班记录吗？`)) {
                          handleDelete(d.id);
                        }
                      }}
                      disabled={deletingId === d.id}
                      className="cyber-btn danger"
                      style={{ padding: '4px 8px', fontSize: '0.72rem', opacity: isActive ? 0.4 : 1 }}
                      title={isActive ? '在岗记录不可删除' : '删除此排班'}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {legacyDuty.length > 0 && (
        <div style={{ marginTop: '10px', fontSize: '0.72rem', color: 'var(--text-muted)', padding: '8px', background: 'rgba(255,165,0,0.05)', border: '1px solid rgba(255,165,0,0.15)', borderRadius: '4px' }}>
          ⚠️ 存在 {legacyDuty.length} 条无排班日期的历史记录（系统升级前创建），可直接删除或通过"切换在岗"继续使用。
        </div>
      )}
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────
export default function AdminConsole({ state, onVerifyMission, onUpdateMultiplier, onCreateMission, onDeliverReward, onSetActiveDuty, onCreateDuty, onDeleteDuty, onUpdateWecomConfig, onTestWecomWebhook, onLoadPersonnel, onUpdatePersonnel, onCreatePersonnel, onDeletePersonnel, onUpdatePersonnelAvatar, onResetPersonnelAvatar, onPreviewMissionRecipients }) {
  const { missions, users, duty, currentUserId, wecomWebhook = {}, transactions = [], roles = [], taskDomains = [] } = state;
  const currentUser = users.find(u => u.id === currentUserId) || users[0];
  const isAdmin = currentUser.roleType === 'Admin';

  const [webhookInput, setWebhookInput] = useState('');
  const [mentionInput, setMentionInput] = useState((wecomWebhook.mentionMobiles || []).join(', '));
  const [webhookStatus, setWebhookStatus] = useState(null);
  const [webhookBusy, setWebhookBusy] = useState(false);

  // 新任务表单状态
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newBase, setNewBase] = useState(50);
  const [newPrimaryDomain, setNewPrimaryDomain] = useState('');
  const [newPriority, setNewPriority] = useState('Normal');
  const [recipientPreview, setRecipientPreview] = useState(null);
  const [newMult, setNewMult] = useState(1.0);
  const [newPublishTarget, setNewPublishTarget] = useState('platform');
  const [newFiles, setNewFiles] = useState([]);
  const [missionSubmitting, setMissionSubmitting] = useState(false);
  const [missionError, setMissionError] = useState('');

  // 倍率临时状态
  const [tempMultipliers, setTempMultipliers] = useState({});

  // 待验证任务
  const pendingMissions = missions.filter(m => m.status === 'Pending Verification');

  // 待发放商品
  const pendingDeliveries = transactions.filter(t => t.status === 'Pending Delivery');

  const handleCreateMissionSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setMissionSubmitting(true);
    setMissionError('');
    try {
      const primaryDomainId = newPrimaryDomain || taskDomains[0]?.id;
      await onCreateMission({ title: newTitle, description: newDesc, base_points: newBase, multiplier: newMult, priority: newPriority, primaryDomainId, publish_target: newPublishTarget }, newFiles);
      setNewTitle('');
      setNewDesc('');
      setNewBase(500);
      setNewPrimaryDomain('');
      setNewPriority('Normal');
      setRecipientPreview(null);
      setNewMult(1.0);
      setNewPublishTarget('platform');
      setNewFiles([]);
    } catch (error) {
      setMissionError(error.message || '任务发布失败');
    } finally {
      setMissionSubmitting(false);
    }
  };

  const handleMultiplierChangeLocal = (missionId, val) => {
    setTempMultipliers(prev => ({ ...prev, [missionId]: val }));
  };

  const handleApplyMultiplier = (missionId) => {
    const val = tempMultipliers[missionId];
    if (val === undefined) return;
    onUpdateMultiplier(missionId, val);
  };

  const parseMobiles = () => mentionInput.split(/[,，;；\s]+/).map(v => v.trim()).filter(Boolean);

  const handleWebhookSubmit = async (e) => {
    e.preventDefault();
    if (!webhookInput.trim() && !wecomWebhook.configured) {
      setWebhookStatus({ type: 'error', message: '请输入企业微信群机器人 Webhook 地址' });
      return;
    }
    setWebhookBusy(true);
    setWebhookStatus(null);
    try {
      await onUpdateWecomConfig(webhookInput.trim() || undefined, parseMobiles());
      setWebhookInput('');
      setWebhookStatus({ type: 'success', message: '企业微信提醒配置已保存' });
    } catch (error) {
      setWebhookStatus({ type: 'error', message: error.message });
    } finally {
      setWebhookBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>

      {/* 待验证成果 & 待发放福利 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>

        {/* 成果审核 */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="military-font glow-text-cyan" style={{ fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={18} />
            待核实成果报告 ({pendingMissions.length})
          </h3>

          {pendingMissions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              暂无待审核的任务成果汇报。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pendingMissions.map(m => {
                const earner = users.find(u => u.id === m.assigned_to) || { name: '未知人员' };
                const earnPoints = Math.round(m.base_points * m.multiplier);

                return (
                  <div key={m.id} style={{ padding: '14px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-cyan)', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <span className="badge cyan" style={{ fontSize: '0.65rem' }}>{m.category}</span>
                      <span className="military-font glow-text-cyan" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{earnPoints} eP</span>
                    </div>

                    <h4 style={{ color: 'var(--text-bright)', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '6px' }}>{m.title}</h4>

                    <div style={{ padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '2px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      <strong>{earner.name} 提交的交付证明:</strong> {m.proof_of_work}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button onClick={() => onVerifyMission(m.id, true)} className="cyber-btn success" style={{ padding: '8px', fontSize: '0.75rem', width: '100%' }}>
                        <Check size={14} /> 审核通过・拨付积分
                      </button>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => onVerifyMission(m.id, false)} className="cyber-btn" style={{ flex: 1, padding: '6px', fontSize: '0.75rem', borderColor: 'var(--border-muted)', background: 'transparent' }}>
                          普通驳回
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`确定要驳回 ${earner.name} 的成果申请，并判定为虚报成果/进度灌水，对其扣减 50 eP 积分吗？`)) {
                              onVerifyMission(m.id, false, true);
                            }
                          }}
                          className="cyber-btn danger"
                          style={{ flex: 2, padding: '6px', fontSize: '0.75rem' }}
                        >
                          <X size={14} /> 判定虚报并驳回 (-50 eP)
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 福利发放管理 */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="military-font glow-text-cyan" style={{ fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={18} />
            待发放福利礼品清单 ({pendingDeliveries.length})
          </h3>

          {pendingDeliveries.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              暂无待发放的商城商品/福利。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingDeliveries.map(t => {
                const user = users.find(u => u.id === t.user_id) || { name: '未知人员' };
                const item = state.rewards.find(r => r.id === t.reward_id) || { title: '未知商品', image: '📦' };

                return (
                  <div key={t.id} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-muted)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: 'var(--text-bright)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {typeof item.image === 'string' && (/^https?:\/\//.test(item.image) || item.image.startsWith('/api/'))
                          ? <img className="reward-visual" src={item.image} alt="" style={{ width: 24, height: 24, verticalAlign: 'middle', marginRight: '6px' }} />
                          : <>{item.image} </>}{item.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        申请人: <strong>{user.name}</strong> | 消耗积分: {t.points_spent} eP
                      </div>
                    </div>

                    <button onClick={() => onDeliverReward(t.id)} className="cyber-btn success" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                      <Check size={14} /> 确认发放
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 核心任务分值调控 & 排班管理 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>

        {/* 动态倍率调控中心 */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="military-font glow-text-cyan" style={{ fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={18} />
            核心任务积分倍率调控
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {missions.filter(m => m.status === 'Available' || m.status === 'In Progress').map(m => {
              const currentVal = tempMultipliers[m.id] !== undefined ? tempMultipliers[m.id] : m.multiplier;

              return (
                <div key={m.id} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', border: '1px solid var(--border-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-bright)', maxWidth: '70%' }}>{m.title}</div>
                    <span className="military-font badge orange" style={{ fontSize: '0.7rem' }}>当前倍率: {m.multiplier}x</span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
                    <select
                      className="cyber-select"
                      value={currentVal}
                      onChange={(e) => handleMultiplierChangeLocal(m.id, parseFloat(e.target.value))}
                      style={{ fontSize: '0.8rem', padding: '6px', width: '90px' }}
                    >
                      <option value="1.0">1.0x 标准</option>
                      <option value="1.2">1.2x 引导</option>
                      <option value="1.5">1.5x 加急</option>
                      <option value="2.0">2.0x 火速</option>
                      <option value="2.5">2.5x 决战</option>
                    </select>

                    <button
                      onClick={() => handleApplyMultiplier(m.id)}
                      className="cyber-btn warning"
                      style={{ padding: '6px 12px', fontSize: '0.75rem', flex: 1 }}
                      disabled={m.multiplier === currentVal}
                    >
                      更新积分倍率
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 技术值班排班管理 */}
        <DutyScheduler
          duty={duty}
          users={users}
          onSetActiveDuty={onSetActiveDuty}
          onCreateDuty={onCreateDuty}
          onDeleteDuty={onDeleteDuty}
        />

      </div>

      {/* 发布新任务 */}
      <div className="glass-panel" style={{ order: -2, padding: '24px' }}>
        <h3 className="military-font glow-text-cyan" style={{ fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PlusCircle size={18} />
          发布新项目任务
        </h3>

        <form onSubmit={handleCreateMissionSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>任务标题</label>
              <input
                type="text"
                className="cyber-input"
                required
                placeholder="例如：对接企业级 LDAP 单点登录接口..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>任务描述</label>
              <textarea
                className="cyber-input"
                rows={3}
                required
                placeholder="描述任务交付要求及验收标准细节..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                style={{ resize: 'none' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>发布目标</label>
              <div style={{ display: 'flex', gap: '14px', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-muted)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', color: newPublishTarget === 'platform' ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                  <input
                    type="radio"
                    name="publishTarget"
                    value="platform"
                    checked={newPublishTarget === 'platform'}
                    onChange={() => setNewPublishTarget('platform')}
                    style={{ accentColor: 'var(--accent-cyan)' }}
                  />
                  📢 发布到平台 (公开认领)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', color: newPublishTarget === 'self' ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                  <input
                    type="radio"
                    name="publishTarget"
                    value="self"
                    checked={newPublishTarget === 'self'}
                    onChange={() => setNewPublishTarget('self')}
                    style={{ accentColor: 'var(--accent-cyan)' }}
                  />
                  🔒 发布给自己 (管理自承接)
                </label>
              </div>
              <small style={{ display: 'block', marginTop: '4px', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                {newPublishTarget === 'platform'
                  ? '平台普通成员可见并可自由认领，将通过企业微信广播通知匹配领域成员。'
                  : '仅管理员与观察者可见，任务直接分配给您并进入进行中，不向平台成员广播通知。'}
              </small>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>效能分值 (ePoints)</label>
                <input
                  type="number"
                  className="cyber-input"
                  required
                  min={10}
                  max={1000}
                  value={newBase}
                  onChange={(e) => setNewBase(parseInt(e.target.value))}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>初始倍率</label>
                <select className="cyber-select" value={newMult} onChange={(e) => setNewMult(parseFloat(e.target.value))}>
                  <option value="1.0">1.0x 标准</option>
                  <option value="1.2">1.2x 引导</option>
                  <option value="1.5">1.5x 加急</option>
                  <option value="2.0">2.0x 火速</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>任务领域
                <select
                  className="cyber-select"
                  value={newPrimaryDomain || taskDomains[0]?.id || ''}
                  onChange={(e) => { setNewPrimaryDomain(e.target.value); setRecipientPreview(null); }}
                  style={{ marginTop: '6px' }}
                >
                  {taskDomains.map(domain => <option value={domain.id} key={domain.id}>{domain.name}</option>)}
                </select>
              </label>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>优先级
                <select className="cyber-select" value={newPriority} onChange={(e) => setNewPriority(e.target.value)} style={{ marginTop: '6px' }}>
                  <option value="Normal">普通</option><option value="High">高</option><option value="Critical">紧急</option>
                </select>
              </label>
            </div>

            {newPublishTarget === 'platform' ? (
              <div className="recipient-preview-box">
                <button type="button" disabled={!isAdmin} onClick={async () => {
                  try { setRecipientPreview(await onPreviewMissionRecipients({ primaryDomainId: newPrimaryDomain || taskDomains[0]?.id })); }
                  catch (error) { setMissionError(error.message); }
                }}>查看匹配成员</button>
                {recipientPreview && <div><strong>匹配 {recipientPreview.recipients.length} 人，将 @ {recipientPreview.mentionCount} 人</strong>{recipientPreview.recipients.length ? recipientPreview.recipients.map(item => <span key={item.userId}>{item.name} · {item.roleNames[0]}</span>) : <span>当前领域未匹配到可用人员</span>}</div>}
              </div>
            ) : (
              <div className="recipient-preview-box" style={{ background: 'rgba(56, 189, 248, 0.05)', borderColor: 'var(--border-muted)', color: 'var(--text-muted)' }}>
                <span>🔒 <strong>内部管理任务</strong>：不广播通知，仅管理员与观察者可见，任务将直接归属您本人。</span>
              </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
              <button type="submit" disabled={missionSubmitting || !isAdmin} className="cyber-btn success" style={{ width: '100%', height: '42px' }}>
                <PlusCircle size={16} /> {!isAdmin ? '仅管理员可发布任务' : missionSubmitting ? '正在上传并发布...' : newPublishTarget === 'self' ? '发布给自己 (仅管理与观察者可见)' : '发布该任务至公开看板'}
              </button>
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <AttachmentPicker files={newFiles} onChange={setNewFiles} disabled={missionSubmitting} />
            {missionError && <div className="attachment-error" style={{ marginTop: '8px' }}>{missionError}</div>}
          </div>
        </form>
      </div>

      {isAdmin && <div style={{ order: -1 }}><PersonnelManager roles={roles} onLoadPersonnel={onLoadPersonnel} onUpdatePersonnel={onUpdatePersonnel} onCreatePersonnel={onCreatePersonnel} onDeletePersonnel={onDeletePersonnel} onUpdatePersonnelAvatar={onUpdatePersonnelAvatar} onResetPersonnelAvatar={onResetPersonnelAvatar} /></div>}

      {/* 企业微信群机器人告警配置 */}
      <div className="glass-panel" style={{ padding: '24px', gridColumn: '1 / -1', marginTop: '12px' }}>
        <h3 className="military-font glow-text-cyan" style={{ fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SlidersHorizontal size={18} />
          企业微信群机器人提醒
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px' }}>
          发布新项目任务或上报系统故障后，服务端会向企业微信群发送对应摘要，并按手机号提醒相关人员。Webhook 密钥只保存在服务端，页面仅显示脱敏地址。
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: wecomWebhook.configured ? 'var(--accent-green)' : 'var(--text-muted)', fontSize: '0.8rem' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'currentColor' }} />
          {wecomWebhook.configured ? `已启用：${wecomWebhook.maskedUrl}` : '未配置企业微信提醒'}
        </div>

        <form onSubmit={handleWebhookSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '6px' }}>群机器人 Webhook</label>
            <input
              type="url"
              className="cyber-input"
              value={webhookInput}
              onChange={(e) => setWebhookInput(e.target.value)}
              placeholder={wecomWebhook.configured ? '留空则继续使用当前地址' : 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...'}
              style={{ fontSize: '0.85rem', width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '6px' }}>需要 @ 的手机号（逗号分隔）</label>
            <input className="cyber-input" value={mentionInput} onChange={(e) => setMentionInput(e.target.value)} placeholder="13800138000, 13900139000" style={{ fontSize: '0.85rem' }} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="submit" disabled={webhookBusy || !isAdmin} className="cyber-btn success" style={{ padding: '8px 16px', fontSize: '0.8rem' }}><Save size={15} />保存配置</button>
            <button type="button" disabled={webhookBusy || !isAdmin || (!webhookInput.trim() && !wecomWebhook.configured)} className="cyber-btn" style={{ padding: '8px 16px', fontSize: '0.8rem' }} onClick={async () => {
              setWebhookBusy(true); setWebhookStatus(null);
              try {
                const result = await onTestWecomWebhook(webhookInput.trim() || undefined, parseMobiles());
                setWebhookStatus({ type: 'success', message: result.message });
              } catch (error) { setWebhookStatus({ type: 'error', message: error.message }); }
              finally { setWebhookBusy(false); }
            }}><Send size={15} />发送测试消息</button>
            {wecomWebhook.configured && <button type="button" disabled={webhookBusy || !isAdmin} className="cyber-btn danger" style={{ padding: '8px 16px', fontSize: '0.8rem' }} onClick={async () => {
              setWebhookBusy(true); setWebhookStatus(null);
              try { await onUpdateWecomConfig('', []); setMentionInput(''); setWebhookStatus({ type: 'success', message: '企业微信提醒已停用' }); }
              catch (error) { setWebhookStatus({ type: 'error', message: error.message }); }
              finally { setWebhookBusy(false); }
            }}><Power size={15} />停用提醒</button>}
          </div>
          {webhookStatus && <div role="status" style={{ gridColumn: '1 / -1', padding: '9px 12px', borderLeft: `2px solid ${webhookStatus.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`, background: webhookStatus.type === 'success' ? 'rgba(74,222,128,.07)' : 'rgba(255,75,75,.07)', color: webhookStatus.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: '.8rem' }}>{webhookStatus.message}</div>}
        </form>
      </div>

    </div>
  );
}
