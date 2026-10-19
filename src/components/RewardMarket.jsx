import React, { useEffect, useRef, useState } from 'react';
import { ShoppingBag, Coins, Package, ClipboardList, Plus, Pencil, Trash2, Save, X, ImagePlus, Banknote, Receipt } from 'lucide-react';

const rewardIcons = ['🎁', '🚕', '🏨', '🍱', '💵', '💰', '☕', '🚗', '💾', '🎧', '☁️', '📁', '🤖', '🚀', '💻', '🏖️', '🥤', '🍿', '🍕', '🍰', '⌨️', '🖱️', '🖥️', '📱', '🎨', '📚', '📜', '✈️', '💺', '🧾', '📎'];

const reimbursementCategories = [
  { id: 'hotel', label: '住宿票', icon: '🏨', desc: '差旅住宿、酒店客房发票' },
  { id: 'taxi', label: '打车票', icon: '🚕', desc: '出行交通、打车行程单与发票' },
  { id: 'electronics', label: '电子产品', icon: '💻', desc: '手机、电脑、平板等办公数码设备' },
  { id: 'office_supplies', label: '办公用品', icon: '📎', desc: '文具耗材、办公周边与日常用品' },
  { id: 'other', label: '其他行政报销', icon: '📄', desc: '其他合规行政差旅与采购发票' },
];

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

  const categories = ["ALL", "Reimbursement", "CashOut", "Hardware", "Software", "Training", "Lifestyle"];

  const filteredRewards = activeCategory === "ALL" 
    ? rewards 
    : rewards.filter(r => r.category === activeCategory);

  // 提现弹窗状态
  const [cashOutModalOpen, setCashOutModalOpen] = useState(false);
  const [selectedCashOutReward, setSelectedCashOutReward] = useState(null);
  const [withdrawPoints, setWithdrawPoints] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState('');

  // 行政报销弹窗状态
  const [reimburseModalOpen, setReimburseModalOpen] = useState(false);
  const [selectedReimburseReward, setSelectedReimburseReward] = useState(null);
  const [reimbursePoints, setReimbursePoints] = useState('');
  const [reimburseCategory, setReimburseCategory] = useState('hotel');
  const [reimburseNote, setReimburseNote] = useState('');
  const [reimburseSubmitting, setReimburseSubmitting] = useState(false);
  const [reimburseError, setReimburseError] = useState('');
  const [reimburseSuccessMsg, setReimburseSuccessMsg] = useState('');

  const openCashOutModal = (reward) => {
    setSelectedCashOutReward(reward);
    const defaultVal = currentUser.points_balance > 0 ? (currentUser.points_balance >= 100 ? 100 : currentUser.points_balance) : '';
    setWithdrawPoints(defaultVal ? String(defaultVal) : '');
    setWithdrawError('');
    setWithdrawSuccessMsg('');
    setCashOutModalOpen(true);
  };

  const handlePointsChange = (val) => {
    setWithdrawPoints(val);
    setWithdrawSuccessMsg('');
    if (!val || val.trim() === '') {
      setWithdrawError('请输入提现积分');
      return;
    }
    const num = Number(val);
    if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
      setWithdrawError('提现积分必须为大于 0 的整数');
      return;
    }
    if (num > currentUser.points_balance) {
      setWithdrawError(`提现积分不能超过当前可用余额（最多 ${currentUser.points_balance} eP）`);
      return;
    }
    setWithdrawError('');
  };

  const handleQuickSelectPoints = (pts) => {
    handlePointsChange(String(pts));
  };

  const handleCashOutSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCashOutReward) return;
    const num = Number(withdrawPoints);
    if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
      setWithdrawError('提现积分必须为大于 0 的整数');
      return;
    }
    if (num > currentUser.points_balance) {
      setWithdrawError(`提现积分不能超过当前可用余额（最多 ${currentUser.points_balance} eP）`);
      return;
    }

    setWithdrawSubmitting(true);
    setWithdrawError('');
    try {
      const res = await onPurchaseReward(selectedCashOutReward.id, currentUserId, num);
      if (res && res.error) {
        setWithdrawError(res.error);
      } else {
        setWithdrawSuccessMsg(`提现申请已提交！已扣除 ${num} eP，待财务打款 ¥${(num * 0.9).toFixed(2)} 元。`);
        setTimeout(() => {
          setCashOutModalOpen(false);
          setWithdrawSuccessMsg('');
        }, 1200);
      }
    } catch (err) {
      setWithdrawError(err.message || '提现申请失败，请稍后重试');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  const openReimburseModal = (reward, preselectedCat) => {
    const targetReward = reward || rewards.find(r => r.category === 'Reimbursement');
    setSelectedReimburseReward(targetReward);

    // 根据商品名称智能匹配初始报销类目
    let initialCat = preselectedCat || 'hotel';
    if (!preselectedCat && targetReward) {
      const title = targetReward.title || '';
      if (title.includes('打车') || title.includes('出行') || title.includes('交通')) initialCat = 'taxi';
      else if (title.includes('住宿') || title.includes('酒店')) initialCat = 'hotel';
      else if (title.includes('电子') || title.includes('手机') || title.includes('电脑') || title.includes('平板')) initialCat = 'electronics';
      else if (title.includes('办公') || title.includes('文具')) initialCat = 'office_supplies';
    }
    setReimburseCategory(initialCat);
    setReimburseNote('');

    let defaultVal = '';
    if (targetReward && targetReward.points_cost > 1 && targetReward.points_cost <= currentUser.points_balance) {
      defaultVal = targetReward.points_cost;
    } else if (currentUser.points_balance > 0) {
      defaultVal = currentUser.points_balance >= 100 ? 100 : currentUser.points_balance;
    }
    setReimbursePoints(defaultVal ? String(defaultVal) : '');
    setReimburseError('');
    setReimburseSuccessMsg('');
    setReimburseModalOpen(true);
  };

  const handleReimbursePointsChange = (val) => {
    setReimbursePoints(val);
    setReimburseSuccessMsg('');
    if (!val || val.trim() === '') {
      setReimburseError('请输入报销积分');
      return;
    }
    const num = Number(val);
    if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
      setReimburseError('报销积分必须为大于 0 的整数');
      return;
    }
    if (num > currentUser.points_balance) {
      setReimburseError(`报销积分不能超过当前可用余额（最多 ${currentUser.points_balance} eP）`);
      return;
    }
    setReimburseError('');
  };

  const handleQuickSelectReimbursePoints = (pts) => {
    handleReimbursePointsChange(String(pts));
  };

  const handleReimburseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReimburseReward) return;
    const num = Number(reimbursePoints);
    if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
      setReimburseError('报销积分必须为大于 0 的整数');
      return;
    }
    if (num > currentUser.points_balance) {
      setReimburseError(`报销积分不能超过当前可用余额（最多 ${currentUser.points_balance} eP）`);
      return;
    }

    const catObj = reimbursementCategories.find(c => c.id === reimburseCategory);
    const catLabel = catObj ? catObj.label : '行政报销';
    const finalRemark = reimburseNote.trim() ? `${catLabel} - ${reimburseNote.trim()}` : catLabel;

    setReimburseSubmitting(true);
    setReimburseError('');
    try {
      const res = await onPurchaseReward(selectedReimburseReward.id, currentUserId, num, finalRemark);
      if (res && res.error) {
        setReimburseError(res.error);
      } else {
        setReimburseSuccessMsg(`报销申请已提交！已扣除 ${num} eP，待行政与财务核销打款 ¥${num.toFixed(2)} 元。`);
        setTimeout(() => {
          setReimburseModalOpen(false);
          setReimburseSuccessMsg('');
        }, 1200);
      }
    } catch (err) {
      setReimburseError(err.message || '报销申请失败，请稍后重试');
    } finally {
      setReimburseSubmitting(false);
    }
  };

  const handleRedeemClick = async (reward) => {
    if (reward.category === 'CashOut') {
      openCashOutModal(reward);
      return;
    }
    if (reward.category === 'Reimbursement') {
      openReimburseModal(reward);
      return;
    }
    if (!window.confirm(`确定要消耗 ${reward.points_cost} eP 兑换“${reward.title}”吗？`)) {
      return;
    }
    const res = await onPurchaseReward(reward.id, currentUserId);
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
          {rewards.some(r => r.category === 'Reimbursement') && (
            <button
              type="button"
              className="cyber-btn"
              onClick={() => openReimburseModal(rewards.find(r => r.category === 'Reimbursement'))}
              disabled={currentUser.points_balance <= 0}
              style={{ borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
            >
              <Receipt size={15} />申请报销
            </button>
          )}
          {rewards.some(r => r.category === 'CashOut') && (
            <button
              type="button"
              className="cyber-btn success"
              onClick={() => openCashOutModal(rewards.find(r => r.category === 'CashOut'))}
              disabled={currentUser.points_balance <= 0}
            >
              <Banknote size={15} />申请提现
            </button>
          )}
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
            <label>商品分类<select className="cyber-select" value={rewardForm.category} onChange={e => handleFormChange('category', e.target.value)}>{categories.slice(1).map(category => <option key={category} value={category}>{category === 'Reimbursement' ? '行政报销 (打车/住宿/餐饮 1:1)' : category === 'CashOut' ? '现金折现 (打9折提现)' : category === 'Hardware' ? '办公外设 (硬件)' : category === 'Software' ? '效能工具 (软件)' : category === 'Training' ? '专业成长 (培训)' : category === 'Lifestyle' ? '生活福利 (休整)' : category}</option>)}</select></label>
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
          if (cat === "Reimbursement") label = "行政报销 (1eP=1元)";
          else if (cat === "CashOut") label = "现金折现 (9折提现)";
          else if (cat === "Hardware") label = "办公外设 (硬件)";
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

      {/* 行政报销专区说明与快速通道 */}
      {activeCategory === 'Reimbursement' && (
        <div className="glass-panel" style={{ padding: '16px 20px', background: 'rgba(0, 240, 255, 0.06)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🧾</span> 行政报销核销专区 (1:1 全额报销)
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              支持自由输入报销分值（限制在当前可用余额内）。报销汇率按 1:1 核销（1 eP = 1.00 元人民币现金报销额度），凭发票凭据申请，由行政统一核销打款。覆盖住宿票、打车票、电子产品（手机/电脑/平板等）、办公用品等合规发票。
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              当前可用: <strong className="glow-text-cyan">{currentUser.points_balance} eP</strong>
            </span>
            {filteredRewards.length > 0 && (
              <button
                type="button"
                className="cyber-btn"
                disabled={currentUser.points_balance <= 0}
                onClick={() => openReimburseModal(filteredRewards[0])}
                style={{ padding: '8px 16px', fontSize: '0.82rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
              >
                <Receipt size={14} /> 立即申请报销
              </button>
            )}
          </div>
        </div>
      )}

      {/* 现金折现专区说明与快速通道 */}
      {activeCategory === 'CashOut' && (
        <div className="glass-panel" style={{ padding: '16px 20px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>💵</span> 现金折现提现专区
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              支持自由输入提现分值（限制在当前可用余额内）。提现汇率按 9 折折现（1 eP = 0.90 元人民币现金），申请提交后由财务进行审核与打款。
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              当前可用: <strong className="glow-text-cyan">{currentUser.points_balance} eP</strong>
            </span>
            {filteredRewards.length > 0 && (
              <button
                type="button"
                className="cyber-btn success"
                disabled={currentUser.points_balance <= 0}
                onClick={() => openCashOutModal(filteredRewards[0])}
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
              >
                <Banknote size={14} /> 立即申请提现
              </button>
            )}
          </div>
        </div>
      )}

      {/* 商品商品列表 & 我的兑换订单 */}
      <div className="market-content">
        
        {/* 商品网格 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {filteredRewards.map(r => {
            const isCashOut = r.category === 'CashOut';
            const isReimbursement = r.category === 'Reimbursement';
            const canAfford = (isCashOut || isReimbursement) ? currentUser.points_balance > 0 : currentUser.points_balance >= r.points_cost;
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
                  opacity: hasStock ? 1 : 0.65,
                  border: isCashOut ? '1px solid rgba(16, 185, 129, 0.35)' : isReimbursement ? '1px solid rgba(0, 240, 255, 0.35)' : undefined,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '2rem' }}><RewardVisual value={r.image} size={48} /></span>
                    <div className="reward-card-tools">
                      <span className="badge muted" style={{ fontSize: '0.65rem' }}>{r.category === 'Reimbursement' ? '报销 (1:1)' : r.category === 'CashOut' ? '折现 (9折)' : r.category === 'Hardware' ? '硬件' : r.category === 'Software' ? '软件' : r.category === 'Training' ? '培训' : '生活'}</span>
                      {isAdmin && <><button type="button" title="编辑商品" onClick={() => beginEdit(r)}><Pencil size={14} /></button><button type="button" title="删除商品" className="danger" onClick={() => handleDeleteReward(r)}><Trash2 size={14} /></button></>}
                    </div>
                  </div>

                  <h4 style={{ color: 'var(--text-bright)', fontSize: '1rem', fontWeight: 'bold', marginBottom: '6px' }}>{r.title}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.4', minHeight: '40px' }}>{r.description}</p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {isCashOut || isReimbursement ? '申请状态: ' : '剩余库存: '}
                      <strong style={{ color: hasStock ? 'var(--text-primary)' : 'var(--accent-red)' }}>
                        {isCashOut || isReimbursement ? (hasStock ? '开放申请' : '通道维护中') : r.inventory}
                      </strong>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: canAfford ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                      <Coins size={14} />
                      {isCashOut || isReimbursement ? (
                        <span className="military-font" style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                          自由输入分值
                        </span>
                      ) : (
                        <span className="military-font" style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>{r.points_cost} eP</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => isCashOut ? openCashOutModal(r) : isReimbursement ? openReimburseModal(r) : handleRedeemClick(r)}
                    className={`cyber-btn ${!hasStock ? 'danger' : canAfford ? 'success' : ''}`}
                    disabled={!hasStock || !canAfford}
                    style={{ width: '100%', fontSize: '0.75rem', padding: '8px' }}
                  >
                    {!hasStock ? "通道维护中" : isCashOut ? (currentUser.points_balance > 0 ? "申请积分提现" : "暂无可提现积分") : isReimbursement ? (currentUser.points_balance > 0 ? "申请积分报销" : "暂无可报销积分") : canAfford ? "立即申请兑换" : "积分不足，锁定中"}
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
                const isCashOut = item.category === 'CashOut';
                const isReimbursement = item.category === 'Reimbursement';

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
                        {isDelivered 
                          ? (isCashOut ? "已打款" : isReimbursement ? "已报销到账" : "已发放") 
                          : (isCashOut ? "待财务审核打款" : isReimbursement ? "待行政审核报销" : "配送/办理中")}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <span>时间: {formatDate(tx.created_at)}</span>
                      <span className="glow-text-cyan" style={{ fontFamily: 'var(--font-display)', fontWeight: 'bold' }}>
                        -{tx.points_spent} eP {isCashOut ? `(折现 ¥${(tx.points_spent * 0.9).toFixed(2)})` : isReimbursement ? `(报销 ¥${Number(tx.points_spent).toFixed(2)}${tx.remark ? ` · ${tx.remark}` : ''})` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 积分现金折现提现弹窗 */}
      {cashOutModalOpen && selectedCashOutReward && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: 'min(100%, 520px)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              border: '1px solid var(--accent-green)',
              boxShadow: '0 0 24px var(--accent-green-glow)',
              borderRadius: '8px',
              overflowY: 'auto',
            }}
          >
            {/* 弹窗头部 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '1.05rem' }}>
                <Coins size={20} />
                <span>申请积分提现 (现金折现)</span>
              </div>
              <button
                type="button"
                className="header-icon-btn"
                onClick={() => setCashOutModalOpen(false)}
                title="关闭"
              >
                <X size={18} />
              </button>
            </div>

            {/* 当前账户与折现规则卡片 */}
            <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-muted)', borderRadius: '6px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>提现申请人:</span>
                <strong style={{ color: 'var(--text-bright)' }}>{currentUser.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>当前可用积分余额:</span>
                <strong className="military-font glow-text-cyan" style={{ fontSize: '1.1rem' }}>
                  {currentUser.points_balance} eP
                </strong>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-muted)', paddingTop: '8px', marginTop: '4px' }}>
                📌 折现规则: 按 <strong style={{ color: 'var(--accent-green)' }}>9折</strong> 折算现金（1 eP = 0.90 元人民币），由财务统一打款发放。
              </div>
            </div>

            {/* 输入表单 */}
            <form onSubmit={handleCashOutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-bright)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>
                  提现积分数额 (eP) - 用户可自由输入
                </label>
                <div>
                  <input
                    type="number"
                    className="cyber-input"
                    min="1"
                    max={currentUser.points_balance}
                    step="1"
                    placeholder={`请输入要提现的分数（最多 ${currentUser.points_balance} eP）`}
                    value={withdrawPoints}
                    onChange={(e) => handlePointsChange(e.target.value)}
                    style={{ width: '100%', fontSize: '1rem', padding: '10px 12px' }}
                    autoFocus
                    required
                  />
                </div>

                {/* 快捷填入选项 */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>快捷选项:</span>
                  <button
                    type="button"
                    className="cyber-btn"
                    style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                    onClick={() => handleQuickSelectPoints(currentUser.points_balance)}
                    disabled={currentUser.points_balance <= 0}
                  >
                    全部提现 ({currentUser.points_balance} eP)
                  </button>
                  {[50, 100, 200, 500].filter(pts => pts <= currentUser.points_balance).map(pts => (
                    <button
                      key={pts}
                      type="button"
                      className="cyber-btn"
                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                      onClick={() => handleQuickSelectPoints(pts)}
                    >
                      {pts} eP
                    </button>
                  ))}
                </div>
              </div>

              {/* 实时折算到账预览 */}
              {(() => {
                const parsed = Number(withdrawPoints);
                const isValid = Number.isInteger(parsed) && parsed > 0 && parsed <= currentUser.points_balance;
                const estimatedCash = isValid ? (parsed * 0.9).toFixed(2) : '0.00';
                const remainingPoints = isValid ? currentUser.points_balance - parsed : currentUser.points_balance;

                return (
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>本次提现消耗:</span>
                      <strong className="military-font" style={{ color: 'var(--text-bright)' }}>
                        {isValid ? `${parsed} eP` : '-'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>折现比例:</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>90% (1 eP = 0.90元现金)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-bright)', fontWeight: 'bold' }}>预计到账现金:</span>
                      <strong style={{ color: 'var(--accent-green)', fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>
                        ¥ {estimatedCash} 元
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>提现后剩余可用:</span>
                      <span>{remainingPoints} eP</span>
                    </div>
                  </div>
                );
              })()}

              {/* 错误或成功提示 */}
              {withdrawError && (
                <div style={{ padding: '8px 12px', background: 'rgba(255, 75, 75, 0.1)', border: '1px solid var(--accent-red)', borderRadius: '4px', color: '#ff9aa3', fontSize: '0.8rem' }}>
                  {withdrawError}
                </div>
              )}
              {withdrawSuccessMsg && (
                <div style={{ padding: '8px 12px', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid var(--accent-green)', borderRadius: '4px', color: 'var(--accent-green)', fontSize: '0.8rem' }}>
                  {withdrawSuccessMsg}
                </div>
              )}

              {/* 操作按钮 */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="cyber-btn"
                  onClick={() => setCashOutModalOpen(false)}
                  disabled={withdrawSubmitting}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="cyber-btn success"
                  disabled={withdrawSubmitting || !withdrawPoints || !!withdrawError || Number(withdrawPoints) <= 0 || Number(withdrawPoints) > currentUser.points_balance}
                  style={{ minWidth: '120px' }}
                >
                  {withdrawSubmitting ? '提交中...' : '确认申请提现'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 积分行政报销申请弹窗 */}
      {reimburseModalOpen && selectedReimburseReward && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: 'min(100%, 540px)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              border: '1px solid var(--accent-cyan)',
              boxShadow: '0 0 24px var(--accent-cyan-glow)',
              borderRadius: '8px',
              overflowY: 'auto',
            }}
          >
            {/* 弹窗头部 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontWeight: 'bold', fontSize: '1.05rem' }}>
                <Receipt size={20} />
                <span>申请行政报销 (凭票核销)</span>
              </div>
              <button
                type="button"
                className="header-icon-btn"
                onClick={() => setReimburseModalOpen(false)}
                title="关闭"
              >
                <X size={18} />
              </button>
            </div>

            {/* 当前账户与核销规则卡片 */}
            <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-muted)', borderRadius: '6px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>报销申请人:</span>
                <strong style={{ color: 'var(--text-bright)' }}>{currentUser.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>当前可用积分余额:</span>
                <strong className="military-font glow-text-cyan" style={{ fontSize: '1.1rem' }}>
                  {currentUser.points_balance} eP
                </strong>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-muted)', paddingTop: '8px', marginTop: '4px' }}>
                📌 报销规则: 按 <strong style={{ color: 'var(--accent-cyan)' }}>1:1 全额报销</strong>（1 eP = 1.00 元人民币），凭合规发票与凭证由行政及财务统一审核打款。
              </div>
            </div>

            {/* 输入表单 */}
            <form onSubmit={handleReimburseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* 报销类目选择 */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-bright)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>
                  报销类目 (请选择适用的报销类型)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                  {reimbursementCategories.map(cat => {
                    const isSelected = reimburseCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setReimburseCategory(cat.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-muted)',
                          background: isSelected ? 'rgba(0, 240, 255, 0.15)' : 'rgba(0, 0, 0, 0.25)',
                          color: isSelected ? 'var(--text-bright)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? 'var(--accent-cyan)' : 'inherit' }}>
                            {cat.label}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {cat.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 报销发票或明细说明 */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-bright)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>
                  报销说明 / 凭证备注 <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>(选填)</span>
                </label>
                <input
                  type="text"
                  className="cyber-input"
                  placeholder="例如：酒店住宿发票、打车行程单、手机电脑购买发票、文具采购清单等"
                  value={reimburseNote}
                  maxLength={100}
                  onChange={(e) => setReimburseNote(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem', padding: '9px 12px' }}
                />
              </div>

              {/* 报销积分数额 */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-bright)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>
                  报销积分数额 (eP) - 用户可自由输入
                </label>
                <div>
                  <input
                    type="number"
                    className="cyber-input"
                    min="1"
                    max={currentUser.points_balance}
                    step="1"
                    placeholder={`请输入要报销的分数（最多 ${currentUser.points_balance} eP）`}
                    value={reimbursePoints}
                    onChange={(e) => handleReimbursePointsChange(e.target.value)}
                    style={{ width: '100%', fontSize: '1rem', padding: '10px 12px' }}
                    required
                  />
                </div>

                {/* 快捷填入选项 */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>快捷选项:</span>
                  <button
                    type="button"
                    className="cyber-btn"
                    style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                    onClick={() => handleQuickSelectReimbursePoints(currentUser.points_balance)}
                    disabled={currentUser.points_balance <= 0}
                  >
                    全部报销 ({currentUser.points_balance} eP)
                  </button>
                  {[50, 100, 200, 300, 500].filter(pts => pts <= currentUser.points_balance).map(pts => (
                    <button
                      key={pts}
                      type="button"
                      className="cyber-btn"
                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                      onClick={() => handleQuickSelectReimbursePoints(pts)}
                    >
                      {pts} eP
                    </button>
                  ))}
                </div>
              </div>

              {/* 实时核算到账预览 */}
              {(() => {
                const parsed = Number(reimbursePoints);
                const isValid = Number.isInteger(parsed) && parsed > 0 && parsed <= currentUser.points_balance;
                const estimatedCash = isValid ? parsed.toFixed(2) : '0.00';
                const remainingPoints = isValid ? currentUser.points_balance - parsed : currentUser.points_balance;
                const currentCatObj = reimbursementCategories.find(c => c.id === reimburseCategory);

                return (
                  <div style={{ background: 'rgba(0, 240, 255, 0.08)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '6px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>本次报销消耗:</span>
                      <strong className="military-font" style={{ color: 'var(--text-bright)' }}>
                        {isValid ? `${parsed} eP` : '-'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>报销类目:</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                        {currentCatObj ? `${currentCatObj.icon} ${currentCatObj.label}` : '行政报销'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>核销比例:</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>100% (1 eP = 1.00元报销款)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-bright)', fontWeight: 'bold' }}>预计报销到账:</span>
                      <strong style={{ color: 'var(--accent-cyan)', fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>
                        ¥ {estimatedCash} 元
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>报销后剩余可用:</span>
                      <span>{remainingPoints} eP</span>
                    </div>
                  </div>
                );
              })()}

              {/* 错误或成功提示 */}
              {reimburseError && (
                <div style={{ padding: '8px 12px', background: 'rgba(255, 75, 75, 0.1)', border: '1px solid var(--accent-red)', borderRadius: '4px', color: '#ff9aa3', fontSize: '0.8rem' }}>
                  {reimburseError}
                </div>
              )}
              {reimburseSuccessMsg && (
                <div style={{ padding: '8px 12px', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid var(--accent-cyan)', borderRadius: '4px', color: 'var(--accent-cyan)', fontSize: '0.8rem' }}>
                  {reimburseSuccessMsg}
                </div>
              )}

              {/* 操作按钮 */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="cyber-btn"
                  onClick={() => setReimburseModalOpen(false)}
                  disabled={reimburseSubmitting}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="cyber-btn"
                  disabled={reimburseSubmitting || !reimbursePoints || !!reimburseError || Number(reimbursePoints) <= 0 || Number(reimbursePoints) > currentUser.points_balance}
                  style={{ minWidth: '120px', borderColor: 'var(--accent-cyan)', color: 'black', background: 'var(--accent-cyan)' }}
                >
                  {reimburseSubmitting ? '提交中...' : '确认申请报销'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
