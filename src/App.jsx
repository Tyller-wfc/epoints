import React, { useState, useEffect } from 'react';
import { 
  getAppState, 
  resetAppState, 
  login,
  logout,
  restoreSession,
  claimMission, 
  submitProof, 
  verifyMission, 
  updateMultiplier, 
  createMission, 
  purchaseReward, 
  createReward,
  updateReward,
  deleteReward,
  deliverReward, 
  raiseAlert, 
  resolveTicket, 
  setActiveDuty,
  createDuty,
  deleteDuty,
  penalizeNegligence,
  flagSecondaryIncident,
  acknowledgeTicket,
  updateWecomConfig,
  testWecomWebhook,
  getPersonnel,
  updatePersonnel,
  createPersonnel,
  deletePersonnel,
  updatePersonnelAvatar,
  resetPersonnelAvatar,
  previewMissionRecipients,
  changePassword
} from './data/mockData';

import Dashboard from './components/Dashboard';
import MissionBoard from './components/MissionBoard';
import RewardMarket from './components/RewardMarket';
import SupportCenter from './components/SupportCenter';
import AdminConsole from './components/AdminConsole';
import Login from './components/Login';
import HeaderAvatarMenu from './components/HeaderAvatarMenu';
import QuickClaimMission from './components/QuickClaimMission';
import CustomerServiceCenter from './components/CustomerServiceCenter';

import { Shield, LayoutDashboard, Target, ShoppingBag, ShieldAlert, Settings, AlertOctagon, LogOut, HeartHandshake, CheckCircle2, XCircle } from 'lucide-react';

