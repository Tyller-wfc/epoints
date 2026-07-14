import React, { useState } from 'react';
import { Award, Coins, TrendingUp, ShieldAlert, UserCheck, BookOpen, Briefcase, Code, PenTool, CheckSquare, Server, HeartHandshake, GraduationCap, Flame, Target, AlertOctagon } from 'lucide-react';

export default function Dashboard({ state, onResetData }) {
  const { users, feed, currentUserId } = state;
  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  const [activeHandbookTab, setActiveHandbookTab] = useState('points');

  // 计算排行 (按 lifetime 积分降序排列)
  const leaderboard = [...users].sort((a, b) => b.points_earned_lifetime - a.points_earned_lifetime);

  // 获取积分最高的员工
  const mvp = leaderboard[0];

  // 格式化时间
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "未知";
    }
  };

  // 根据累计积分判断荣誉段位等级 (L1 - L5 体系)
  const getRankName = (lifetimePoints) => {
    if (lifetimePoints >= 20000) return "L5 终身荣誉殿堂 (Honorary)";
    if (lifetimePoints >= 10000) return "L4 效能大师 / 战略指挥官 (Master)";
    if (lifetimePoints >= 5000) return "L3 核心专家 / 业务操盘手 (Expert)";
    if (lifetimePoints >= 2000) return "L2 开发骨干 / 交付先锋 (Pro)";
    return "L1 研发新星 / 业务助理 (Rookie)";
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      
      {/* 顶部个人状态和切换面板 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* 个人身份舱 */}
        <div className="glass-panel scanner-overlay" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="badge cyan">个人效能面板</span>
              <span className="military-font" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {currentUser.id}</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--accent-cyan)', boxShadow: '0 0 10px var(--accent-cyan-glow)' }}
              />
              <div>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--text-bright)', marginBottom: '4px' }}>{currentUser.name}</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className="badge muted">{currentUser.role}</span>
                  <span className="badge orange" style={{ fontSize: '0.7rem' }}>
                    {getRankName(currentUser.points_earned_lifetime)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border-muted)', paddingTop: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>
                <Coins size={14} className="glow-text-cyan" />
                <span>可用效能积分</span>
              </div>
              <div className="military-font glow-text-cyan" style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                {currentUser.points_balance} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>eP</span>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px' }}>
                <Award size={14} className="glow-text-green" />
                <span>累计获得总积分</span>
              </div>
              <div className="military-font glow-text-green" style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                {currentUser.points_earned_lifetime} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>eP</span>
              </div>
            </div>
          </div>
          {((currentUser.penalties_count || 0) > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '4px', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-red)', fontSize: '0.8rem', fontWeight: 'bold' }}>
                <AlertOctagon size={14} className="glow-text-red" />
                <span>累计处罚: {currentUser.penalties_count} 次</span>
              </div>
              <span className="military-font glow-text-red" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                - {currentUser.points_deducted_total} eP
              </span>
            </div>
          )}
        </div>

        {/* 角色速切面板 */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span className="badge orange">团队成员</span>
            {onResetData && (
              <button
                onClick={onResetData}
                style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}
              >
                [ 重置模拟数据库 ]
              </button>
            )}
          </div>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px', lineHeight: '1.4' }}>
            当前账号已通过身份认证。下方展示组织成员及其岗位信息，账号切换请先退出当前登录。
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
            {users.map(u => (
              <button
                key={u.id}
                className={`glass-panel`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderLeft: u.id === currentUserId ? '3px solid var(--accent-cyan)' : '1px solid var(--border-muted)',
                  background: u.id === currentUserId ? 'rgba(0, 242, 254, 0.08)' : 'rgba(0, 0, 0, 0.2)',
                  cursor: 'default',
                  textAlign: 'left',
                  borderRadius: '4px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={u.avatar} alt={u.name} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-bright)' }}>{u.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.role}</div>
                  </div>
                </div>
                {u.id === currentUserId ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                    已登录 <UserCheck size={12} />
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>成员</span>
                )}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 排行榜 & 实时动态流 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* 研发效能贡献榜 */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="military-font glow-text-cyan" style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} />
            研发效能贡献榜
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {leaderboard.map((u, idx) => {
              const isMVP = mvp && u.id === mvp.id;
              return (
                <div 
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: u.id === currentUserId ? 'rgba(0,242,254,0.03)' : 'rgba(255,255,255,0.01)',
                    border: u.id === currentUserId ? '1px solid rgba(0,242,254,0.1)' : '1px solid var(--border-muted)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      background: idx === 0 ? 'var(--accent-orange)' : idx === 1 ? 'silver' : idx === 2 ? 'brown' : 'transparent',
                      color: idx < 3 ? 'black' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                      fontFamily: 'var(--font-display)'
                    }}>
                      {idx + 1}
                    </div>
                    <img src={u.avatar} alt={u.name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-bright)' }}>
                        {u.name}
                        {isMVP && <span className="badge orange" style={{ marginLeft: '8px', fontSize: '0.6rem', padding: '1px 4px' }}>MVP</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{u.role}</span>
                        {(u.penalties_count > 0) && (
                          <span style={{ color: 'var(--accent-red)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 'bold' }}>
                            <AlertOctagon size={10} /> {u.penalties_count} 罚
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="military-font glow-text-cyan" style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>
                      {u.points_balance} eP
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      累计: {u.points_earned_lifetime}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 实时动态监视屏 */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 className="military-font glow-text-cyan" style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} />
            效能协同实时动态屏
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
            {feed.map((item) => {
              let tagColor = 'muted';
              let label = '系统';
              if (item.type === 'mission') { tagColor = 'cyan'; label = '任务'; }
              else if (item.type === 'shop') { tagColor = 'green'; label = '商城'; }
              else if (item.type === 'support') { tagColor = 'red'; label = '保障'; }

              return (
                <div 
                  key={item.id} 
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderLeft: `2px solid var(--accent-${tagColor === 'cyan' ? 'cyan' : tagColor === 'green' ? 'green' : tagColor === 'red' ? 'red' : 'muted'})`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`badge ${tagColor}`} style={{ fontSize: '0.65rem' }}>{label}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatTime(item.timestamp)}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                    {item.message}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 系统规则与头衔手册 */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        
        {/* 手册头部与 Tab 切换 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '14px', marginBottom: '20px' }}>
          <h3 className="military-font glow-text-cyan" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} />
            ePoints 积分与荣誉头衔管理细则 (企业级标准规范)
          </h3>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setActiveHandbookTab('points')}
              className="cyber-btn"
              style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                background: activeHandbookTab === 'points' ? 'var(--accent-cyan)' : 'rgba(0, 0, 0, 0.2)',
                borderColor: activeHandbookTab === 'points' ? 'var(--accent-cyan)' : 'var(--border-muted)',
                color: activeHandbookTab === 'points' ? 'black' : 'var(--text-primary)'
              }}
            >
              📊 多维效能积分细则
            </button>
            <button
              onClick={() => setActiveHandbookTab('ranks')}
              className="cyber-btn"
              style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                background: activeHandbookTab === 'ranks' ? 'var(--accent-cyan)' : 'rgba(0, 0, 0, 0.2)',
                borderColor: activeHandbookTab === 'ranks' ? 'var(--accent-cyan)' : 'var(--border-muted)',
                color: activeHandbookTab === 'ranks' ? 'black' : 'var(--text-primary)'
              }}
            >
              🎖️ 荣誉等级与勋章
            </button>
            <button
              onClick={() => setActiveHandbookTab('penalties')}
              className="cyber-btn"
              style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                background: activeHandbookTab === 'penalties' ? 'var(--accent-cyan)' : 'rgba(0, 0, 0, 0.2)',
                borderColor: activeHandbookTab === 'penalties' ? 'var(--accent-cyan)' : 'var(--border-muted)',
                color: activeHandbookTab === 'penalties' ? 'black' : 'var(--text-primary)'
              }}
            >
              ⚠️ 问责与处罚条例
            </button>
          </div>
        </div>

        {/* Tab 1: 积分获取细则 */}
        {activeHandbookTab === 'points' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            
            {/* 产品与业务分析战线 */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-muted)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Briefcase size={14} /> 产品规划与业务分析 (PM/BA)
              </h4>
              <ul style={{ listStyle: 'none', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '0' }}>
                <li>• 核心业务产品规划设计书 (PRD/MRD): <span style={{ color: 'var(--text-bright)' }}>800 - 1500 eP</span></li>
                <li>• 竞品深度分析与商业决策参考报告: <span style={{ color: 'var(--text-bright)' }}>500 - 800 eP</span></li>
                <li>• 业务需求收集与原型线框稿规划: <span style={{ color: 'var(--text-bright)' }}>200 - 400 eP</span></li>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.7rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                  ※ 以产品上线并顺利进行第一次迭代验证为积分划拨节点。
                </li>
              </ul>
            </div>

            {/* 技术与研发战线 */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-muted)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Code size={14} /> 核心技术与研发战线 (R&D)
              </h4>
              <ul style={{ listStyle: 'none', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '0' }}>
                <li>• 基础架构重构 / 核心数据库深度调优: <span style={{ color: 'var(--text-bright)' }}>1200 - 2000 eP</span></li>
                <li>• 核心业务模块开发 / 公共 API 交付: <span style={{ color: 'var(--text-bright)' }}>600 - 1100 eP</span></li>
                <li>• 日常业务 Bug 修复 / 代码单元测试扩充: <span style={{ color: 'var(--text-bright)' }}>150 - 400 eP</span></li>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.7rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                  ※ 所有研发积分需代码成功合并（PR merged）且通过集成测试后到账。
                </li>
              </ul>
            </div>

            {/* 体验与视觉设计战线 */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-muted)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PenTool size={14} /> 体验设计与交互规范 (UX/UI)
              </h4>
              <ul style={{ listStyle: 'none', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '0' }}>
                <li>• 全站设计规范 (Design System) 订立与同步: <span style={{ color: 'var(--text-bright)' }}>1500 - 2500 eP</span></li>
                <li>• 独立模块高保真视觉与动态动效方案设计: <span style={{ color: 'var(--text-bright)' }}>500 - 1000 eP</span></li>
                <li>• 细节切图导出、前端还原走查与缺陷修复: <span style={{ color: 'var(--text-bright)' }}>200 - 500 eP</span></li>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.7rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                  ※ 积分依据交付质量与研发走查通过率实施阶梯扣减或奖励。
                </li>
              </ul>
            </div>

            {/* 质量保障与安全战线 */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-muted)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckSquare size={14} /> 质量保障与代码安全 (QA/SEC)
              </h4>
              <ul style={{ listStyle: 'none', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '0' }}>
                <li>• 企业级接口/全链路自动化测试框架搭建: <span style={{ color: 'var(--text-bright)' }}>1000 - 1800 eP</span></li>
                <li>• 系统红蓝对抗演练 / 渗透性安全漏洞审计: <span style={{ color: 'var(--text-bright)' }}>800 - 1200 eP</span></li>
                <li>• 单业务模块回归自动化脚本编写与用例库: <span style={{ color: 'var(--text-bright)' }}>350 - 700 eP</span></li>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.7rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                  ※ 发现严重缺陷 (P0/P1) 或重大安全漏洞直接核发额外特别奖赏。
                </li>
              </ul>
            </div>

            {/* 系统运维与 SLA 响应战线 */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-muted)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ color: 'var(--accent-red)', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server size={14} /> 系统运维与 SLA 应急响应 (OPS)
              </h4>
              <ul style={{ listStyle: 'none', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '0' }}>
                <li>• K8s 多中心热备部署 / 生产数据库无感迁移: <span style={{ color: 'var(--text-bright)' }}>1500 - 3000 eP</span></li>
                <li>• 生产重大故障紧急排障 (Critical): <span style={{ color: 'var(--text-bright)' }}>300 eP 基准分 + 时效加成</span>
                  <div style={{ paddingLeft: '8px', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    - 黄金10分钟内解决: <strong>1.8x 倍率加成</strong><br/>
                    - 白银30分钟内解决: <strong>1.4x 倍率加成</strong><br/>
                    - 超出2小时解决: <strong>0.7x 积分衰减</strong>
                  </div>
                </li>
              </ul>
            </div>

            {/* 市场开拓与大客户销售 */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-muted)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HeartHandshake size={14} /> 市场开拓与客户成功 (BD/CS)
              </h4>
              <ul style={{ listStyle: 'none', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '0' }}>
                <li>• 重点 KA 大客户成功签约 / 关键合同续约: <span style={{ color: 'var(--text-bright)' }}>2000 - 5000 eP</span></li>
                <li>• 商业新线索挖掘及转化为合格合作商商机: <span style={{ color: 'var(--text-bright)' }}>500 - 1200 eP</span></li>
                <li>• 客户日常深度回访与服务满意度提升 (CSAT &gt; 95%): <span style={{ color: 'var(--text-bright)' }}>400 eP</span></li>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.7rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                  ※ 商务人员可用积分购买商城商品发放给客户或团队作为答谢金。
                </li>
              </ul>
            </div>

            {/* 成长与组织建设战线 */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-muted)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <GraduationCap size={14} /> 团队带教与组织建设 (HR/MGT)
              </h4>
              <ul style={{ listStyle: 'none', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '0' }}>
                <li>• 担任新人导师并辅导其顺利通过试用期: <span style={{ color: 'var(--text-bright)' }}>1000 eP / 人</span></li>
                <li>• 主讲技术/产品沙龙并完成文档 Wiki 沉淀: <span style={{ color: 'var(--text-bright)' }}>400 eP / 场</span></li>
                <li>• 核心开发/安全开发/测试规范白皮书编写: <span style={{ color: 'var(--text-bright)' }}>500 - 800 eP / 份</span></li>
                <li style={{ color: 'var(--text-muted)', fontSize: '0.7rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                  ※ 旨在鼓励资深人员输出方法论与赋能初级员工。
                </li>
              </ul>
            </div>

            {/* 动态战略调节机制 */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-orange)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ color: 'var(--accent-orange)', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flame size={14} /> 战略重心动态调节机制
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                企业管理层可随时调控在公开看板上发布的任务的积分倍率：
              </p>
              <ul style={{ listStyle: 'none', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '0' }}>
                <li>• <strong>1.0x 标准</strong>：常态化交付与日常迭代任务。</li>
                <li>• <strong>1.2x 引导</strong>：鼓励团队攻克的次要矛盾或死角。</li>
                <li>• <strong>1.5x 加急</strong>：高优先交付任务或紧急排班。</li>
                <li>• <strong>2.0x+ 决战</strong>：对公司核心战略起到关键成败决定作用的关键攻坚（如紧急抢修大客户、重要大版本踩线发布）。</li>
              </ul>
            </div>

          </div>
        )}

        {/* Tab 2: 荣誉头衔与勋章 */}
        {activeHandbookTab === 'ranks' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
            
            {/* 段位等级与特权 */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-muted)' }}>
              <h4 style={{ color: 'var(--accent-cyan)', fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={16} /> L1 - L5 荣誉段位与特权规则
              </h4>
              
              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-muted)', color: 'var(--text-bright)' }}>
                    <th style={{ padding: '8px 6px' }}>等级 & 称号</th>
                    <th style={{ padding: '8px 6px' }}>累计积分门槛</th>
                    <th style={{ padding: '8px 6px' }}>解锁特权与兑换范围</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 6px', fontWeight: 'bold', color: 'var(--text-muted)' }}>L1 研发新星 / 业务助理</td>
                    <td style={{ padding: '10px 6px' }}>0 - 1,999 eP</td>
                    <td style={{ padding: '10px 6px' }}>可兑换日常生活福利、技术下午茶、电子书会员等。</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 6px', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>L2 开发骨干 / 交付先锋</td>
                    <td style={{ padding: '10px 6px' }}>2,000 - 4,999 eP</td>
                    <td style={{ padding: '10px 6px' }}>额外解锁高品质数码外设、机械键盘、护眼显示器以及专业软件授权。</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 6px', fontWeight: 'bold', color: 'var(--accent-green)' }}>L3 核心专家 / 业务操盘手</td>
                    <td style={{ padding: '10px 6px' }}>5,000 - 9,999 eP</td>
                    <td style={{ padding: '10px 6px' }}>额外解锁带薪年假 (+1天/次)、高阶培训认证与行业证书考试报销。</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 6px', fontWeight: 'bold', color: 'var(--accent-orange)' }}>L4 效能大师 / 战略指挥官</td>
                    <td style={{ padding: '10px 6px' }}>10,000 - 19,999 eP</td>
                    <td style={{ padding: '10px 6px' }}>解锁企业级稀缺办公装备（顶配MacBook/护眼显示器）、外部大咖一对一指导机会。</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 6px', fontWeight: 'bold', color: 'var(--accent-red)', textShadow: '0 0 10px rgba(255,0,0,0.2)' }}>L5 终身荣誉殿堂</td>
                    <td style={{ padding: '10px 6px', color: 'var(--accent-red)', fontWeight: 'bold' }}>20,000+ eP</td>
                    <td style={{ padding: '10px 6px' }}>享受终身荣誉效能津贴，由公司全额资助年度海外游或定制化专属福利。</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 勋章体系 */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-muted)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ color: 'var(--accent-orange)', fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={16} /> 卓越成就勋章体系
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                达成里程碑记录的成员，将由系统自动派发勋章，并有额外一次性大额 eP 赠礼：
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderLeft: '3px solid var(--accent-red)', borderRadius: '2px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-bright)' }}>⚡ SLA 极速排除官</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    在“黄金10分钟”内排除线上故障累计达 10 次。
                  </div>
                </div>

                <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderLeft: '3px solid var(--accent-orange)', borderRadius: '2px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-bright)' }}>🔥 红区战略主攻手</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    累计完成并交付 2.0x 倍率以上核心战略任务 5 次。
                  </div>
                </div>

                <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderLeft: '3px solid var(--accent-green)', borderRadius: '2px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-bright)' }}>🌱 卓越传道带教导师</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    作为新人导师，成功带教 3 名新员工通过试用期。
                  </div>
                </div>

                <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderLeft: '3px solid var(--accent-cyan)', borderRadius: '2px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-bright)' }}>🌈 全栈协同急先锋</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    在系统中的 5 个不同的业务专业领域均有积分获取记录。
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab 3: 问责与处罚条例 */}
        {activeHandbookTab === 'penalties' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            
            {/* 处罚条例1: 故障处理超时 */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-muted)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ color: 'var(--accent-red)', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertOctagon size={14} className="glow-text-red" /> 故障响应与恢复严重超时
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                当生产环境或核心系统发生故障时，值班或派单人员需在时效内解决：
              </p>
              <ul style={{ listStyle: 'none', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '0' }}>
                <li>• <strong>P0/P1级故障 (Critical)</strong>: 超过 120 分钟未恢复。</li>
                <li>• <strong>处罚措施</strong>: 扣除责任人 <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>100 - 200 eP</span> 效能积分。</li>
                <li>• <strong>系统功能</strong>: 管理员可在保障队列中对逾期工单执行扣分。</li>
              </ul>
            </div>

            {/* 处罚条例2: 值班推诿或响应不力 */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-muted)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ color: 'var(--accent-red)', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={14} className="glow-text-red" /> 值班响应不力 / 推诿扯皮
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                技术保障 On-Call 负责人必须时刻处于就绪状态，以最快速度响应警报：
              </p>
              <ul style={{ listStyle: 'none', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '0' }}>
                <li>• <strong>违规判定</strong>: 红色警报触发后，值班人员超过 15 分钟未确认接单，或拒绝履行排障职责。</li>
                <li>• <strong>处罚措施</strong>: 扣除值班人员 <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>100 eP</span> 积分，并在动态屏进行系统通报批评。</li>
              </ul>
            </div>

            {/* 处罚条例3: 修复质量低劣 */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-muted)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ color: 'var(--accent-red)', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server size={14} className="glow-text-red" /> 修复质量差 / 二次故障
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                保障修复要求彻底排查根因，避免草率“贴膏药”式修复而引发更大隐患：
              </p>
              <ul style={{ listStyle: 'none', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '0' }}>
                <li>• <strong>违规判定</strong>: 故障标记为 Resolved 后 2 小时内由于相同原因此次爆发，或修复方案直接引发了其他次生严重问题。</li>
                <li>• <strong>处罚措施</strong>: 扣除原修复人 <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>150 eP</span> 积分，该工单作废并重新打开，重新指派排障。</li>
              </ul>
            </div>

            {/* 处罚条例4: 虚报成果 / 进度灌水 */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-orange)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ color: 'var(--accent-orange)', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flame size={14} /> 虚报成果 / 进度灌水
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                任务提审必须严谨，上传真实有效的可供核实的交付成果：
              </p>
              <ul style={{ listStyle: 'none', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '0' }}>
                <li>• <strong>违规判定</strong>: 员工虚构工作成果（如随手填写的假链接、无效 commit）或提交物极其应付，被主管审核驳回且判定为虚报。</li>
                <li>• <strong>处罚措施</strong>: 扣除当事人 <span style={{ color: 'var(--accent-orange)', fontWeight: 'bold' }}>50 eP</span> 积分，驳回修改，以正研发风气。</li>
              </ul>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
