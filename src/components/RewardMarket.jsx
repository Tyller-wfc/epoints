import React, { useEffect, useRef, useState } from 'react';
import { ShoppingBag, Coins, Package, ClipboardList, Plus, Pencil, Trash2, Save, X, ImagePlus } from 'lucide-react';

const rewardIcons = ['🎁', '☕', '🥤', '🍿', '🍕', '🍰', '🎧', '⌨️', '🖱️', '💻', '🖥️', '📱', '🎨', '📚', '📜', '🏖️', '✈️', '💺'];

const emptyReward = {
  title: '',
  description: '',
  points_cost: 100,
  inventory: 10,
  category: 'Lifestyle',
  image: '🎁',
  level_required: 1,
};

const isRewardImage = (value) => typeof value === 'string' && (/^https?:\/\//.test(value) || value.startsWith('/api/') || value.startsWith('blob:'));

const RewardVisual = ({ value, size = 32 }) => isRewardImage(value)
  ? <img className="reward-visual" src={value} alt="" style={{ width: size, height: size }} />
  : <span>{value}</span>;

export default function RewardMarket({ state, onPurchaseReward, onCreateReward, onUpdateReward, onDeleteReward }) {
  const { rewards, users, currentUserId, transactions = [] } = state;
  const currentUser = users.find(u => u.id === currentUserId) || users[0];
  const isAdmin = currentUser.roleType === 'Admin';

  const [activeCategory, setActiveCategory] = useState("ALL");
  const [editingId, setEditingId] = useState(null);
  const [rewardForm, setRewardForm] = useState(emptyReward);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const imageInputRef = useRef(null);
  const txHistory = transactions.filter(tx => tx.user_id === currentUserId);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return undefined;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const categories = ["ALL", "Hardware", "Software", "Training", "Lifestyle"];

  const filteredRewards = activeCategory === "ALL" 
    ? rewards 
    : rewards.filter(r => r.category === activeCategory);

  const handleRedeemClick = async (rewardId) => {
    const res = await onPurchaseReward(rewardId, currentUserId);
    if (res && res.error) {
      alert(res.error);
    }
  };

  const beginCreate = () => {
    setEditingId(null);
    setRewardForm({ ...emptyReward });
    setImageFile(null);
    setFormError('');
    setFormOpen(true);
  };

  const beginEdit = (reward) => {
    setEditingId(reward.id);
    setRewardForm({
      title: reward.title,
      description: reward.description,
      points_cost: reward.points_cost,
      inventory: reward.inventory,
      category: reward.category,
      image: reward.image,
      level_required: reward.level_required,
    });
    setImageFile(null);
    setFormError('');
    setFormOpen(true);
  };

  const handleFormChange = (field, value) => {
    setRewardForm(current => ({ ...current, [field]: value }));
  };

  const handleRewardSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editingId) await onUpdateReward(editingId, rewardForm, imageFile);
      else await onCreateReward(rewardForm, imageFile);
      setFormOpen(false);
      setEditingId(null);
    } catch (error) {
      setFormError(error.message || '商品保存失败');
    } finally {
      setSaving(false);
    }
  };

  const selectBuiltInIcon = (icon) => {
    setImageFile(null);
    handleFormChange('image', icon);
  };

  const selectImageFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setFormError('商品图片仅支持 JPG、PNG、WebP 或 GIF');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError('商品图片不能超过 5 MB');
      return;
    }
    setFormError('');
    setImageFile(file);
  };

  const handleDeleteReward = async (reward) => {
    if (!window.confirm(`确定删除商品“${reward.title}”吗？此操作不可撤销。`)) return;
    try {
      await onDeleteReward(reward.id);
    } catch (error) {
      alert(error.message || '商品删除失败');
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

        <div className="market-header-actions">
          {isAdmin && <button type="button" className="cyber-btn" onClick={beginCreate}><Plus size={15} />新增商品</button>}
          <div className="market-balance">
            <Coins size={16} className="glow-text-cyan" />
            <span>您当前可用积分余额:</span>
            <strong className="military-font glow-text-cyan">{currentUser.points_balance} eP</strong>
          </div>
        </div>
      </div>

      {isAdmin && formOpen && (
        <form className="glass-panel reward-editor" onSubmit={handleRewardSubmit}>
          <div className="reward-editor-heading">
            <div><Pencil size={18} /><span><strong>{editingId ? '编辑商品' : '新增商品'}</strong><small>配置商品信息、兑换门槛与库存</small></span></div>
            <button type="button" className="header-icon-btn" title="关闭" onClick={() => setFormOpen(false)}><X size={16} /></button>
          </div>
          <div className="reward-editor-grid">
            <label>商品名称<input className="cyber-input" value={rewardForm.title} maxLength={255} onChange={e => handleFormChange('title', e.target.value)} required /></label>
            <label>商品分类<select className="cyber-select" value={rewardForm.category} onChange={e => handleFormChange('category', e.target.value)}>{categories.slice(1).map(category => <option key={category} value={category}>{category}</option>)}</select></label>
            <label>兑换积分<input className="cyber-input" type="number" min="1" step="1" value={rewardForm.points_cost} onChange={e => handleFormChange('points_cost', e.target.value)} required /></label>
            <label>库存数量<input className="cyber-input" type="number" min="0" step="1" value={rewardForm.inventory} onChange={e => handleFormChange('inventory', e.target.value)} required /></label>
            <label>起兑等级<input className="cyber-input" type="number" min="1" max="5" step="1" value={rewardForm.level_required} onChange={e => handleFormChange('level_required', e.target.value)} required /></label>
            <label className="reward-description-field">商品描述<textarea className="cyber-input" rows="3" value={rewardForm.description} onChange={e => handleFormChange('description', e.target.value)} required /></label>
            <div className="reward-image-field">
              <span>商品图标或图片</span>
              <div className="reward-image-picker">
                <div className="reward-image-preview">{imagePreview || isRewardImage(rewardForm.image) ? <img src={imagePreview || rewardForm.image} alt="商品预览" /> : <strong>{rewardForm.image}</strong>}</div>
                <div className="reward-icon-options">{rewardIcons.map(icon => <button key={icon} type="button" className={!imageFile && rewardForm.image === icon ? 'selected' : ''} title={`使用 ${icon}`} onClick={() => selectBuiltInIcon(icon)}>{icon}</button>)}</div>
                <button type="button" className="cyber-btn reward-upload-btn" onClick={() => imageInputRef.current?.click()}><ImagePlus size={15} />上传图片</button>
                <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={selectImageFile} />
              </div>
              <small>{imageFile ? `${imageFile.name}，保存后上传` : '支持 JPG、PNG、WebP、GIF，最大 5 MB'}</small>
            </div>
          </div>
          {formError && <div className="reward-form-error">{formError}</div>}
          <div className="reward-editor-actions"><button type="button" className="cyber-btn" onClick={() => setFormOpen(false)}>取消</button><button type="submit" className="cyber-btn success" disabled={saving}><Save size={15} />{saving ? '保存中...' : '保存商品'}</button></div>
        </form>
      )}

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
      <div className="market-content">
        
        {/* 商品网格 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {filteredRewards.map(r => {
            const canAfford = currentUser.points_balance >= r.points_cost;
            const hasStock = r.inventory > 0;

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
                    <span style={{ fontSize: '2rem' }}><RewardVisual value={r.image} size={48} /></span>
                    <div className="reward-card-tools">
                      <span className="badge muted" style={{ fontSize: '0.65rem' }}>{r.category === 'Hardware' ? '硬件' : r.category === 'Software' ? '软件' : r.category === 'Training' ? '培训' : '生活'}</span>
                      {isAdmin && <><button type="button" title="编辑商品" onClick={() => beginEdit(r)}><Pencil size={14} /></button><button type="button" title="删除商品" className="danger" onClick={() => handleDeleteReward(r)}><Trash2 size={14} /></button></>}
                    </div>
                  </div>

                  <h4 style={{ color: 'var(--text-bright)', fontSize: '1rem', fontWeight: 'bold', marginBottom: '6px' }}>{r.title}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.4', minHeight: '40px' }}>{r.description}</p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      剩余库存: <strong style={{ color: hasStock ? 'var(--text-primary)' : 'var(--accent-red)' }}>{r.inventory}</strong>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: canAfford ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                      <Coins size={14} />
                      <span className="military-font" style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>{r.points_cost} eP</span>
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
                        <RewardVisual value={item.image} size={24} /> {item.title}
                      </span>
                      <span className={`badge ${isDelivered ? 'green' : 'orange'}`} style={{ fontSize: '0.6rem', padding: '1px 4px' }}>
                        {isDelivered ? "已发放" : "配送/办理中"}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <span>时间: {formatDate(tx.created_at)}</span>
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
