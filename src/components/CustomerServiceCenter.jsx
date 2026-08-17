import React, { useEffect, useMemo, useState } from 'react';
import { Award, BriefcaseBusiness, Check, CheckCircle2, Clock3, Headphones, MessageSquareText, Plus, ShieldCheck, UserRoundCheck, UsersRound } from 'lucide-react';
import {
  addServiceFeedback,
  createExternalCustomer,
  createServiceRecord,
  evaluateServiceParticipant,
  getServiceCenter,
  transitionServiceRecord,
} from '../data/mockData';

const statusLabels = {
  New: '待受理', Accepted: '已受理', 'In Progress': '服务中', 'Waiting Customer': '等待客户',
  Completed: '已完成', 'Pending Evaluation': '待评价', Evaluated: '已评价', Reopened: '返工中', Escalated: '已升级', Cancelled: '已取消',
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
  New: ['Accepted'], Accepted: ['In Progress'], 'In Progress': ['Waiting Customer', 'Completed', 'Escalated'],
  'Waiting Customer': ['In Progress', 'Completed'], Completed: ['Pending Evaluation', 'Reopened'],
  'Pending Evaluation': ['Reopened'], Reopened: ['In Progress', 'Escalated'], Escalated: ['In Progress', 'Completed'],
};

const defaultScores = {
  outcomeScore: 85, professionalismScore: 85,
};

export default function CustomerServiceCenter() {
  const [data, setData] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedMissions, setSelectedMissions] = useState([]);

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
    const form = new FormData(event.currentTarget);
    if (await submit(() => createExternalCustomer(Object.fromEntries(form)))) {
      event.currentTarget.reset();
      setShowCustomerForm(false);
    }
  };

  const handleCreateRecord = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
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
      event.currentTarget.reset();
      setSelectedUsers([]);
      setSelectedMissions([]);
      setShowRecordForm(false);
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
          <select className="cyber-select" name="settlementMode" defaultValue="Standalone"><option value="Standalone">独立服务：影响个人 ePoints</option><option value="Mission Linked">关联任务：影响任务 ePoints</option></select>
          <input className="cyber-input" name="basePoints" type="number" min="0" max="1000" defaultValue="100" required />
          <input className="cyber-input" name="promisedAt" type="datetime-local" />
          <textarea className="cyber-input wide" name="description" placeholder="客户需求" rows={3} required />
          <textarea className="cyber-input wide" name="promisedResult" placeholder="对客户承诺的结果和边界" rows={3} required />
          <div className="service-user-picker wide">
            {data.users.filter((item) => item.enabled && item.availability !== 'Leave').map((user) => (
              <label key={user.id} className={selectedUsers.includes(user.id) ? 'selected' : ''}>
                <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => setSelectedUsers((items) => items.includes(user.id) ? items.filter((id) => id !== user.id) : [...items, user.id])} />
                <span>{user.name}<small>{user.role} · {user.availability}{user.id === data.activeDutyUserId ? ' · 当前值班' : ''}</small></span>
              </label>
            ))}
          </div>
          <div className="service-mission-picker wide">
            <strong>关联内部任务（仅任务关联模式使用）</strong>
            {(data.missions || []).filter((item) => !['Completed', 'Cancelled'].includes(item.status)).map((mission) => (
              <label key={mission.id} className={selectedMissions.includes(mission.id) ? 'selected' : ''}>
                <input type="checkbox" checked={selectedMissions.includes(mission.id)} onChange={() => setSelectedMissions((items) => items.includes(mission.id) ? items.filter((id) => id !== mission.id) : [...items, mission.id])} />
                <span>{mission.title}<small>{mission.base_points} eP · {mission.assigned_to ? (data.users.find((user) => user.id === mission.assigned_to)?.name || '已分派') : '未分派'}</small></span>
              </label>
            ))}
          </div>
          <button className="cyber-btn success wide" disabled={busy}>创建服务记录</button>
        </form>
      )}

      <section className="service-workspace">
        <div className="service-list">
          {data.records.length === 0 && <div className="service-empty">暂无服务记录</div>}
          {data.records.map((record) => (
            <button key={record.id} className={record.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(record.id)}>
              <span className={`service-priority ${record.priority.toLowerCase()}`}>{record.priority}</span>
              <span><strong>{record.title}</strong><small>{customerById.get(record.customerId)?.name} · {statusLabels[record.status] || record.status}</small></span>
            </button>
          ))}
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
              onSubmitTransition={(payload) => submit(() => transitionServiceRecord(selected.id, payload))}
            />

            <FeedbackPanel record={selected} feedback={feedback} busy={busy} onSubmit={(payload) => submit(() => addServiceFeedback(selected.id, payload))} />

            {data.canManage && ['Completed', 'Pending Evaluation'].includes(selected.status) && feedback.length > 0 && (
              <section className="service-evaluation-section">
                <h3><Award size={17} /> 管理员服务评价</h3>
                {participants.filter((item) => !evaluations.some((entry) => entry.participantId === item.id)).map((participant) => (
                  <EvaluationForm key={participant.id} participant={participant} user={userById.get(participant.userId)} busy={busy} onSubmit={(payload) => submit(() => evaluateServiceParticipant(selected.id, participant.id, payload))} />
                ))}
              </section>
            )}
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

