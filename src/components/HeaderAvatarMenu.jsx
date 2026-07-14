import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, RotateCcw, Upload, X } from 'lucide-react';

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function HeaderAvatarMenu({ user, onUpload, onReset }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('mousedown', closeOnOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [open]);

  const selectFile = (nextFile) => {
    if (!nextFile) return;
    if (!allowedTypes.includes(nextFile.type)) return setStatus({ type: 'error', text: '仅支持 JPG、PNG、WebP 或 GIF' });
    if (nextFile.size > 5 * 1024 * 1024) return setStatus({ type: 'error', text: '头像不能超过 5 MB' });
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    setStatus(null);
  };

  const save = async () => {
    if (!file) return inputRef.current?.click();
    setSaving(true); setStatus(null);
    try {
      await onUpload(user.id, file);
      setFile(null); setPreview('');
      setStatus({ type: 'success', text: '头像已更新' });
    } catch (error) { setStatus({ type: 'error', text: error.message }); }
    finally { setSaving(false); }
  };

  const reset = async () => {
    setSaving(true); setStatus(null);
    try {
      await onReset(user.id);
      setFile(null); setPreview('');
      setStatus({ type: 'success', text: '已恢复默认头像' });
    } catch (error) { setStatus({ type: 'error', text: error.message }); }
    finally { setSaving(false); }
  };

  return <div className="header-avatar-menu" ref={rootRef}>
    <button type="button" className="header-avatar-trigger" title="更换头像" aria-label="更换头像" aria-expanded={open} onClick={() => { setOpen((value) => !value); setStatus(null); }}>
      <img src={user.avatar} alt={user.name} /><span><Camera size={12} /></span>
    </button>
    {open && <div className="header-avatar-popover">
      <div className="header-avatar-title"><span><strong>个人头像</strong><small>JPG / PNG / WebP / GIF · 5 MB</small></span><button type="button" title="关闭" onClick={() => setOpen(false)}><X size={16} /></button></div>
      <button type="button" className="header-avatar-preview" onClick={() => inputRef.current?.click()} title="选择头像">
        <img src={preview || user.avatar} alt="头像预览" /><span><Camera size={17} /></span>
      </button>
      <input ref={inputRef} type="file" hidden accept={allowedTypes.join(',')} onChange={(event) => { selectFile(event.target.files?.[0]); event.target.value = ''; }} />
      {file && <div className="header-avatar-file"><Check size={14} /><span title={file.name}>{file.name}</span></div>}
      {status && <div className={`header-avatar-status ${status.type}`}>{status.text}</div>}
      <div className="header-avatar-actions">
        {user.avatar.includes('/api/personnel/') && <button type="button" className="cyber-btn" disabled={saving} onClick={reset}><RotateCcw size={14} />恢复默认</button>}
        <button type="button" className="cyber-btn success" disabled={saving} onClick={save}><Upload size={14} />{saving ? '保存中...' : file ? '保存头像' : '选择头像'}</button>
      </div>
    </div>}
  </div>;
}