function App() {
  const [state, setState] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('loading');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [quickClaimMissionId] = useState(() => new URLSearchParams(window.location.search).get('claimMission'));
  const [toast, setToast] = useState(null); // { type, text, leaving }
  const toastTimer = React.useRef(null);
  const [quickClaimStatus, setQuickClaimStatus] = useState(null);

  useEffect(() => {
    restoreSession()
      .then((user) => user ? getAppState() : null)
      .then((data) => {
        if (data) setState(data);
        setSessionStatus(data ? 'authenticated' : 'anonymous');
      })
      .catch(() => setSessionStatus('anonymous'));
  }, []);

  const handleLogin = async (username, password) => {
    await login(username, password);
    setState(await getAppState());
    setSessionStatus('authenticated');
  };

  const handleLogout = () => {
    logout();
    setState(null);
    setActiveTab('dashboard');
    setSessionStatus('anonymous');
  };

  if (sessionStatus === 'loading') return <div className="app-loading">正在验证登录状态...</div>;
  if (sessionStatus === 'anonymous') return <Login onLogin={handleLogin} />;
  if (!state) return <div className="app-loading">正在载入 ePoints 效能协同系统...</div>;

  const { users, currentUserId, tickets } = state;
  const currentUser = users.find(u => u.id === currentUserId) || users[0];
  const isAdmin = currentUser.roleType === 'Admin';

  const handleQuickClaimMission = async () => {
    const mission = state.missions.find((item) => item.id === quickClaimMissionId);
    if (!mission || mission.status !== 'Available') return;

    setQuickClaimStatus({ type: 'loading', message: '正在提交认领...' });
    try {
      const nextState = await claimMission(mission.id, currentUser.id);
      setState(nextState);
      setQuickClaimStatus({ type: 'success', message: '认领成功，任务已进入进行中。' });
    } catch (error) {
      setQuickClaimStatus({ type: 'error', message: error.message || '认领失败，请稍后重试。' });
    }
  };

  if (quickClaimMissionId) {
    return (
      <QuickClaimMission
        mission={state.missions.find((item) => item.id === quickClaimMissionId)}
        users={users}
        currentUser={currentUser}
        claimStatus={quickClaimStatus}
        onClaim={handleQuickClaimMission}
        onLogout={handleLogout}
      />
    );
  }

  // 检查是否有未解决的紧急故障 (Critical / 红色警报)
  const hasCriticalAlert = tickets.some(t => t.severity === 'Critical' && t.status !== 'Resolved');

  // 对接数据更新逻辑并同步刷新组件状态
  const handleResetData = async () => {
    if (window.confirm("确定要重置所有模拟数据吗？这会清除本地存储的所有修改记录。")) {
      setState(await resetAppState());
    }
  };

  const handleClaimMission = async (missionId, userId) => {
    setState(await claimMission(missionId, userId));
  };

  const handleSubmitProof = async (missionId, proofText) => {
    setState(await submitProof(missionId, proofText));
  };

  const handleVerifyMission = async (missionId, isApproved, penalize = false) => {
    setState(await verifyMission(missionId, isApproved, penalize));
  };

  const handleUpdateMultiplier = async (missionId, newMultiplier) => {
    setState(await updateMultiplier(missionId, newMultiplier));
  };

  const handleCreateMission = async (missionData, files) => {
    setState(await createMission(missionData, files));
  };

  const handleUpdatePersonnel = async (userId, data) => {
    const personnel = await updatePersonnel(userId, data);
    setState(await getAppState());
    return personnel;
  };

  const handleCreatePersonnel = async (data) => {
    const personnel = await createPersonnel(data);
    setState(await getAppState());
    return personnel;
  };

  const handleDeletePersonnel = async (userId) => {
    const personnel = await deletePersonnel(userId);
    setState(await getAppState());
    return personnel;
  };

  const handleUpdatePersonnelAvatar = async (userId, file) => {
    await updatePersonnelAvatar(userId, file);
    const nextState = await getAppState();
    setState(nextState);
    const requester = nextState.users.find((user) => user.id === nextState.currentUserId);
    return requester?.roleType === 'Admin' ? getPersonnel() : nextState.users;
  };

  const handleResetPersonnelAvatar = async (userId) => {
    await resetPersonnelAvatar(userId);
    const nextState = await getAppState();
    setState(nextState);
    const requester = nextState.users.find((user) => user.id === nextState.currentUserId);
    return requester?.roleType === 'Admin' ? getPersonnel() : nextState.users;
  };

  const handlePurchaseReward = async (rewardId, userId) => {
    const res = await purchaseReward(rewardId, userId);
    if (res && res.error) {
      return res;
    }
    setState(res);
  };

  const handleCreateReward = async (data, imageFile) => {
    setState(await createReward(data, imageFile));
  };

  const handleUpdateReward = async (rewardId, data, imageFile) => {
    setState(await updateReward(rewardId, data, imageFile));
  };

  const handleDeleteReward = async (rewardId) => {
    setState(await deleteReward(rewardId));
  };

  const handleDeliverReward = async (txId) => {
    setState(await deliverReward(txId));
  };

  const handleRaiseAlert = async (ticketData, files) => {
    const res = await raiseAlert(ticketData, files);
    setState(res);
  };

  const handleResolveTicket = async (ticketId, resolutionNote) => {
    setState(await resolveTicket(ticketId, resolutionNote));
  };

  const handleSetActiveDuty = async (dutyId) => {
    setState(await setActiveDuty(dutyId));
  };

  const handleCreateDuty = async (data) => {
    setState(await createDuty(data));
  };

  const handleDeleteDuty = async (dutyId) => {
    setState(await deleteDuty(dutyId));
  };

  const handlePenalizeNegligence = async (ticketId) => {
    setState(await penalizeNegligence(ticketId));
  };

  const handleFlagSecondaryIncident = async (ticketId) => {
    setState(await flagSecondaryIncident(ticketId));
  };

  const handleAcknowledgeTicket = async (ticketId, userId) => {
    setState(await acknowledgeTicket(ticketId, userId));
  };

  const handleUpdateWecomConfig = async (url, mentionMobiles) => {
    const nextState = await updateWecomConfig(url, mentionMobiles);
    setState(nextState);
    return nextState;
  };

  const TOAST_DURATION = 3200; // ms 显示时长
  const TOAST_LEAVE = 300;    // ms 离场动画时长

  const showToast = (type, text) => {
    clearTimeout(toastTimer.current);
    setToast({ type, text, leaving: false });
    toastTimer.current = setTimeout(() => {
      setToast((prev) => prev ? { ...prev, leaving: true } : null);
      setTimeout(() => setToast(null), TOAST_LEAVE);
    }, TOAST_DURATION);
  };

  const handleChangePassword = async (oldPassword, newPassword) => {
    await changePassword(oldPassword, newPassword);
    showToast('success', '密码修改成功，下次登录请使用新密码 ✓');
  };

  return (
    <div className={`app-container ${hasCriticalAlert ? 'sos-active' : ''}`} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', transition: 'all 0.5s ease' }}>
      
      {/* 顶部固定区域包装器 */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
        {/* 红色警报闪烁横幅 */}
        {hasCriticalAlert && (
          <div 
            style={{ 
              background: 'var(--accent-red)', 
              color: 'white', 
              padding: '10px 20px', 
              textAlign: 'center', 
              fontSize: '0.9rem', 
              fontWeight: 'bold',
              letterSpacing: '1px',
              boxShadow: '0 4px 20px rgba(255, 75, 75, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              animation: 'redAlertPulse 1s infinite alternate ease-in-out',
              zIndex: 1000,
              pointerEvents: 'auto'
            }}
          >
            <AlertOctagon size={18} />
            <span>警告：系统遭遇紧急故障，红色警报已触发！请值班保障人员立即前往“技术保障中心”进行排障！</span>
          </div>
        )}

        {/* 顶部控制舱 Header */}
        <header className="glass-panel" style={{ margin: '16px 16px 0 16px', padding: '16px 24px', borderRadius: 'var(--radius-md)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', zIndex: 10, pointerEvents: 'auto' }}>
        
        {/* 系统标志 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '38px', 
            height: '38px', 
            borderRadius: '8px', 
            background: 'linear-gradient(135deg, var(--accent-cyan) 0%, #1e40af 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px var(--accent-cyan-glow)'
          }}>
            <Shield size={20} color="black" />
          </div>
          <div>
            <h1 className="military-font glow-text-cyan" style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '2px' }}>
              ePoints 效能协同系统
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              CORP-AGILE PERFORMANCE & EFFICIENCY SYSTEM v2.6.4
            </span>
          </div>
        </div>

        {/* 顶部主导航 */}
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          <button 
            className={`cyber-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            style={{
              background: activeTab === 'dashboard' ? 'var(--accent-cyan)' : 'transparent',
              borderColor: activeTab === 'dashboard' ? 'var(--accent-cyan)' : 'transparent',
              color: activeTab === 'dashboard' ? 'black' : 'var(--text-primary)',
              padding: '8px 16px',
              fontSize: '0.8rem'
            }}
          >
            <LayoutDashboard size={14} /> 指挥中心
          </button>
          
          <button 
            className={`cyber-btn ${activeTab === 'missions' ? 'active' : ''}`}
            onClick={() => setActiveTab('missions')}
            style={{
              background: activeTab === 'missions' ? 'var(--accent-cyan)' : 'transparent',
              borderColor: activeTab === 'missions' ? 'var(--accent-cyan)' : 'transparent',
              color: activeTab === 'missions' ? 'black' : 'var(--text-primary)',
              padding: '8px 16px',
              fontSize: '0.8rem'
            }}
          >
            <Target size={14} /> 项目任务板
          </button>

          <button 
            className={`cyber-btn ${activeTab === 'market' ? 'active' : ''}`}
            onClick={() => setActiveTab('market')}
            style={{
              background: activeTab === 'market' ? 'var(--accent-cyan)' : 'transparent',
              borderColor: activeTab === 'market' ? 'var(--accent-cyan)' : 'transparent',
              color: activeTab === 'market' ? 'black' : 'var(--text-primary)',
              padding: '8px 16px',
              fontSize: '0.8rem'
            }}
          >
            <ShoppingBag size={14} /> 福利商城
          </button>

          <button 
            className={`cyber-btn ${activeTab === 'support' ? 'active' : ''}`}
            onClick={() => setActiveTab('support')}
            style={{
              background: activeTab === 'support' ? 'var(--accent-cyan)' : 'transparent',
              borderColor: activeTab === 'support' ? 'var(--accent-cyan)' : 'transparent',
              color: activeTab === 'support' ? 'black' : 'var(--text-primary)',
              padding: '8px 16px',
              fontSize: '0.8rem'
            }}
          >
            <ShieldAlert size={14} /> 技术保障中心
          </button>

          <button
            className={`cyber-btn ${activeTab === 'service' ? 'active' : ''}`}
            onClick={() => setActiveTab('service')}
            style={{
              background: activeTab === 'service' ? 'var(--accent-cyan)' : 'transparent',
              borderColor: activeTab === 'service' ? 'var(--accent-cyan)' : 'transparent',
              color: activeTab === 'service' ? 'black' : 'var(--text-primary)',
              padding: '8px 16px',
              fontSize: '0.8rem'
            }}
          >
            <HeartHandshake size={14} /> 客户服务
          </button>

          {isAdmin && (
            <button
              className={`cyber-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
              style={{
                background: activeTab === 'admin' ? 'var(--accent-cyan)' : 'transparent',
                borderColor: activeTab === 'admin' ? 'var(--accent-cyan)' : 'transparent',
                color: activeTab === 'admin' ? 'black' : 'var(--text-primary)',
                padding: '8px 16px',
                fontSize: '0.8rem'
              }}
            >
              <Settings size={14} /> 控制台
            </button>
          )}
        </nav>

        {/* 顶部状态角 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>当前登录</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-bright)' }}>{currentUser.name}</div>
          </div>
          <HeaderAvatarMenu user={currentUser} onUpload={handleUpdatePersonnelAvatar} onReset={handleResetPersonnelAvatar} onChangePassword={handleChangePassword} />
          <button className="header-icon-btn" onClick={handleLogout} title="退出登录"><LogOut size={17} /></button>
        </div>

      </header>
      </div>

      {/* 主面板内容 */}
      <main style={{ flex: 1, padding: '24px 16px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        {activeTab === 'dashboard' && (
          <Dashboard 
            state={state} 
            onResetData={isAdmin ? handleResetData : undefined}
          />
        )}
        {activeTab === 'missions' && (
          <MissionBoard 
            state={state} 
            onClaimMission={handleClaimMission} 
            onSubmitProof={handleSubmitProof}
          />
        )}
        {activeTab === 'market' && (
          <RewardMarket 
            state={state} 
            onPurchaseReward={handlePurchaseReward}
            onCreateReward={handleCreateReward}
            onUpdateReward={handleUpdateReward}
            onDeleteReward={handleDeleteReward}
          />
        )}
        {activeTab === 'support' && (
          <SupportCenter 
            state={state} 
            onRaiseAlert={handleRaiseAlert} 
            onResolveTicket={handleResolveTicket}
            onPenalizeNegligence={handlePenalizeNegligence}
            onFlagSecondaryIncident={handleFlagSecondaryIncident}
            onAcknowledgeTicket={handleAcknowledgeTicket}
          />
        )}
        {activeTab === 'service' && (
          <CustomerServiceCenter showToast={showToast} />
        )}
        {activeTab === 'admin' && isAdmin && (
          <AdminConsole 
            state={state} 
            onVerifyMission={handleVerifyMission} 
            onUpdateMultiplier={handleUpdateMultiplier}
            onCreateMission={handleCreateMission}
            onDeliverReward={handleDeliverReward}
            onSetActiveDuty={handleSetActiveDuty}
            onCreateDuty={handleCreateDuty}
            onDeleteDuty={handleDeleteDuty}
            onUpdateWecomConfig={handleUpdateWecomConfig}
            onTestWecomWebhook={testWecomWebhook}
            onLoadPersonnel={getPersonnel}
            onUpdatePersonnel={handleUpdatePersonnel}
            onCreatePersonnel={handleCreatePersonnel}
            onDeletePersonnel={handleDeletePersonnel}
            onUpdatePersonnelAvatar={handleUpdatePersonnelAvatar}
            onResetPersonnelAvatar={handleResetPersonnelAvatar}
            onPreviewMissionRecipients={previewMissionRecipients}
          />
        )}
      </main>

      {/* 页脚 */}
      <footer style={{ padding: '20px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-muted)', background: 'rgba(0,0,0,0.1)' }}>
        <div>ePoints 敏捷效能协同系统 - 数字化团队与任务智能化激励平台</div>
        <div style={{ marginTop: '4px', fontFamily: 'monospace' }}>ALL SYSTEMS OPERATIONAL // INTEGRITY GREEN // PLATFORM SYNC ACTIVE</div>
      </footer>

      {/* 全局 Toast 通知 */}
      {toast && (
        <div className={`global-toast ${toast.type} ${toast.leaving ? 'leaving' : ''}`}>
          <span className="global-toast-icon">
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          </span>
          <span>{toast.text}</span>
          <span
            className="global-toast-bar"
            style={{ animationDuration: `${TOAST_DURATION}ms` }}
          />
        </div>
      )}

    </div>
  );
}

export default App;
