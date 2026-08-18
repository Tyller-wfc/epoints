import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, AlertTriangle, CheckSquare, Clock, Coins, Users, AlertOctagon } from 'lucide-react';
import AttachmentPicker from './AttachmentPicker';
import AttachmentList from './AttachmentList';

export default function SupportCenter({ state, onRaiseAlert, onResolveTicket, onPenalizeNegligence, onFlagSecondaryIncident, onAcknowledgeTicket }) {
  const { tickets, duty, users, currentUserId } = state;

  // 过滤当前活动值班人
  const activeDuty = duty.find(d => d.is_active);
  const activeOnCallUser = activeDuty ? users.find(u => u.id === activeDuty.user_id) : users.find(u => u.roleType === "Engineer");

  // 工单列表的分流 Tab：处理中 (processing) 和 已处理 (resolved)
  const [activeListTab, setActiveListTab] = useState("processing");
  // 已处理分页状态
  const [resolvedPage, setResolvedPage] = useState(1);
  const RESOLVED_PAGE_SIZE = 5;

  // 表单状态
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [severity, setSeverity] = useState("High");
  const [isAlerting, setIsAlerting] = useState(false);
  const [ticketFiles, setTicketFiles] = useState([]);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketError, setTicketError] = useState('');

  // 解决问题状态
  const [resolvingTicketId, setResolvingTicketId] = useState(null);
  const [resolutionNote, setResolutionNote] = useState("");

  // 页面流逝时间自增刷新 (模拟工单 SLA 响应倒计时)
  const [, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(s => s + 1);
    }, 10000); // 10秒刷一次时间
    return () => clearInterval(timer);
  }, []);

  // 1. 处理中工单：首先按照紧急程度排序（Critical -> High -> Medium -> Low），其次按登记时间（越早登记越靠前，以便优先处理超期工单）
  const processingTickets = useMemo(() => {
    const list = tickets.filter(t => t.status !== "Resolved");
    const severityWeight = {
      'Critical': 4,
      'High': 3,
      'Medium': 2,
      'Low': 1
    };
    return list.sort((a, b) => {
      const weightA = severityWeight[a.severity] || 0;
      const weightB = severityWeight[b.severity] || 0;
      if (weightB !== weightA) {
        return weightB - weightA;
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [tickets]);

  // 2. 已处理工单：按解决时间倒序（最新的解决排在最前）
  const resolvedTickets = useMemo(() => {
    const list = tickets.filter(t => t.status === "Resolved");
    return list.sort((a, b) => {
      const timeA = a.resolved_at ? new Date(a.resolved_at).getTime() : 0;
      const timeB = b.resolved_at ? new Date(b.resolved_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [tickets]);

  const totalResolvedPages = Math.ceil(resolvedTickets.length / RESOLVED_PAGE_SIZE) || 1;

  // 自动修正已处理分页超出范围
  useEffect(() => {
    if (resolvedPage > totalResolvedPages) {
      setResolvedPage(Math.max(1, totalResolvedPages));
    }
  }, [resolvedTickets.length, totalResolvedPages, resolvedPage]);

  const paginatedResolvedTickets = useMemo(() => {
    const start = (resolvedPage - 1) * RESOLVED_PAGE_SIZE;
    return resolvedTickets.slice(start, start + RESOLVED_PAGE_SIZE);
  }, [resolvedTickets, resolvedPage]);




  const handleSubmitAlert = async (e) => {
    e.preventDefault();
    if (!ticketTitle.trim()) return;

    // 触发红色警报震颤视觉效果
    if (severity === "Critical") {
      setIsAlerting(true);
      setTimeout(() => setIsAlerting(false), 3000);
    }

    setTicketSubmitting(true);
    setTicketError('');
    try {
      await onRaiseAlert({ reporter_id: currentUserId, title: ticketTitle, description: ticketDesc, severity }, ticketFiles);
      setTicketTitle("");
      setTicketDesc("");
      setSeverity("High");
      setTicketFiles([]);
    } catch (error) {
      setTicketError(error.message || '故障上报失败');
    } finally {
      setTicketSubmitting(false);
    }
  };

  const handleResolveClick = (e, ticketId) => {
    e.preventDefault();
    if (!resolutionNote.trim()) return;
    onResolveTicket(ticketId, resolutionNote);
    setResolvingTicketId(null);
    setResolutionNote("");
  };

  // 计算已流逝时长文本
  const getElapsedText = (isoCreatedAt) => {
    const created = new Date(isoCreatedAt).getTime();
    const now = Date.now();
    const diffMs = now - created;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "刚刚上报";
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours} 小时 ${minutes % 60} 分钟`;
    }
    return `${minutes} 分钟`;
  };

  // 根据接单后已流逝时间预测当前的 MTTR 极速恢复倍率奖励
  const getPredictiveMultiplier = (ticket) => {
    if (ticket.status === "Open") return { text: "等待接单响应中 (15分钟内响应)", color: 'var(--accent-orange)' };
    if (ticket.status === "Resolved") return { text: "排障已完成", color: 'var(--accent-green)' };
    
    const acknowledged = new Date(ticket.acknowledged_at).getTime();
    const now = Date.now();
    const diffMinutes = (now - acknowledged) / 60000;
    if (diffMinutes <= 30) return { text: "黄金30分钟 1.5x 恢复倍率中", color: 'var(--accent-green)' };
    if (diffMinutes <= 60) return { text: "白银60分钟 1.2x 恢复倍率中", color: 'var(--accent-cyan)' };
    if (diffMinutes > 120) return { text: "超时恢复 0.7x 积分衰减中", color: 'var(--accent-red)' };
    return { text: "标准恢复 1.0x 积分结算中", color: 'var(--text-secondary)' };
  };

  // 格式化时间
  const formatDateTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "未知";
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      
      {/* 红警视觉警报覆盖物 */}
      {isAlerting && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255, 0, 0, 0.2)',
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow: 'inset 0 0 100px rgba(255, 0, 0, 0.8)',
          animation: 'redAlertPulse 0.5s infinite ease-in-out'
        }} />
      )}

      {/* 值班人卡片及一键报警 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* 当前技术值班岗 */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="badge green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={12} /> 技术运维值班岗 (On-Call)
              </span>
              <span className="military-font glow-text-green" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>在岗中</span>
            </div>

            {activeOnCallUser ? (
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
                <img 
                  src={activeOnCallUser.avatar} 
                  alt={activeOnCallUser.name} 
                  style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid var(--accent-green)', boxShadow: '0 0 10px var(--accent-green-glow)' }}
                />
                <div>
                  <h4 style={{ color: 'var(--text-bright)', fontSize: '1.1rem', marginBottom: '4px' }}>{activeOnCallUser.name}</h4>
                  <div className="badge muted" style={{ fontSize: '0.75rem' }}>{activeOnCallUser.role}</div>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>暂无活跃保障员在岗</p>
            )}

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '20px' }}>
              当生产环境发生故障或影响客户体验的重大Bug时，系统根据值班表自动将红色警报故障分派给当前值班的研发人员，并提供极速响应的积分加成激励。
            </p>
          </div>

        </div>

        {/* 值班故障登记舱 */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="military-font glow-text-red" style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} />
            值班保障人员故障登记
          </h3>

          <form onSubmit={handleSubmitAlert} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <input
                type="text"
                className="cyber-input"
                placeholder="故障问题简述（例如：账单同步延迟超5分钟）..."
                required
                value={ticketTitle}
                onChange={(e) => setTicketTitle(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
              
              <select
                className="cyber-select"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                style={{ fontSize: '0.85rem', color: severity === 'Critical' ? 'var(--accent-red)' : 'var(--text-bright)' }}
              >
                <option value="Critical">红色警报 (紧急)</option>
                <option value="High">严重故障 (高级)</option>
                <option value="Medium">一般故障 (中级)</option>
                <option value="Low">轻微问题 (低级)</option>
              </select>
            </div>

            <textarea
              className="cyber-input"
              rows={2}
              placeholder="请输入故障的详细背景、受影响的业务模块以及现场报错信息，以便运维团队排障..."
              required
              value={ticketDesc}
              onChange={(e) => setTicketDesc(e.target.value)}
              style={{ resize: 'none', fontSize: '0.85rem' }}
            />

            <AttachmentPicker files={ticketFiles} onChange={setTicketFiles} disabled={ticketSubmitting} />
            {ticketError && <div className="attachment-error">{ticketError}</div>}

            <button
              type="submit"
              disabled={ticketSubmitting}
              className={`cyber-btn danger ${severity === 'Critical' ? 'red-alert-box' : ''}`}
              style={{ width: '100%', height: '42px', fontSize: '0.85rem' }}
            >
              <ShieldAlert size={18} />
              {ticketSubmitting ? '正在登记并提交...' : severity === 'Critical' ? "登记并触发红色警报・指派值班人员" : "登记并提交故障"}
            </button>
          </form>
          
          {/* 50人团队轻量级：Webhook 状态指示 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-muted)', justifyContent: 'center', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: state.wecomWebhook?.configured ? 'var(--accent-green)' : 'rgba(255,255,255,0.2)' }} />
            <span>
              {state.wecomWebhook?.configured
                ? `企业微信提醒已就绪（系统故障上报将同步到群聊）`
                : `企业微信消息推送未配置（故障将仅在网页广播）`
              }
            </span>
          </div>
        </div>

      </div>

      {/* 工单调度控制屏 */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 className="military-font glow-text-cyan" style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} />
          系统故障响应及处理队列
        </h3>

        {/* Tab 选项卡 */}
        <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-muted)', marginBottom: '20px', paddingBottom: '8px' }}>
          <button
            onClick={() => setActiveListTab("processing")}
            className={`cyber-btn ${activeListTab === "processing" ? "active" : ""}`}
            style={{
              padding: '6px 16px',
              fontSize: '0.8rem',
              background: activeListTab === "processing" ? 'var(--accent-cyan)' : 'transparent',
              borderColor: activeListTab === "processing" ? 'var(--accent-cyan)' : 'transparent',
              color: activeListTab === "processing" ? 'black' : 'var(--text-secondary)',
            }}
          >
            处理中 ({processingTickets.length})
          </button>
          <button
            onClick={() => {
              setActiveListTab("resolved");
              setResolvedPage(1);
            }}
            className={`cyber-btn ${activeListTab === "resolved" ? "active" : ""}`}
            style={{
              padding: '6px 16px',
              fontSize: '0.8rem',
              background: activeListTab === "resolved" ? 'var(--accent-cyan)' : 'transparent',
              borderColor: activeListTab === "resolved" ? 'var(--accent-cyan)' : 'transparent',
              color: activeListTab === "resolved" ? 'black' : 'var(--text-secondary)',
            }}
          >
            已处理 ({resolvedTickets.length})
          </button>
        </div>

        {/* 列表渲染 */}
        {(() => {
          const displayTickets = activeListTab === "processing" ? processingTickets : paginatedResolvedTickets;

          if (displayTickets.length === 0) {
            return (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {activeListTab === "processing" ? "暂无处理中的故障单，系统运行平稳。" : "暂无已处理完成的故障单。"}
              </div>
            );
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {displayTickets.map(t => {
                const reporter = users.find(u => u.id === t.reporter_id) || { name: "未知上报人" };
                const assignee = users.find(u => u.id === t.assigned_to) || { name: "未分配" };
                const isResolved = t.status === "Resolved";
                const isAssignedToMe = t.assigned_to === currentUserId;
                const isCritical = t.severity === "Critical";

                const pred = getPredictiveMultiplier(t);

                return (
                  <div
                    key={t.id}
                    className="glass-panel"
                    style={{
                      padding: '20px',
                      border: isCritical && !isResolved ? '1px solid var(--accent-red)' : '1px solid var(--border-muted)',
                      boxShadow: isCritical && !isResolved ? '0 0 15px rgba(255,75,75,0.1)' : 'none',
                      background: isResolved ? 'rgba(0,0,0,0.1)' : isCritical ? 'rgba(255,75,75,0.02)' : 'rgba(0,0,0,0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={`badge ${t.severity === 'Critical' ? 'red' : t.severity === 'High' ? 'orange' : 'cyan'}`}>
                          {t.severity === 'Critical' ? '红色警戒 (Critical)' : t.severity === 'High' ? '严重故障' : '普通问题'}
                        </span>
                        {t.negligence_penalized && (
                          <span className="badge red" style={{ fontSize: '0.65rem', animation: 'none' }}>
                            🚨 响应怠慢已扣分
                          </span>
                        )}
                        {t.secondary_fault && (
                          <span className="badge orange" style={{ fontSize: '0.65rem', animation: 'none' }}>
                            ⚠️ 二次重开 (已返工)
                          </span>
                        )}
                        <h4 style={{ color: isResolved ? 'var(--text-secondary)' : 'var(--text-bright)', fontSize: '1rem', fontWeight: 'bold' }}>
                          {t.title}
                        </h4>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-cyan)' }}>
                          <Coins size={12} />
                          <span className="military-font" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                            {t.points_earned_actual || t.points_reward} eP
                          </span>
                        </div>
                        <span className={`badge ${t.status === 'Resolved' ? 'green' : t.status === 'Acknowledged' ? 'cyan' : 'orange'}`}>
                          {t.status === 'Resolved' ? '已排除' : t.status === 'Acknowledged' ? '处理中' : '待接单'}
                        </span>
                      </div>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '12px' }}>
                      {t.description}
                    </p>
                    <AttachmentList attachments={t.attachments} />

                    {/* 信息元数据栏 */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--border-muted)', paddingTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <span>上报人: <strong>{reporter.name}</strong></span>
                        <span>故障处理负责人: <strong>{assignee.name} {isAssignedToMe && <span style={{ color: 'var(--accent-cyan)' }}>(您)</span>}</strong></span>
                        <span>上报时间: {formatDateTime(t.created_at)}</span>
                        {t.acknowledged_at && (
                          <span>接单时间: {formatDateTime(t.acknowledged_at)} (MTTA 响应: {t.mtta_minutes} 分钟)</span>
                        )}
                      </div>

                      {t.status === "Open" && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-orange)' }}>
                          <Clock size={12} />
                          <span>等待接单: <strong style={{ color: 'var(--text-primary)' }}>{getElapsedText(t.created_at)}</strong></span>
                          <span style={{ color: 'var(--text-muted)' }}>|</span>
                          <span style={{ color: pred.color, fontWeight: 'bold' }}>{pred.text}</span>
                        </div>
                      )}
                      {t.status === "Acknowledged" && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)' }}>
                          <Clock size={12} />
                          <span>开始恢复: <strong style={{ color: 'var(--text-primary)' }}>{getElapsedText(t.acknowledged_at)}</strong></span>
                          <span style={{ color: 'var(--text-muted)' }}>|</span>
                          <span style={{ color: pred.color, fontWeight: 'bold' }}>{pred.text}</span>
                        </div>
                      )}
                      {t.status === "Resolved" && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-green)' }}>
                          <CheckSquare size={12} />
                          <span>SLA 恢复完成 (MTTR: {t.mttr_minutes} 分钟) | 修复报告: {t.resolution_note}</span>
                          {t.resolved_at && <span>({formatDateTime(t.resolved_at)} 排除)</span>}
                        </div>
                      )}
                    </div>

                    {/* 解决按钮和输入表单 */}
                    {!isResolved && isAssignedToMe && (
                      <div style={{ borderTop: '1px dashed var(--border-cyan)', marginTop: '12px', paddingTop: '12px' }}>
                        {t.status === "Open" ? (
                          <button
                            className="cyber-btn success animate-pulse"
                            style={{ width: '100%', padding: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}
                            onClick={() => onAcknowledgeTicket(t.id, currentUserId)}
                          >
                            ⚡ 确认接单响应，开始排障（停止 MTTA SLA 响应计时）
                          </button>
                        ) : resolvingTicketId === t.id ? (
                          <form onSubmit={(e) => handleResolveClick(e, t.id)} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="cyber-input"
                              required
                              placeholder="请输入故障修复报告（如：已重新挂载磁盘，清理无用缓存，服务响应恢复正常）..."
                              value={resolutionNote}
                              onChange={(e) => setResolutionNote(e.target.value)}
                              style={{ fontSize: '0.8rem', flex: 1 }}
                            />
                            <button type="submit" className="cyber-btn success" style={{ padding: '6px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                              确认排除
                            </button>
                            <button type="button" className="cyber-btn" onClick={() => setResolvingTicketId(null)} style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--border-muted)', background: 'transparent' }}>
                              取消
                            </button>
                          </form>
                        ) : (
                          <button
                            className="cyber-btn success"
                            style={{ width: '100%', padding: '8px', fontSize: '0.8rem' }}
                            onClick={() => setResolvingTicketId(t.id)}
                          >
                            <CheckSquare size={14} /> 我已解决此故障，申请结算排障积分（停止 MTTR SLA 恢复计时）
                          </button>
                        )}
                      </div>
                    )}

                    {/* 主管效能审计栏 */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', borderTop: '1px dashed rgba(255,255,255,0.05)', marginTop: '12px', paddingTop: '10px' }}>
                      <span className="badge muted" style={{ fontSize: '0.65rem' }}>主管效能审计</span>
                      
                      {t.status === "Open" && (
                        t.negligence_penalized ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertOctagon size={12} /> 已扣分警告 (接单慢)
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              if (window.confirm(`确认判定值班员 [${assignee.name}] 响应不力并处以 100 eP 罚扣？`)) {
                                onPenalizeNegligence(t.id);
                              }
                            }}
                            className="cyber-btn danger animate-pulse"
                            style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                          >
                            判定接单响应不力 (-100 eP)
                          </button>
                        )
                      )}

                      {isResolved && (
                        <button
                          onClick={() => {
                            if (window.confirm(`确认将该故障判定为二次故障或返工？工单将重开并进入“处理中”，同时从修复人 [${assignee.name}] 账户中扣减 150 eP。`)) {
                              onFlagSecondaryIncident(t.id);
                            }
                          }}
                          className="cyber-btn danger"
                          style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                        >
                          判定二次故障/返工并追责 (-150 eP)
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* 已处理 Tab 下的分页控件 */}
        {activeListTab === "resolved" && resolvedTickets.length > RESOLVED_PAGE_SIZE && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
            <button
              onClick={() => setResolvedPage(p => Math.max(1, p - 1))}
              disabled={resolvedPage === 1}
              className="cyber-btn"
              style={{ padding: '6px 12px', fontSize: '0.75rem', opacity: resolvedPage === 1 ? 0.4 : 1 }}
            >
              上一页
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              第 {resolvedPage} / {totalResolvedPages} 页 (共 {resolvedTickets.length} 条已处理工单)
            </span>
            <button
              onClick={() => setResolvedPage(p => Math.min(totalResolvedPages, p + 1))}
              disabled={resolvedPage === totalResolvedPages}
              className="cyber-btn"
              style={{ padding: '6px 12px', fontSize: '0.75rem', opacity: resolvedPage === totalResolvedPages ? 0.4 : 1 }}
            >
              下一页
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
