import React, { useState, useEffect } from 'react';
import { 
  getAppState, 
  resetAppState, 
  setCurrentUser, 
  claimMission, 
  submitProof, 
  verifyMission, 
  updateMultiplier, 
  createMission, 
  purchaseReward, 
  deliverReward, 
  raiseAlert, 
  resolveTicket, 
  setActiveDuty,
  penalizeNegligence,
  flagSecondaryIncident
} from './data/mockData';

import Dashboard from './components/Dashboard';
import MissionBoard from './components/MissionBoard';
import RewardMarket from './components/RewardMarket';
import SupportCenter from './components/SupportCenter';
import AdminConsole from './components/AdminConsole';

import { Shield, LayoutDashboard, Target, ShoppingBag, ShieldAlert, Settings, AlertOctagon } from 'lucide-react';

function App() {
  const [state, setState] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // 初始化加载数据
  useEffect(() => {
    setState(getAppState());
  }, []);

  if (!state) return <div style={{ color: 'white', padding: '20px', fontFamily: 'monospace' }}>正在载入 ePoints 效能协同系统...</div>;

  const { users, currentUserId, tickets } = state;
  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  // 检查是否有未解决的紧急故障 (Critical / 红色警报)
  const hasCriticalAlert = tickets.some(t => t.severity === 'Critical' && t.status !== 'Resolved');

  // 对接数据更新逻辑并同步刷新组件状态
  const handleSetCurrentUser = (userId) => {
    setState(setCurrentUser(userId));
  };

  const handleResetData = () => {
    if (window.confirm("确定要重置所有模拟数据吗？这会清除本地存储的所有修改记录。")) {
      setState(resetAppState());
    }
  };

  const handleClaimMission = (missionId, userId) => {
    setState(claimMission(missionId, userId));
  };

  const handleSubmitProof = (missionId, proofText) => {
    setState(submitProof(missionId, proofText));
  };

  const handleVerifyMission = (missionId, isApproved, penalize = false) => {
    setState(verifyMission(missionId, isApproved, penalize));
  };

  const handleUpdateMultiplier = (missionId, newMultiplier) => {
    setState(updateMultiplier(missionId, newMultiplier));
  };

  const handleCreateMission = (missionData) => {
    setState(createMission(missionData));
  };

  const handlePurchaseReward = (rewardId, userId) => {
    const res = purchaseReward(rewardId, userId);
    if (res && res.error) {
      return res;
    }
    setState(res);
  };

  const handleDeliverReward = (txId) => {
    setState(deliverReward(txId));
  };

  const handleRaiseAlert = (ticketData) => {
    const res = raiseAlert(ticketData);
    setState(res.state);
  };

  const handleResolveTicket = (ticketId, resolutionNote) => {
    setState(resolveTicket(ticketId, resolutionNote));
  };

  const handleSetActiveDuty = (dutyId) => {
    setState(setActiveDuty(dutyId));
  };

  const handlePenalizeNegligence = (ticketId) => {
    setState(penalizeNegligence(ticketId));
  };

  const handleFlagSecondaryIncident = (ticketId) => {
    setState(flagSecondaryIncident(ticketId));
  };

  return (
    <div className={`app-container ${hasCriticalAlert ? 'sos-active' : ''}`} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', transition: 'all 0.5s ease' }}>
      
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
            zIndex: 1000
          }}
        >
          <AlertOctagon size={18} />
          <span>警告：系统遭遇紧急故障，红色警报已触发！请值班保障人员立即前往“技术保障中心”进行排障！</span>
        </div>
      )}

      {/* 顶部控制舱 Header */}
      <header className="glass-panel" style={{ margin: '16px 16px 0 16px', padding: '16px 24px', borderRadius: 'var(--radius-md)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', zIndex: 10 }}>
        
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
        </nav>

        {/* 顶部状态角 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>当前登录</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-bright)' }}>{currentUser.name}</div>
          </div>
          <img src={currentUser.avatar} alt={currentUser.name} style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid var(--border-cyan)' }} />
        </div>

      </header>

      {/* 主面板内容 */}
      <main style={{ flex: 1, padding: '24px 16px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        {activeTab === 'dashboard' && (
          <Dashboard 
            state={state} 
            onSetCurrentUser={handleSetCurrentUser} 
            onResetData={handleResetData}
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
          />
        )}
        {activeTab === 'support' && (
          <SupportCenter 
            state={state} 
            onRaiseAlert={handleRaiseAlert} 
            onResolveTicket={handleResolveTicket}
            onPenalizeNegligence={handlePenalizeNegligence}
            onFlagSecondaryIncident={handleFlagSecondaryIncident}
          />
        )}
        {activeTab === 'admin' && (
          <AdminConsole 
            state={state} 
            onVerifyMission={handleVerifyMission} 
            onUpdateMultiplier={handleUpdateMultiplier}
            onCreateMission={handleCreateMission}
            onDeliverReward={handleDeliverReward}
            onSetActiveDuty={handleSetActiveDuty}
          />
        )}
      </main>

      {/* 页脚 */}
      <footer style={{ padding: '20px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-muted)', background: 'rgba(0,0,0,0.1)' }}>
        <div>ePoints 敏捷效能协同系统 - 数字化团队与任务智能化激励平台</div>
        <div style={{ marginTop: '4px', fontFamily: 'monospace' }}>ALL SYSTEMS OPERATIONAL // INTEGRITY GREEN // PLATFORM SYNC ACTIVE</div>
      </footer>

    </div>
  );
}

export default App;
