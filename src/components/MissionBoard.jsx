import React, { useState } from 'react';
import { Compass, Flame, CheckCircle2, Clock, PlayCircle, Send, ExternalLink } from 'lucide-react';
import AttachmentList from './AttachmentList';

export default function MissionBoard({ state, onClaimMission, onSubmitProof }) {
  const { missions, users, currentUserId, taskDomains = [] } = state;
  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  const [activeFilter, setActiveFilter] = useState("ALL");
  const [activeCategory, setActiveCategory] = useState("ALL");

  // 证明提交临时状态
  const [submittingMissionId, setSubmittingMissionId] = useState(null);
  const [proofText, setProofText] = useState("");

  const categories = [{ id: 'ALL', name: '全部' }, ...taskDomains];
  const filters = [
    { value: "ALL", label: "全部任务" },
    { value: "Available", label: "可领任务" },
    { value: "In Progress", label: "我的任务(进行中)" },
    { value: "Pending Verification", label: "成果审核中" },
    { value: "Completed", label: "交付完成" }
  ];

  // 过滤逻辑
  const filteredMissions = missions.filter(m => {
    // 类别过滤
    if (activeCategory !== "ALL" && !m.domains?.some(item => item.domainId === activeCategory)) return false;
    
    // 状态过滤
    if (activeFilter === "ALL") return true;
    if (activeFilter === "In Progress") {
      return m.status === "In Progress" && m.assigned_to === currentUserId;
    }
    return m.status === activeFilter;
  });

  const handleOpenProofForm = (missionId) => {
    setSubmittingMissionId(missionId);
    setProofText("");
  };

  const handleCloseProofForm = () => {
    setSubmittingMissionId(null);
    setProofText("");
  };

  const handleSubmitProofClick = (e, missionId) => {
    e.preventDefault();
    if (!proofText.trim()) return;
    onSubmitProof(missionId, proofText);
    handleCloseProofForm();
  };

  return (
    <div>
      {/* 筛选面板 */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* 状态筛选 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '8px' }}>任务状态：</span>
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className="cyber-btn"
              style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                background: activeFilter === f.value ? 'var(--accent-cyan)' : 'rgba(0, 0, 0, 0.2)',
                borderColor: activeFilter === f.value ? 'var(--accent-cyan)' : 'var(--border-muted)',
                color: activeFilter === f.value ? 'black' : 'var(--text-primary)'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 类别筛选 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '8px' }}>专业领域：</span>
          {categories.map(cat => {
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="cyber-btn"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  background: activeCategory === cat.id ? 'var(--accent-cyan)' : 'rgba(0, 0, 0, 0.2)',
                  borderColor: activeCategory === cat.id ? 'var(--accent-cyan)' : 'var(--border-muted)',
                  color: activeCategory === cat.id ? 'black' : 'var(--text-primary)'
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

      </div>

      {/* 任务卡片网格 */}
      {filteredMissions.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Compass size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <div>暂无符合筛选条件的项目任务。</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
          {filteredMissions.map(m => {
            const assignee = users.find(u => u.id === m.assigned_to);
            const totalPoints = Math.round(m.base_points * m.multiplier);
            const isHighMultiplier = m.multiplier > 1.0;
            const isMyTask = m.assigned_to === currentUserId;

            return (
              <div 
                key={m.id}
                className="glass-panel"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  border: isHighMultiplier ? '1px solid var(--accent-orange)' : '1px solid var(--border-cyan)',
                  boxShadow: isHighMultiplier ? '0 0 15px rgba(249, 115, 22, 0.15)' : 'none'
                }}
              >
                <div>
                  {/* 卡片头部：分类与积分 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {(m.domains || []).map(item => <span className={`badge ${item.isPrimary ? 'cyan' : 'muted'}`} key={item.domainId}>{item.domain?.name}{item.isPrimary ? ' · 主' : ''}</span>)}
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div className="military-font" style={{ color: isHighMultiplier ? 'var(--accent-orange)' : 'var(--accent-cyan)', fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isHighMultiplier && <Flame size={16} className="glow-text-orange" />}
                        {totalPoints} eP
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        基础 {m.base_points} × {m.multiplier}x
                      </div>
                    </div>
                  </div>

                  {/* 标题和描述 */}
                  <h4 style={{ color: 'var(--text-bright)', fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '10px', lineHeight: '1.4' }}>
                    {m.title}
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '12px' }}>
                    {m.description}
                  </p>
                  <AttachmentList attachments={m.attachments} />
                </div>

                {/* 卡片底部：状态与操作 */}
                <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '16px' }}>
                  {/* 认领人信息 */}
                  {assignee && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <img src={assignee.avatar} alt={assignee.name} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        承接人：<strong>{assignee.name}</strong> 
                        {isMyTask && <span style={{ color: 'var(--accent-cyan)', marginLeft: '6px' }}>(我)</span>}
                      </span>
                    </div>
                  )}

                  {/* 不同状态操作按钮 */}
                  {m.status === "Available" && (
                    <button
                      className="cyber-btn"
                      style={{ width: '100%' }}
                      disabled={currentUser.roleType === "Admin"}
                      onClick={() => onClaimMission(m.id, currentUserId)}
                    >
                      <PlayCircle size={16} /> 
                      {currentUser.roleType === "Admin" ? "主管不可直接认领" : "认领该项目任务"}
                    </button>
                  )}

                  {m.status === "In Progress" && isMyTask && (
                    <div>
                      {submittingMissionId === m.id ? (
                        <form onSubmit={(e) => handleSubmitProofClick(e, m.id)} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <textarea
                            className="cyber-input"
                            rows={3}
                            placeholder="请提供交付成果证明（如：GitHub PR 链接、测试报告或文档 Wiki 链接）..."
                            required
                            value={proofText}
                            onChange={(e) => setProofText(e.target.value)}
                            style={{ resize: 'none', fontSize: '0.8rem' }}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="submit" className="cyber-btn success" style={{ flex: 1, padding: '6px 12px', fontSize: '0.75rem' }}>
                              <Send size={12} /> 提交审核
                            </button>
                            <button type="button" onClick={handleCloseProofForm} className="cyber-btn" style={{ flex: 1, padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--border-muted)', background: 'transparent' }}>
                              取消
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          className="cyber-btn warning"
                          style={{ width: '100%' }}
                          onClick={() => handleOpenProofForm(m.id)}
                        >
                          <Send size={16} /> 提交成果交付证明
                        </button>
                      )}
                    </div>
                  )}

                  {m.status === "In Progress" && !isMyTask && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.8rem', justifyContent: 'center', height: '38px' }}>
                      <Clock size={14} /> 团队成员正在开发中...
                    </div>
                  )}

                  {m.status === "Pending Verification" && (
                    <div style={{ background: 'rgba(249, 115, 22, 0.05)', border: '1px dashed var(--accent-orange)', padding: '10px', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-orange)', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>
                        <Clock size={14} /> 成果审核中，等待总监核准...
                      </div>
                      {m.proof_of_work && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '2px', wordBreak: 'break-all' }}>
                          <ExternalLink size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>证明: {m.proof_of_work}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {m.status === "Completed" && (
                    <div 
                      className="glass-panel" 
                      style={{ 
                        padding: '10px', 
                        background: 'rgba(74, 222, 128, 0.05)', 
                        border: '1px solid rgba(74, 222, 128, 0.2)', 
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: 'var(--accent-green)',
                        fontSize: '0.85rem',
                        fontWeight: 'bold'
                      }}
                    >
                      <CheckCircle2 size={16} /> 交付完成 (已发 eP)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
