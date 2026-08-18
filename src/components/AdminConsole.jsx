import React, { useState, useMemo } from 'react';
import { PlusCircle, Check, X, SlidersHorizontal, ShoppingCart, UserCheck, Send, Save, Power, CalendarDays, Trash2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import AttachmentPicker from './AttachmentPicker';
import PersonnelManager from './PersonnelManager';

// ─── 排班管理子组件 ────────────────────────────────────────────────────────────
function DutyScheduler({ duty, users, onSetActiveDuty, onCreateDuty, onDeleteDuty }) {
  // 周视图偏移（0 = 本周）
  const [weekOffset, setWeekOffset] = useState(0);

  // 新增排班表单状态
  const [formUserId, setFormUserId] = useState(users[0]?.id || '');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formShiftPreset, setFormShiftPreset] = useState('全天');
  const [formStart, setFormStart] = useState('00:00');
  const [formEnd, setFormEnd] = useState('24:00');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');
    try {
      await onCreateDuty({ userId: formUserId, dutyDate: formDate, shiftStart: formStart, shiftEnd: formEnd });
    } catch (err) {
      setFormError(err.message || '添加排班失败');
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

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h3 className="military-font glow-text-cyan" style={{ fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CalendarDays size={18} />
        技术运维值班排班管理
      </h3>

      {/* ── 新增排班表单 ── */}
      <form onSubmit={handleSubmit} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-cyan)', borderRadius: '6px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 'bold', marginBottom: '12px', letterSpacing: '0.5px' }}>
          ＋ 新增排班记录
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
          {/* 人员 */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '5px' }}>值班人员</label>
            <select className="cyber-select" value={formUserId} onChange={e => setFormUserId(e.target.value)} style={{ fontSize: '0.82rem', width: '100%' }}>
              {users.filter(u => u.enabled !== false).map(u => (
                <option key={u.id} value={u.id}>{u.name}（{u.role}）</option>
              ))}
            </select>
          </div>

          {/* 日期 */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '5px' }}>排班日期</label>
            <input
              type="date"
              className="cyber-input"
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
              required
              style={{ fontSize: '0.82rem', width: '100%' }}
            />
          </div>

          {/* 班次预设 */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '5px' }}>班次</label>
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
          <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={12} /> 时段：{formStart} – {formEnd}
          </div>
        )}

        {formError && <div className="attachment-error" style={{ marginTop: '8px' }}>{formError}</div>}

        <button
          type="submit"
          disabled={formSubmitting}
          className="cyber-btn success"
          style={{ marginTop: '12px', padding: '7px 18px', fontSize: '0.8rem' }}
        >
          <PlusCircle size={14} />
          {formSubmitting ? '提交中...' : '确认添加排班'}
        </button>
      </form>

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

      {/* ── 周视图格子 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '20px' }}>
        {weekDays.map((dateStr, i) => {
          const dayDuties = dutyByDate[dateStr] || [];
          const isToday = dateStr === today;
          return (
            <div
              key={dateStr}
              style={{
                background: isToday ? 'rgba(0,212,255,0.06)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${isToday ? 'var(--accent-cyan)' : 'var(--border-muted)'}`,
                borderRadius: '4px',
                padding: '8px 6px',
                minHeight: '90px',
              }}
            >
              <div style={{ fontSize: '0.68rem', fontWeight: 'bold', color: isToday ? 'var(--accent-cyan)' : 'var(--text-muted)', marginBottom: '4px' }}>
                {DAY_NAMES[i]}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                {dateStr.slice(5)}
              </div>
              {dayDuties.length === 0 ? (
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '10px' }}>—</div>
              ) : (
                dayDuties.map(d => {
                  const u = users.find(u => u.id === d.user_id);
                  return (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                      {u?.avatar && (
                        <img src={u.avatar} alt="" style={{ width: '16px', height: '16px', borderRadius: '50%', border: d.is_active ? '1px solid var(--accent-green)' : '1px solid transparent', flexShrink: 0 }} />
                      )}
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.68rem', color: d.is_active ? 'var(--accent-green)' : 'var(--text-bright)', fontWeight: d.is_active ? 'bold' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u?.name || '—'}
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{d.shift_start}–{d.shift_end}</div>
                      </div>
                    </div>
                  );
                })
              )}
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
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {d.duty_date ? (
                          <span>📅 {d.duty_date}（{['日', '一', '二', '三', '四', '五', '六'][new Date(d.duty_date + 'T12:00:00').getDay()]}）</span>
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
      await onCreateMission({ title: newTitle, description: newDesc, base_points: newBase, multiplier: newMult, priority: newPriority, primaryDomainId }, newFiles);
      setNewTitle('');
      setNewDesc('');
      setNewBase(500);
      setNewPrimaryDomain('');
      setNewPriority('Normal');
      setRecipientPreview(null);
      setNewMult(1.0);
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

            <div className="recipient-preview-box">
              <button type="button" disabled={!isAdmin} onClick={async () => {
                try { setRecipientPreview(await onPreviewMissionRecipients({ primaryDomainId: newPrimaryDomain || taskDomains[0]?.id })); }
                catch (error) { setMissionError(error.message); }
              }}>查看匹配成员</button>
              {recipientPreview && <div><strong>匹配 {recipientPreview.recipients.length} 人，将 @ {recipientPreview.mentionCount} 人</strong>{recipientPreview.recipients.length ? recipientPreview.recipients.map(item => <span key={item.userId}>{item.name} · {item.roleNames[0]}</span>) : <span>当前领域未匹配到可用人员</span>}</div>}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
              <button type="submit" disabled={missionSubmitting || !isAdmin} className="cyber-btn success" style={{ width: '100%', height: '42px' }}>
                <PlusCircle size={16} /> {!isAdmin ? '仅管理员可发布任务' : missionSubmitting ? '正在上传并发布...' : '发布该任务至公开看板'}
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
