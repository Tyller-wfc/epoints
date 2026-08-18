import React, { useEffect, useMemo, useState } from 'react';
import { Award, BriefcaseBusiness, Check, CheckCircle2, Clock3, Headphones, MessageSquareText, Plus, ShieldCheck, UserRoundCheck, UsersRound } from 'lucide-react';
import {
  addServiceFeedback,
  createExternalCustomer,
  createServiceRecord,
  getServiceCenter,
  transitionServiceRecord,
} from '../data/mockData';

const statusLabels = {
  New: '待受理', Accepted: '已受理', 'In Progress': '服务中',
  Completed: '已完成', 'Pending Evaluation': '待评价', Evaluated: '已评价', Reopened: '返工中', Cancelled: '已取消',
};

const sourceTypeLabels = {
  'Customer Confirmation': '客户确认函',
  Praise: '表扬/感谢',
  Complaint: '投诉/意见',
  Rework: '返工/重处理',
  'Phone Follow-up': '电话回访',
  'WeCom Message': '企微沟通记录',
};

const participantRoleLabels = {
  'Service Owner': '服务负责人',
  'Primary Provider': '主要提供者',
  Collaborator: '协同人员',
  'On-Call Coordinator': '值班协调员',
};

const nextActions = {
  New: ['In Progress'],
  'In Progress': ['Pending Evaluation'],
  'Pending Evaluation': ['Reopened'],
  Reopened: ['Pending Evaluation'],
};

const transitionLabels = {
  'In Progress': '已受理',
  'Pending Evaluation': '已完成',
  Reopened: '返工',
};

// defaultScores was removed as it's no longer needed for manual evaluation

