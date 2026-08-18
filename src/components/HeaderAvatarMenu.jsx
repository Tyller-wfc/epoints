import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, Eye, EyeOff, KeyRound, Lock, RotateCcw, Upload, X } from 'lucide-react';

const allowedTypes = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'image/bmp', 'image/tiff', 'image/avif', 'image/heic', 'image/heif',
  'image/svg+xml',
];


/* ──────────── 密码强度计算 ──────────── */
function pwdStrength(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score; // 0-4
}
const strengthLabel = ['', '弱', '一般', '较强', '强'];
const strengthColor = ['', 'var(--accent-red)', '#f59e0b', 'var(--accent-cyan)', 'var(--accent-green)'];

export default function HeaderAvatarMenu({ user, onUpload, onReset, onChangePassword }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('avatar'); // 'avatar' | 'password'
  const rootRef = useRef(null);

  // ── 头像 Tab 状态 ──
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [avatarStatus, setAvatarStatus] = useState(null);
  const [avatarSaving, setAvatarSaving] = useState(false);

  // ── 密码 Tab 状态 ──
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdStatus, setPwdStatus] = useState(null);
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    const closeOnEscape = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const resetPwdForm = () => { setOldPwd(''); setNewPwd(''); setConfirmPwd(''); setPwdStatus(null); };

  const handleClose = () => { setOpen(false); setAvatarStatus(null); resetPwdForm(); };

  const handleTabSwitch = (next) => { setTab(next); setAvatarStatus(null); resetPwdForm(); };

  // ── 头像操作 ──
  const selectFile = (nextFile) => {
    if (!nextFile) return;
    if (!allowedTypes.includes(nextFile.type)) return setAvatarStatus({ type: 'error', text: '仅支持 JPG、PNG、WebP、GIF、BMP、TIFF、AVIF、HEIC 或 SVG' });

    if (nextFile.size > 5 * 1024 * 1024) return setAvatarStatus({ type: 'error', text: '头像不能超过 5 MB' });
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    setAvatarStatus(null);
  };

  const saveAvatar = async () => {
    if (!file) return inputRef.current?.click();
    setAvatarSaving(true); setAvatarStatus(null);
    try {
      await onUpload(user.id, file);
      setFile(null); setPreview('');
      setAvatarStatus({ type: 'success', text: '头像已更新' });
    } catch (error) { setAvatarStatus({ type: 'error', text: error.message }); }
    finally { setAvatarSaving(false); }
  };

  const resetAvatar = async () => {
    setAvatarSaving(true); setAvatarStatus(null);
    try {
      await onReset(user.id);
      setFile(null); setPreview('');
      setAvatarStatus({ type: 'success', text: '已恢复默认头像' });
    } catch (error) { setAvatarStatus({ type: 'error', text: error.message }); }
    finally { setAvatarSaving(false); }
  };

  // ── 修改密码操作 ──
  const strength = pwdStrength(newPwd);
  const confirmMatch = confirmPwd && newPwd === confirmPwd;
  const confirmMismatch = confirmPwd && newPwd !== confirmPwd;

  const handleChangePwd = async (e) => {
    e.preventDefault();
    if (!oldPwd || !newPwd || !confirmPwd) return setPwdStatus({ type: 'error', text: '请填写所有字段' });
    if (newPwd.length < 6) return setPwdStatus({ type: 'error', text: '新密码不能少于 6 位' });
    if (newPwd !== confirmPwd) return setPwdStatus({ type: 'error', text: '两次输入的新密码不一致' });
    setPwdSaving(true); setPwdStatus(null);
    try {
      await onChangePassword(oldPwd, newPwd);
      // 成功：重置表单并关闭面板（全局 Toast 会显示成功通知）
      resetPwdForm();
      setOpen(false);
    } catch (error) { setPwdStatus({ type: 'error', text: error.message }); }
    finally { setPwdSaving(false); }
  };

  return (
    <div className="header-avatar-menu" ref={rootRef}>
      <button
        type="button"
        className="header-avatar-trigger"
        title="个人设置"
        aria-label="个人设置"
        aria-expanded={open}
        onClick={() => { setOpen((v) => !v); setAvatarStatus(null); }}
      >
        <img src={user.avatar} alt={user.name} />
        <span><Camera size={12} /></span>
      </button>

      {open && (
        <div className="header-avatar-popover">
          {/* 顶栏：标题 + 关闭 */}
          <div className="header-avatar-title">
            <span>
              <strong>{user.name}</strong>
              <small>个人设置</small>
            </span>
            <button type="button" title="关闭" onClick={handleClose}><X size={16} /></button>
          </div>

          {/* Tab 切换 */}
          <div className="header-avatar-tabs">
            <button
              type="button"
              className={`header-avatar-tab ${tab === 'avatar' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('avatar')}
            >
              <Camera size={13} />头像
            </button>
            <button
              type="button"
              className={`header-avatar-tab ${tab === 'password' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('password')}
            >
              <KeyRound size={13} />修改密码
            </button>
          </div>

          {/* ── 头像 Tab ── */}
          {tab === 'avatar' && (
            <>
              <button type="button" className="header-avatar-preview" onClick={() => inputRef.current?.click()} title="选择头像">
                <img src={preview || user.avatar} alt="头像预览" />
                <span><Camera size={17} /></span>
              </button>
              <input ref={inputRef} type="file" hidden accept={allowedTypes.join(',')} onChange={(e) => { selectFile(e.target.files?.[0]); e.target.value = ''; }} />

              {file && (
                <div className="header-avatar-file"><Check size={14} /><span title={file.name}>{file.name}</span></div>
              )}
              <small className="header-avatar-hint">JPG / PNG / WebP / GIF / BMP / TIFF / AVIF / HEIC · 最大 5 MB</small>

              {avatarStatus && <div className={`header-avatar-status ${avatarStatus.type}`}>{avatarStatus.text}</div>}
              <div className="header-avatar-actions">
                {user.avatar.includes('/api/personnel/') && (
                  <button type="button" className="cyber-btn" disabled={avatarSaving} onClick={resetAvatar}><RotateCcw size={14} />恢复默认</button>
                )}
                <button type="button" className="cyber-btn success" disabled={avatarSaving} onClick={saveAvatar}>
                  <Upload size={14} />{avatarSaving ? '保存中...' : file ? '保存头像' : '选择头像'}
                </button>
              </div>
            </>
          )}

          {/* ── 修改密码 Tab ── */}
          {tab === 'password' && (
            <form className="header-pwd-form" onSubmit={handleChangePwd} autoComplete="off">
              {/* 旧密码 */}
              <div className="header-pwd-field">
                <label><Lock size={12} />当前密码</label>
                <div className="header-pwd-input-wrap">
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPwd}
                    onChange={(e) => setOldPwd(e.target.value)}
                    placeholder="请输入当前密码"
                    autoComplete="current-password"
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowOld((v) => !v)}>
                    {showOld ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              {/* 新密码 */}
              <div className="header-pwd-field">
                <label><KeyRound size={12} />新密码</label>
                <div className="header-pwd-input-wrap">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="至少 6 位"
                    autoComplete="new-password"
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowNew((v) => !v)}>
                    {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                {newPwd && (
                  <div className="header-pwd-strength">
                    <div className="header-pwd-strength-bars">
                      {[1, 2, 3, 4].map((lvl) => (
                        <span
                          key={lvl}
                          style={{ background: lvl <= strength ? strengthColor[strength] : 'var(--border-muted)' }}
                        />
                      ))}
                    </div>
                    <span style={{ color: strengthColor[strength] }}>{strengthLabel[strength]}</span>
                  </div>
                )}
              </div>

              {/* 确认密码 */}
              <div className="header-pwd-field">
                <label><Lock size={12} />确认新密码</label>
                <div className={`header-pwd-input-wrap ${confirmMatch ? 'match' : ''} ${confirmMismatch ? 'mismatch' : ''}`}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="再次输入新密码"
                    autoComplete="new-password"
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)}>
                    {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                {confirmMismatch && <p className="header-pwd-mismatch">两次密码不一致</p>}
              </div>

              {pwdStatus && <div className={`header-avatar-status ${pwdStatus.type}`}>{pwdStatus.text}</div>}

              <button type="submit" className="cyber-btn success header-pwd-submit" disabled={pwdSaving}>
                <KeyRound size={14} />{pwdSaving ? '保存中...' : '确认修改'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