function TransitionButton({ status, busy, onSubmit }) {
  const handle = () => {
    if (status === 'Completed') {
      const resultSummary = window.prompt('填写对客户可理解的服务结果摘要');
      if (!resultSummary) return;
      onSubmit({ status, resultSummary });
    } else onSubmit({ status });
  };
  return <button className="cyber-btn" disabled={busy} onClick={handle}>{statusLabels[status] || status}</button>;
}

function FeedbackPanel({ record, feedback, busy, onSubmit }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [record?.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (await onSubmit(Object.fromEntries(new FormData(event.currentTarget)))) {
      event.currentTarget.reset();
      setOpen(false);
    }
  };
  return (
    <section className="service-feedback-section">
      <div className="service-section-title"><h3><MessageSquareText size={17} /> 客户反馈</h3><button className="cyber-btn" onClick={() => setOpen((value) => !value)}>记录反馈</button></div>
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
      {record.status === 'Completed' && !feedback.length && <p className="service-muted">服务完成后需记录客户反馈，方可进入管理员评价。</p>}
    </section>
  );
}

function EvaluationForm({ participant, user, busy, onSubmit }) {
  const [scores, setScores] = useState(defaultScores);
  const total = Math.round(scores.outcomeScore * 0.6 + scores.professionalismScore * 0.4);
  const labels = { outcomeScore: '服务结果与解决质量 (60%)', professionalismScore: '服务态度与专业沟通 (40%)' };
  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onSubmit({ ...scores, evaluationComment: form.get('evaluationComment'), improvementRequired: form.get('improvementRequired') });
  };
  return <form className="service-evaluation-form" onSubmit={handleSubmit}>
    <header><span><strong>{user?.name}</strong><small>{participant.participantRole} · 贡献 {participant.contributionWeight}%</small></span><b>{total} 分</b></header>
    <div className="service-score-grid">{Object.entries(labels).map(([key, label]) => <label key={key}><span>{label}<b>{scores[key]}</b></span><input type="range" min="0" max="100" step="1" value={scores[key]} onChange={(event) => setScores((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}</div>
    <textarea className="cyber-input" name="evaluationComment" placeholder="评分依据（必填）" required />
    <textarea className="cyber-input" name="improvementRequired" placeholder="改进要求（可选）" />
    <button className="cyber-btn success" disabled={busy}>发布评价并结算积分</button>
  </form>;
}

function ServiceTimeline({ record, feedback, evaluations, participants, busy, onSubmitTransition }) {
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
    Accepted: 2,
    'In Progress': 2,
    'Waiting Customer': 2,
    Completed: 3,
    'Pending Evaluation': 4,
    Evaluated: 5,
    Reopened: 2,
    Escalated: 2,
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
      time: formatTime(evaluations[0]?.evaluatedAt || evaluations[0]?.createdAt),
      status: record.status === 'Evaluated' || (evaluations.length > 0 && evaluations.length >= (participants?.length || 1)) ? 'done' : currentRank === 5 ? 'active' : 'pending',
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
        {!!nextActions[record.status]?.length && (
          <div className="service-timeline-actions">
            {nextActions[record.status].map((status) => (
              <TransitionButton key={status} status={status} busy={busy} onSubmit={onSubmitTransition} />
            ))}
          </div>
        )}
      </div>

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