export default function CustomerServiceCenter({ showToast }) {
  const [data, setData] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedMissions, setSelectedMissions] = useState([]);
  const [settlementMode, setSettlementMode] = useState('Standalone');

  useEffect(() => {
    setSelectedMissions([]);
  }, [selectedUsers]);

  useEffect(() => {
    if (settlementMode === 'Standalone') {
      setSelectedMissions([]);
    }
  }, [settlementMode]);

  const load = async () => {
    try {
      const result = await getServiceCenter();
      setData(result);
      setSelectedId((current) => current && result.records.some((item) => item.id === current) ? current : result.records[0]?.id || null);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => { load(); }, []);

  const selected = data?.records.find((item) => item.id === selectedId);
  const customerById = useMemo(() => new Map((data?.customers || []).map((item) => [item.id, item])), [data]);
  const userById = useMemo(() => new Map((data?.users || []).map((item) => [item.id, item])), [data]);
  const participants = (data?.participants || []).filter((item) => item.serviceRecordId === selectedId);
  const missionLinks = (data?.missionLinks || []).filter((item) => item.serviceRecordId === selectedId);
  const missionById = useMemo(() => new Map((data?.missions || []).map((item) => [item.id, item])), [data]);
  const feedback = (data?.feedback || []).filter((item) => item.serviceRecordId === selectedId);
  const evaluations = data?.evaluations || [];

  const [archiveExpanded, setArchiveExpanded] = useState(false);

  const activeRecords = useMemo(() => {
    return (data?.records || []).filter(
      (record) => ['New', 'Accepted', 'In Progress', 'Reopened', 'Pending Evaluation'].includes(record.status)
    );
  }, [data]);

  const archivedRecords = useMemo(() => {
    return (data?.records || []).filter(
      (record) => ['Completed', 'Evaluated', 'Cancelled'].includes(record.status)
    );
  }, [data]);

  useEffect(() => {
    if (selectedId && archivedRecords.some((r) => r.id === selectedId)) {
      setArchiveExpanded(true);
    }
  }, [selectedId, archivedRecords]);

  const submit = async (operation) => {
    setBusy(true);
    setError('');
    try {
      const result = await operation();
      setData(result);
      setSelectedId((current) => current || result.records[0]?.id || null);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="glass-panel service-loading">正在载入客户服务台账...</div>;

  const handleCreateCustomer = async (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    if (await submit(() => createExternalCustomer(Object.fromEntries(form)))) {
      formEl.reset();
      setShowCustomerForm(false);
      showToast?.('success', '客户创建成功 ✓');
    }
  };

  const handleCreateRecord = async (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    if (!selectedUsers.length) return setError('请至少选择一名服务人员');
    const baseWeight = Math.floor(100 / selectedUsers.length);
    const isOnCall = form.get('serviceMode') === 'On Call';
    const settlementMode = form.get('settlementMode') === 'Mission Linked' ? 'Mission Linked' : 'Standalone';
    if (isOnCall && !selectedUsers.includes(data.activeDutyUserId)) return setError('非工作时间服务必须选择当前值班人员');
    if (settlementMode === 'Mission Linked' && !selectedMissions.length) return setError('任务关联服务至少选择一个内部任务');
    const participantsPayload = selectedUsers.map((userId, index) => ({
      userId,
      participantRole: isOnCall && userId === data.activeDutyUserId ? 'On-Call Coordinator' : index === 0 ? 'Service Owner' : 'Collaborator',
      responsibility: isOnCall && userId === data.activeDutyUserId ? '负责非工作时间受理、分级、协调、升级和交接' : index === 0 ? '负责客户沟通、服务结果与整体协调' : '按分工完成专业协作',
      contributionWeight: baseWeight + (index === 0 ? 100 - baseWeight * selectedUsers.length : 0),
    }));
    const missionWeight = selectedMissions.length ? Math.floor(100 / selectedMissions.length) : 0;
    const missionLinks = selectedMissions.map((missionId, index) => ({
      missionId,
      userId: selectedUsers[0],
      allocationWeight: missionWeight + (index === 0 ? 100 - missionWeight * selectedMissions.length : 0),
    }));
    const payload = { ...Object.fromEntries(form), settlementMode, participants: participantsPayload, missionLinks };
    if (await submit(() => createServiceRecord(payload))) {
      formEl.reset();
      setSelectedUsers([]);
      setSelectedMissions([]);
      setSettlementMode('Standalone');
      setShowRecordForm(false);
      showToast?.('success', '服务记录创建成功 ✓');
    }
  };

  return (
    <div className="service-center">
      <section className="service-policy-strip">
        <div><Clock3 size={18} /><span><strong>8 小时 × 5 天</strong><small>标准工作与休息保障</small></span></div>
        <div><Headphones size={18} /><span><strong>值班协调</strong><small>非工作时间统一承接</small></span></div>
        <div><ShieldCheck size={18} /><span><strong>专业 · 热情</strong><small>主动、公平、个性化</small></span></div>
      </section>

      <section className="service-summary-grid">
        <Summary icon={BriefcaseBusiness} label="参与服务" value={data.mySummary.participatedCount} />
        <Summary icon={UserRoundCheck} label="已评价" value={data.mySummary.evaluatedCount} />
        <Summary icon={Award} label="平均服务分" value={data.mySummary.averageScore} />
        <Summary icon={CheckCircle2} label="服务积分" value={`${data.mySummary.servicePoints} eP`} />
      </section>

      {error && <div className="service-error">{error}</div>}

      {data.canManage && (
        <section className="service-toolbar">
          <button className="cyber-btn" onClick={() => setShowCustomerForm((value) => !value)}><UsersRound size={15} /> 客户档案</button>
          <button className="cyber-btn success" onClick={() => setShowRecordForm((value) => !value)}><Plus size={15} /> 登记服务</button>
        </section>
      )}

      {showCustomerForm && (
        <form className="glass-panel service-form" onSubmit={handleCreateCustomer}>
          <h3>新增外部客户</h3>
          <input className="cyber-input" name="name" placeholder="客户名称" required />
          <input className="cyber-input" name="organization" placeholder="单位或组织" />
          <input className="cyber-input" name="contactName" placeholder="联系人" />
          <input className="cyber-input" name="contactPhone" placeholder="联系电话" />
          <textarea className="cyber-input" name="servicePreferences" placeholder="服务偏好与注意事项" rows={2} />
          <button className="cyber-btn success" disabled={busy}>保存客户</button>
        </form>
      )}

      {showRecordForm && (
        <form className="glass-panel service-form service-record-form" onSubmit={handleCreateRecord}>
          <h3>登记客户服务</h3>
          <select className="cyber-select" name="customerId" required defaultValue="">
            <option value="" disabled>选择外部客户</option>
            {data.customers.filter((item) => item.enabled).map((item) => <option key={item.id} value={item.id}>{item.name} {item.organization ? `· ${item.organization}` : ''}</option>)}
          </select>
          <input className="cyber-input" name="title" placeholder="服务事项" required />
          <input className="cyber-input" name="serviceType" placeholder="服务类型（例如：咨询支持、运维保障）" required />
          <select className="cyber-select" name="priority" defaultValue="" required>
            <option value="" disabled>选择优先级</option>
            <option>P0</option>
            <option>P1</option>
            <option>P2</option>
            <option>P3</option>
          </select>
          <select className="cyber-select" name="serviceMode" defaultValue="Work Hours"><option value="Work Hours">工作时间服务</option><option value="On Call">非工作时间值班服务</option></select>
          <select 
            className="cyber-select" 
            name="settlementMode" 
            value={settlementMode} 
            onChange={(e) => setSettlementMode(e.target.value)}
          >
            <option value="Standalone">独立服务：影响个人 ePoints</option>
            <option value="Mission Linked">关联任务：影响任务 ePoints</option>
          </select>
          <input className="cyber-input" name="basePoints" type="number" min="0" max="1000" defaultValue="100" required />
          <input className="cyber-input" name="promisedAt" type="datetime-local" />
          <textarea className="cyber-input wide" name="description" placeholder="客户需求" rows={3} required />
          <textarea className="cyber-input wide" name="promisedResult" placeholder="对客户承诺的结果和边界" rows={3} required />
          <div className="service-user-picker wide">
            {data.users.filter((item) => item.enabled && item.availability !== 'Leave').map((user) => (
              <label key={user.id} className={selectedUsers.includes(user.id) ? 'selected' : ''}>
                <input 
                  type="radio" 
                  name="serviceUserRadio"
                  checked={selectedUsers.includes(user.id)} 
                  onChange={() => setSelectedUsers([user.id])} 
                />
                <span>{user.name}<small>{user.role} · {user.availability}{user.id === data.activeDutyUserId ? ' · 当前值班' : ''}</small></span>
              </label>
            ))}
          </div>
          {settlementMode === 'Mission Linked' && (
            <div className="service-mission-picker wide">
              <strong>关联内部任务（仅列出该服务人员名下的任务）</strong>
              {selectedUsers.length === 0 ? (
                <div className="service-picker-info-text">请先选择一名服务人员以加载关联任务。</div>
              ) : (
                (() => {
                  const filteredMissions = (data.missions || []).filter(
                    (item) => !['Completed', 'Cancelled'].includes(item.status) && item.assigned_to === selectedUsers[0]
                  );
                  if (filteredMissions.length === 0) {
                    return <div className="service-picker-info-text">该服务人员名下暂无可关联的未完成任务。</div>;
                  }
                  return filteredMissions.map((mission) => (
                    <label key={mission.id} className={selectedMissions.includes(mission.id) ? 'selected' : ''}>
                      <input 
                        type="checkbox" 
                        checked={selectedMissions.includes(mission.id)} 
                        onChange={() => setSelectedMissions((items) => items.includes(mission.id) ? items.filter((id) => id !== mission.id) : [...items, mission.id])} 
                      />
                      <span>{mission.title}<small>{mission.base_points} eP · {mission.assigned_to ? (data.users.find((user) => user.id === mission.assigned_to)?.name || '已分派') : '未分派'}</small></span>
                    </label>
                  ));
                })()
              )}
            </div>
          )}
          <button className="cyber-btn success wide" disabled={busy}>创建服务记录</button>
        </form>
      )}

      <section className="service-workspace">
        <div className="service-list">
          {data.records.length === 0 && <div className="service-empty">暂无服务记录</div>}
          
          {activeRecords.length > 0 && (
            <div className="service-group">
              <div className="service-group-header">当前服务中 ({activeRecords.length})</div>
              <div className="service-group-list">
                {activeRecords.map((record) => (
                  <button 
                    key={record.id} 
                    className={`service-item-btn ${record.id === selectedId ? 'active' : ''}`} 
                    onClick={() => setSelectedId(record.id)}
                  >
                    <span className={`service-priority ${record.priority.toLowerCase()}`}>{record.priority}</span>
                    <span><strong>{record.title}</strong><small>{customerById.get(record.customerId)?.name} · {statusLabels[record.status] || record.status}</small></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {archivedRecords.length > 0 && (
            <div className="service-group archived">
              <button 
                type="button" 
                className="service-group-header-btn" 
                onClick={() => setArchiveExpanded(!archiveExpanded)}
              >
                <span>已归档服务 ({archivedRecords.length})</span>
                <span className="chevron-icon">{archiveExpanded ? '▼' : '▶'}</span>
              </button>
              {archiveExpanded && (
                <div className="service-group-list">
                  {archivedRecords.map((record) => (
                    <button 
                      key={record.id} 
                      className={`service-item-btn ${record.id === selectedId ? 'active' : ''}`} 
                      onClick={() => setSelectedId(record.id)}
                    >
                      <span className={`service-priority ${record.priority.toLowerCase()}`}>{record.priority}</span>
                      <span><strong>{record.title}</strong><small>{customerById.get(record.customerId)?.name} · {statusLabels[record.status] || record.status}</small></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {selected ? (
          <div className="glass-panel service-detail">
            <header>
              <div><span className={`service-priority ${selected.priority.toLowerCase()}`}>{selected.priority}</span><span className="badge cyan">{statusLabels[selected.status] || selected.status}</span></div>
              <h2>{selected.title}</h2>
              <p>{customerById.get(selected.customerId)?.name} · {selected.serviceType} · {selected.serviceMode === 'On Call' ? '值班服务' : '工作时间服务'} · {selected.settlementMode === 'Mission Linked' ? '影响关联任务' : '影响个人 ePoints'}</p>
            </header>
            <div className="service-detail-grid">
              <Detail label="客户需求" text={selected.description} />
              <Detail label="服务承诺" text={selected.promisedResult} />
              {selected.resultSummary && <Detail label="服务结果" text={selected.resultSummary} />}
              <div className="service-participant-list">
                <strong>内部服务人员</strong>
                {participants.map((item) => {
                  const evaluation = evaluations.find((entry) => entry.participantId === item.id);
                  return <div key={item.id}><span>{userById.get(item.userId)?.name}<small>{participantRoleLabels[item.participantRole] || item.participantRole} · 贡献 {item.contributionWeight}%</small></span>{evaluation && <b>{evaluation.totalScore} 分 / {evaluation.pointsAwarded} eP</b>}</div>;
                })}
              </div>
              {selected.settlementMode === 'Mission Linked' && <div className="service-participant-list"><strong>关联任务及权重</strong>{missionLinks.map((link) => <div key={link.id}><span>{missionById.get(link.missionId)?.title || link.missionId}<small>服务影响权重 {link.allocationWeight}%</small></span><b>任务 ePoints 调整</b></div>)}</div>}
            </div>

            <ServiceTimeline
              record={selected}
              feedback={feedback}
              evaluations={evaluations}
              participants={participants}
              busy={busy}
              currentUserId={data.currentUserId}
              canManage={data.canManage}
              onSubmitTransition={async (payload) => {
                const success = await submit(() => transitionServiceRecord(selected.id, payload));
                if (success) {
                  if (payload.status === 'Pending Evaluation') {
                    showToast?.('success', '交付成果已成功提交，等待客户确认/管理员评价 ✓');
                  } else {
                    showToast?.('success', '服务状态更新成功 ✓');
                  }
                }
                return success;
              }}
            />

            <FeedbackPanel
              record={selected}
              feedback={feedback}
              busy={busy}
              canManage={data.canManage}
              onSubmit={async (payload) => {
                const success = await submit(() => addServiceFeedback(selected.id, payload));
                if (success) {
                  showToast?.('success', '客户反馈记录成功，系统已自动核算绩效积分并归档 ✓');
                }
                return success;
              }}
            />
          </div>
        ) : <div className="glass-panel service-empty">选择一条服务记录</div>}
      </section>
    </div>
  );
}

function Summary({ icon: Icon, label, value }) {
  return <div className="glass-panel service-summary"><Icon size={19} /><span><small>{label}</small><strong>{value}</strong></span></div>;
}

function Detail({ label, text }) {
  return <div className="service-detail-block"><strong>{label}</strong><p>{text}</p></div>;
}

function TransitionButton({ status, busy, onClickCompleted, onSubmit }) {
  const handle = () => {
    if (status === 'Pending Evaluation') {
      onClickCompleted();
    } else onSubmit({ status });
  };
  return <button className="cyber-btn" disabled={busy} onClick={handle}>{transitionLabels[status] || statusLabels[status] || status}</button>;
}

function FeedbackPanel({ record, feedback, busy, canManage, onSubmit }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [record?.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    if (await onSubmit(Object.fromEntries(new FormData(formEl)))) {
      formEl.reset();
      setOpen(false);
    }
  };
  return (
    <section className="service-feedback-section">
      <div className="service-section-title">
        <h3><MessageSquareText size={17} /> 客户反馈</h3>
        {canManage && record.status === 'Pending Evaluation' && (
          <button className="cyber-btn" onClick={() => setOpen((value) => !value)}>记录反馈</button>
        )}
      </div>
      {feedback.map((item) => <article key={item.id}><span className={`badge ${item.satisfactionLevel === 'Satisfied' ? 'green' : item.satisfactionLevel === 'Dissatisfied' ? 'red' : 'muted'}`}>{item.satisfactionLevel === 'Satisfied' ? '满意' : item.satisfactionLevel === 'Dissatisfied' ? '不满意' : '一般'}</span><p>{item.content}</p><small>{sourceTypeLabels[item.sourceType] || item.sourceType}{item.evidenceNote ? ` · ${item.evidenceNote}` : ''}</small></article>)}
      {open && <form className="service-inline-form" onSubmit={handleSubmit}>
        <select className="cyber-select" name="satisfactionLevel" defaultValue="" required>
          <option value="" disabled>请选择满意度评价</option>
          <option value="Satisfied">满意</option>
          <option value="Neutral">一般</option>
          <option value="Dissatisfied">不满意</option>
        </select>
        <select className="cyber-select" name="sourceType" defaultValue="" required>
          <option value="" disabled>请选择反馈来源/方式</option>
          <option value="Customer Confirmation">客户确认函</option>
          <option value="Praise">表扬/感谢</option>
          <option value="Complaint">投诉/意见</option>
          <option value="Rework">返工/重处理</option>
          <option value="Phone Follow-up">电话回访</option>
          <option value="WeCom Message">企微沟通记录</option>
        </select>
        <textarea className="cyber-input" name="content" placeholder="客户原始反馈或回访结论" required />
        <input className="cyber-input" name="evidenceNote" placeholder="证据位置或沟通记录说明" />
        <button className="cyber-btn success" disabled={busy}>保存反馈</button>
      </form>}
      {record.status === 'Pending Evaluation' && !feedback.length && <p className="service-muted">服务完成后管理员需在此记录客户反馈，系统将自动进行积分结算和服务归档。</p>}
    </section>
  );
}

function ServiceTimeline({ record, feedback, evaluations, participants, busy, currentUserId, canManage, onSubmitTransition }) {
  const [showResultForm, setShowResultForm] = useState(false);
  const [resultSummary, setResultSummary] = useState('');

  useEffect(() => {
    setShowResultForm(false);
    setResultSummary('');
  }, [record?.id]);

  const formatTime = (timeInput) => {
    if (!timeInput) return null;
    try {
      const d = new Date(timeInput);
      if (isNaN(d.getTime())) return null;
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${month}-${day} ${hours}:${minutes}`;
    } catch {
      return null;
    }
  };

  const statusRanks = {
    New: 1,
    'In Progress': 2,
    Completed: 3,
    'Pending Evaluation': 4,
    Evaluated: 5,
    Reopened: 2,
    Cancelled: 0,
  };

  const currentRank = statusRanks[record.status] || 1;

  const steps = [
    {
      key: 'New',
      title: '1. 登记建立',
      desc: '需求初始化',
      time: formatTime(record.createdAt),
      status: 'done',
    },
    {
      key: 'Accepted',
      title: '2. 响应受理',
      desc: '人员指派与接单',
      time: formatTime(record.startedAt),
      status: record.startedAt || currentRank > 2 ? 'done' : currentRank === 2 ? 'active' : 'pending',
    },
    {
      key: 'Completed',
      title: '3. 服务交付',
      desc: '处理完成及总结',
      time: formatTime(record.completedAt),
      status: record.completedAt || currentRank > 3 ? 'done' : currentRank === 3 ? 'active' : 'pending',
    },
    {
      key: 'Feedback',
      title: '4. 客户反馈',
      desc: '回访及满意度表',
      time: formatTime(record.customerConfirmedAt || feedback[0]?.occurredAt),
      status: record.customerConfirmedAt || feedback.length > 0 || currentRank > 4 ? 'done' : currentRank === 4 ? 'active' : 'pending',
    },
    {
      key: 'Evaluated',
      title: '5. 归档评价',
      desc: '主管评分与结算',
      time: record.status === 'Evaluated' && evaluations[0] ? formatTime(evaluations[0].evaluatedAt || evaluations[0].createdAt) : null,
      status: record.status === 'Evaluated' ? 'done' : 'pending',
    },
  ];

  return (
    <div className="service-timeline-container">
      <div className="service-timeline-header">
        <div className="service-timeline-title">
          <Clock3 size={16} className="glow-text-cyan" />
          <span>全流程服务节点流转时间线</span>
          <span className="badge cyan">当前阶段：{statusLabels[record.status] || record.status}</span>
        </div>
        {!showResultForm && (() => {
          const isParticipant = participants.some((p) => p.userId === currentUserId);
          const canClick = (['New', 'In Progress', 'Reopened'].includes(record.status) && isParticipant) ||
                           (record.status === 'Pending Evaluation' && canManage);
          
          if (canClick && nextActions[record.status]?.length) {
            return (
              <div className="service-timeline-actions">
                {nextActions[record.status].map((status) => (
                  <TransitionButton 
                    key={status} 
                    status={status} 
                    busy={busy} 
                    onClickCompleted={() => setShowResultForm(true)} 
                    onSubmit={onSubmitTransition} 
                  />
                ))}
              </div>
            );
          }
          return null;
        })()}
      </div>

      {showResultForm && (
        <form className="service-result-inline-form" onSubmit={async (e) => {
          e.preventDefault();
          const success = await onSubmitTransition({ status: 'Pending Evaluation', resultSummary });
          if (success) {
            setShowResultForm(false);
            setResultSummary('');
          }
        }}>
          <div className="form-group">
            <strong>服务交付结果总结</strong>
            <span className="form-hint">请用客户可理解的语言，清晰、客观地概括本次服务最终交付的成果、解决的具体问题以及边界说明。</span>
            <textarea 
              className="cyber-input" 
              value={resultSummary} 
              onChange={(e) => setResultSummary(e.target.value)} 
              placeholder="例如：已协助客户恢复数据库连接，并排查了主从同步延迟问题，目前系统各项指标运行正常。"
              required
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="cyber-btn" onClick={() => { setShowResultForm(false); setResultSummary(''); }}>取消</button>
            <button type="submit" className="cyber-btn success" disabled={busy || resultSummary.trim().length < 6}>确认提交成果</button>
          </div>
        </form>
      )}

      <div className="service-timeline-track">
        {steps.map((step, idx) => (
          <div key={step.key} className={`timeline-step ${step.status}`}>
            <div className="step-node-wrapper">
              <div className="step-node">
                {step.status === 'done' ? <Check size={12} /> : <span>{idx + 1}</span>}
              </div>
              {idx < steps.length - 1 && <div className={`step-line ${step.status === 'done' ? 'active' : ''}`} />}
            </div>
            <div className="step-info">
              <strong className="step-title">{step.title}</strong>
              <small className="step-desc">{step.desc}</small>
              <div className="step-time-badge">
                {step.status === 'done' && step.time ? (
                  <span className="time-done">{step.time}</span>
                ) : step.status === 'active' ? (
                  <span className="time-active">进行中...</span>
                ) : (
                  <span className="time-pending">待处理</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
