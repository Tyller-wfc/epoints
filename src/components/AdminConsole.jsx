import React, { useState } from 'react';
import { Sliders, PlusCircle, Check, X, ShieldAlert, SlidersHorizontal, ShoppingCart, UserCheck } from 'lucide-react';
import { getTransactions } from '../data/mockData';

export default function AdminConsole({ state, onVerifyMission, onUpdateMultiplier, onCreateMission, onDeliverReward, onSetActiveDuty }) {
  const { missions, users, duty, currentUserId } = state;
  const currentUser = users.find(u => u.id === currentUserId) || users[0];
  const isAdmin = currentUser.roleType === "Admin";

  // 新任务表单状态
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newBase, setNewBase] = useState(500);
  const [newCat, setNewCat] = useState("Development");
  const [newMult, setNewMult] = useState(1.0);

  // 倍率临时状态
  const [tempMultipliers, setTempMultipliers] = useState({});

  // 待验证任务
  const pendingMissions = missions.filter(m => m.status === "Pending Verification");

  // 待发放商品 (从 transactions 里捞)
  const transactions = getTransactions();
  const pendingDeliveries = transactions.filter(t => t.status === "Pending Delivery");

  const handleCreateMissionSubmit = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onCreateMission({
      title: newTitle,
      description: newDesc,
      base_points: newBase,
      category: newCat,
      multiplier: newMult
    });

    setNewTitle("");
    setNewDesc("");
    setNewBase(500);
    setNewCat("Development");
    setNewMult(1.0);
  };

  const handleMultiplierChangeLocal = (missionId, val) => {
    setTempMultipliers(prev => ({
      ...prev,
      [missionId]: val
    }));
  };

  const handleApplyMultiplier = (missionId) => {
    const val = tempMultipliers[missionId];
    if (val === undefined) return;
    onUpdateMultiplier(missionId, val);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      
      {!isAdmin && (
        <div style={{ padding: '12px 20px', background: 'rgba(255,75,75,0.1)', border: '1px solid var(--accent-red)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert size={16} className="glow-text-red" />
          <span style={{ fontSize: '0.85rem', color: 'var(--accent-red)' }}>
            ⚠️ <strong>当前用户非效能主管权限：</strong>您现在是以开发/测试人员身份浏览管理后台。此处操作已被特别放开，用于方便您的功能演练。
          </span>
        </div>
      )}

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
                const earner = users.find(u => u.id === m.assigned_to) || { name: "未知人员" };
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
                      <button 
                        onClick={() => onVerifyMission(m.id, true)} 
                        className="cyber-btn success" 
                        style={{ padding: '8px', fontSize: '0.75rem', width: '100%' }}
                      >
                        <Check size={14} /> 审核通过・拨付积分
                      </button>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => onVerifyMission(m.id, false)} 
                          className="cyber-btn" 
                          style={{ flex: 1, padding: '6px', fontSize: '0.75rem', borderColor: 'var(--border-muted)', background: 'transparent' }}
                        >
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
                const user = users.find(u => u.id === t.user_id) || { name: "未知人员" };
                const item = state.rewards.find(r => r.id === t.reward_id) || { title: "未知商品", image: "📦" };

                return (
                  <div key={t.id} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-muted)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: 'var(--text-bright)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {item.image} {item.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        申请人: <strong>{user.name}</strong> | 消耗积分: {t.points_spent} eP
                      </div>
                    </div>

                    <button 
                      onClick={() => onDeliverReward(t.id)} 
                      className="cyber-btn success" 
                      style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    >
                      <Check size={14} /> 确认发放
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 核心任务分值调控 & 换班管理 */}
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

        {/* 换班制度管理 */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="military-font glow-text-cyan" style={{ fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={18} />
            技术值班换班排班管理
          </h3>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4', marginBottom: '16px' }}>
            点击下方的“接替值班”可以动态调配当前在岗的保障人员。若系统被申报红色警报，工单将指派给在岗值班人员。
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {duty.map(d => {
              const user = users.find(u => u.id === d.user_id) || { name: "未知人员", avatar: "" };
              return (
                <div 
                  key={d.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '4px',
                    background: d.is_active ? 'rgba(74,222,128,0.03)' : 'rgba(0,0,0,0.2)',
                    border: d.is_active ? '1px solid var(--accent-green)' : '1px solid var(--border-muted)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={user.avatar} alt={user.name} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-bright)' }}>{user.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>排班时段: {d.shift_start} - {d.shift_end}</div>
                    </div>
                  </div>

                  {d.is_active ? (
                    <span className="badge green" style={{ fontSize: '0.7rem' }}>在岗值班中</span>
                  ) : (
                    <button 
                      onClick={() => onSetActiveDuty(d.id)}
                      className="cyber-btn"
                      style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                    >
                      接替值班
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 发布新任务 */}
      <div className="glass-panel" style={{ padding: '24px' }}>
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
                  min={100}
                  max={5000}
                  value={newBase}
                  onChange={(e) => setNewBase(parseInt(e.target.value))}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>初始倍率</label>
                <select
                  className="cyber-select"
                  value={newMult}
                  onChange={(e) => setNewMult(parseFloat(e.target.value))}
                >
                  <option value="1.0">1.0x 标准</option>
                  <option value="1.2">1.2x 引导</option>
                  <option value="1.5">1.5x 加急</option>
                  <option value="2.0">2.0x 火速</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>对应专业领域</label>
              <select
                className="cyber-select"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
              >
                <option value="Development">Development (研发)</option>
                <option value="Design">Design (设计)</option>
                <option value="QA">QA (质量测试)</option>
                <option value="Operations">Operations (运维保障)</option>
              </select>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
              <button type="submit" className="cyber-btn success" style={{ width: '100%', height: '42px' }}>
                <PlusCircle size={16} /> 发布该任务至公开看板
              </button>
            </div>
          </div>
        </form>
      </div>

    </div>
  );
}
