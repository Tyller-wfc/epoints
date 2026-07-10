import React, { useState, useEffect } from 'react';
import { ShoppingBag, Coins, CheckCircle, Package, ArrowRight, ClipboardList } from 'lucide-react';
import { getTransactions } from '../data/mockData';

export default function RewardMarket({ state, onPurchaseReward }) {
  const { rewards, users, currentUserId } = state;
  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  const [activeCategory, setActiveCategory] = useState("ALL");
  const [txHistory, setTxHistory] = useState([]);

  // 加载交易历史
  const loadTransactions = () => {
    const allTxs = getTransactions();
    // 仅看当前用户的订单
    const myTxs = allTxs.filter(tx => tx.user_id === currentUserId);
    setTxHistory(myTxs);
  };

  useEffect(() => {
    loadTransactions();
  }, [state, currentUserId]);

  const categories = ["ALL", "Hardware", "Software", "Training", "Lifestyle"];

  const filteredRewards = activeCategory === "ALL" 
    ? rewards 
    : rewards.filter(r => r.category === activeCategory);

  const handleRedeemClick = (rewardId) => {
    const res = onPurchaseReward(rewardId, currentUserId);
    if (res && res.error) {
      alert(res.error);
    } else {
      loadTransactions();
    }
  };

  // 格式化日期
  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "未知时间";
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      
      {/* 积分公示牌与分类筛选 */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShoppingBag size={24} className="glow-text-cyan" />
          <div>
            <h3 className="military-font" style={{ fontSize: '1.1rem', color: 'var(--text-bright)' }}>ePoints 企业能量福利商城</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>以积分换好礼。系统将直接对接行政或采购平台，为您快速配送商品及发放相关权益。</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '10px 16px', borderRadius: '4px', border: '1px solid var(--border-cyan)' }}>
          <Coins size={16} className="glow-text-cyan" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>您当前可用积分余额:</span>
          <span className="military-font glow-text-cyan" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            {currentUser.points_balance} eP
          </span>
        </div>
      </div>

      {/* 类别筛选栏 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {categories.map(cat => {
          let label = "全部商品";
          if (cat === "Hardware") label = "办公外设 (硬件)";
          else if (cat === "Software") label = "效能工具 (软件)";
          else if (cat === "Training") label = "专业成长 (培训)";
          else if (cat === "Lifestyle") label = "生活福利 (休整)";

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="cyber-btn"
              style={{
                padding: '8px 16px',
                fontSize: '0.8rem',
                background: activeCategory === cat ? 'var(--accent-cyan)' : 'rgba(0, 0, 0, 0.2)',
                borderColor: activeCategory === cat ? 'var(--accent-cyan)' : 'var(--border-muted)',
                color: activeCategory === cat ? 'black' : 'var(--text-primary)'
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 商品商品列表 & 我的兑换订单 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* 商品网格 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {filteredRewards.map(r => {
            const canAfford = currentUser.points_balance >= r.cost;
            const hasStock = r.stock > 0;

            return (
              <div 
                key={r.id} 
                className="glass-panel" 
                style={{ 
                  padding: '20px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  gap: '12px',
                  opacity: hasStock ? 1 : 0.65
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '2rem' }}>{r.image}</span>
                    <span className="badge muted" style={{ fontSize: '0.65rem' }}>
                      {r.category === 'Hardware' ? '硬件' :
                       r.category === 'Software' ? '软件' :
                       r.category === 'Training' ? '培训' : '生活'}
                    </span>
                  </div>

                  <h4 style={{ color: 'var(--text-bright)', fontSize: '1rem', fontWeight: 'bold', marginBottom: '6px' }}>{r.title}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.4', minHeight: '40px' }}>{r.description}</p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      剩余库存: <strong style={{ color: hasStock ? 'var(--text-primary)' : 'var(--accent-red)' }}>{r.stock}</strong>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: canAfford ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                      <Coins size={14} />
                      <span className="military-font" style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>{r.cost} eP</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRedeemClick(r.id)}
                    className={`cyber-btn ${!hasStock ? 'danger' : canAfford ? 'success' : ''}`}
                    disabled={!hasStock || !canAfford}
                    style={{ width: '100%', fontSize: '0.75rem', padding: '8px' }}
                  >
                    {!hasStock ? "商品售罄" : canAfford ? "立即申请兑换" : "积分不足，锁定中"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 我的兑换订单 */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 className="military-font glow-text-cyan" style={{ fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '10px' }}>
            <ClipboardList size={18} />
            我的兑换订单 ({txHistory.length})
          </h3>

          {txHistory.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 10px', fontSize: '0.8rem' }}>
              <Package size={30} style={{ marginBottom: '10px', opacity: 0.3 }} />
              <div>暂无兑换商品记录，快去领取任务赚取积分吧！</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
              {txHistory.map(tx => {
                const item = rewards.find(r => r.id === tx.reward_id) || { title: "未知商品", image: "📦" };
                const isDelivered = tx.status === "Delivered";

                return (
                  <div 
                    key={tx.id} 
                    style={{ 
                      padding: '10px', 
                      background: 'rgba(0,0,0,0.2)', 
                      borderRadius: '4px', 
                      border: '1px solid var(--border-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{item.image}</span> {item.title}
                      </span>
                      <span className={`badge ${isDelivered ? 'green' : 'orange'}`} style={{ fontSize: '0.6rem', padding: '1px 4px' }}>
                        {isDelivered ? "已发放" : "配送/办理中"}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <span>时间: {formatDate(tx.timestamp)}</span>
                      <span className="glow-text-cyan" style={{ fontFamily: 'var(--font-display)', fontWeight: 'bold' }}>
                        -{tx.points_spent} eP
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
