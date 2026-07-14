import React from 'react';
import { CheckCircle2, Clock3, Flame, LogOut, PlayCircle, Target, UserRound, XCircle } from 'lucide-react';
import AttachmentList from './AttachmentList';

export default function QuickClaimMission({ mission, users, currentUser, claimStatus, onClaim, onLogout }) {
  if (!mission) {
    return (
      <main className="quick-claim-page">
        <section className="quick-claim-shell">
          <div className="quick-claim-empty glass-panel">
            <XCircle size={34} />
            <h1>任务不存在</h1>
            <p>该任务可能已被删除，请联系任务发布人确认。</p>
          </div>
        </section>
      </main>
    );
  }

  const assignee = users.find((user) => user.id === mission.assigned_to);
  const isMine = mission.assigned_to === currentUser.id;
  const isAvailable = mission.status === 'Available';
  const totalPoints = Math.round(mission.base_points * mission.multiplier);
  const isHighMultiplier = mission.multiplier > 1;
  const isSubmitting = claimStatus?.type === 'loading';

  let actionLabel = '立即认领任务';
  let actionIcon = <PlayCircle size={19} />;
  let actionDisabled = false;

  if (currentUser.roleType === 'Admin' && isAvailable) {
    actionLabel = '主管不可直接认领';
    actionDisabled = true;
  } else if (isMine) {
    actionLabel = '任务已由你认领';
    actionIcon = <CheckCircle2 size={19} />;
    actionDisabled = true;
  } else if (!isAvailable) {
    actionLabel = assignee ? `已由${assignee.name}认领` : '任务当前不可认领';
    actionIcon = <Clock3 size={19} />;
    actionDisabled = true;
  } else if (isSubmitting) {
    actionLabel = '正在认领...';
    actionIcon = <Clock3 size={19} />;
    actionDisabled = true;
  }

  return (
    <main className="quick-claim-page">
      <section className="quick-claim-shell">
        <header className="quick-claim-header">
          <div className="quick-claim-brand"><Target size={20} /><strong>ePoints 任务认领</strong></div>
          <div className="quick-claim-user">
            <span><small>当前用户</small><strong>{currentUser.name}</strong></span>
            <button type="button" onClick={onLogout} title="退出登录"><LogOut size={18} /></button>
          </div>
        </header>

        <article className="quick-claim-detail glass-panel">
          <div className="quick-claim-meta">
            <div className="quick-claim-domains">
              {(mission.domains || []).map((item) => (
                <span className={`badge ${item.isPrimary ? 'cyan' : 'muted'}`} key={item.domainId}>
                  {item.domain?.name}{item.isPrimary ? ' · 主' : ''}
                </span>
              ))}
              <span className={`badge ${mission.priority === 'Critical' ? 'red' : mission.priority === 'High' ? 'orange' : 'muted'}`}>
                {mission.priority}
              </span>
            </div>
            <div className={isHighMultiplier ? 'quick-claim-points hot' : 'quick-claim-points'}>
              <strong>{isHighMultiplier && <Flame size={18} />}{totalPoints} eP</strong>
              <small>基础 {mission.base_points} × {mission.multiplier}x</small>
            </div>
          </div>

          <h1>{mission.title}</h1>
          <p className="quick-claim-description">{mission.description}</p>
          <AttachmentList attachments={mission.attachments} />

          {assignee && (
            <div className="quick-claim-assignee">
              <UserRound size={17} />
              <span>承接人：<strong>{assignee.name}</strong>{isMine ? '（我）' : ''}</span>
            </div>
          )}

          {claimStatus?.message && (
            <div className={`quick-claim-message ${claimStatus.type}`} role="status">
              {claimStatus.message}
            </div>
          )}
        </article>

        <div className="quick-claim-action">
          <button type="button" className={`cyber-btn ${isMine ? 'success' : ''}`} disabled={actionDisabled} onClick={onClaim}>
            {actionIcon}{actionLabel}
          </button>
        </div>
      </section>
    </main>
  );
}
