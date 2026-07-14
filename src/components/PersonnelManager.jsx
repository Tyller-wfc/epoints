import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, Phone, Plus, RotateCcw, Save, Trash2, UserRoundCog, Users } from 'lucide-react';

const availabilityLabels = { Available: '可用', Busy: '忙碌', Leave: '休假' };
const toForm = (person) => ({ name: person.name, avatar: person.avatar, username: person.username || '', password: '', phone: person.phone || '', enabled: person.enabled, availability: person.availability, roles: person.roles.map((item) => ({ roleId: item.roleId, isPrimary: item.isPrimary, level: item.level })) });

export default function PersonnelManager({ roles, onLoadPersonnel, onUpdatePersonnel, onCreatePersonnel, onDeletePersonnel, onUpdatePersonnelAvatar, onResetPersonnelAvatar }) {
  const [personnel, setPersonnel] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const avatarInputRef = useRef(null);
  const creating = selectedId === 'new';

  useEffect(() => { onLoadPersonnel().then((items) => { setPersonnel(items); if (items[0]) { setSelectedId(items[0].id); setForm(toForm(items[0])); } }).catch((error) => setStatus({ type: 'error', text: error.message })); }, [onLoadPersonnel]);
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);

  const select = (person) => {
    setSelectedId(person.id);
    setStatus(null);
    setAvatarFile(null);
    setAvatarPreview('');
    setForm(toForm(person));
  };

  const beginCreate = () => {
    setSelectedId('new');
    setStatus(null);
    setAvatarFile(null);
    setAvatarPreview('');
    setForm({ name: '', avatar: '/avatars/dev.png', username: '', password: '', phone: '', enabled: true, availability: 'Available', roles: roles[0] ? [{ roleId: roles[0].id, isPrimary: true, level: 2 }] : [] });
  };

  const chooseAvatar = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) return setStatus({ type: 'error', text: '头像仅支持 JPG、PNG、WebP 或 GIF 图片' });
    if (file.size > 5 * 1024 * 1024) return setStatus({ type: 'error', text: '头像文件不能超过 5 MB' });
    setStatus(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const toggleRole = (roleId) => {
    setForm((current) => {
      const exists = current.roles.find((item) => item.roleId === roleId);
      if (exists) {
        const remaining = current.roles.filter((item) => item.roleId !== roleId);
        if (exists.isPrimary && remaining.length) remaining[0] = { ...remaining[0], isPrimary: true };
        return { ...current, roles: remaining };
      }
      return { ...current, roles: [...current.roles, { roleId, level: 2, isPrimary: current.roles.length === 0 }] };
    });
  };

  const updateRole = (roleId, patch) => setForm((current) => ({ ...current, roles: current.roles.map((item) => ({ ...item, isPrimary: patch.isPrimary ? false : item.isPrimary, ...(item.roleId === roleId ? patch : {}) })) }));

  const save = async () => {
    setSaving(true); setStatus(null);
    try {
      let updated = creating ? await onCreatePersonnel(form) : await onUpdatePersonnel(selectedId, form);
      setPersonnel(updated);
      let selected = creating ? updated.find((item) => item.username === form.username) : updated.find((item) => item.id === selectedId);
      if (avatarFile && selected) {
        updated = await onUpdatePersonnelAvatar(selected.id, avatarFile);
        setPersonnel(updated);
        selected = updated.find((item) => item.id === selected.id);
      }
      if (selected) select(selected);
      setStatus({ type: 'success', text: creating ? '新成员及登录账号已创建' : '成员信息已保存' });
    } catch (error) { setStatus({ type: 'error', text: error.message }); }
    finally { setSaving(false); }
  };

  if (!form) return <div className="glass-panel personnel-panel">正在加载成员信息...</div>;
  return <section className="glass-panel personnel-panel">
    <div className="personnel-heading"><div><Users size={18} /><span><strong>人员与角色管理</strong><small>姓名、登录账号、企业微信手机号和技术角色</small></span></div><div><span className="badge cyan">{personnel.length} 人</span><button type="button" className="cyber-btn" onClick={beginCreate} style={{ padding: '6px 10px', fontSize: '.7rem' }}><Plus size={14} />新增人员</button></div></div>
    <div className="personnel-layout">
      <div className="personnel-list">
        {personnel.map((person) => <button type="button" key={person.id} className={selectedId === person.id ? 'active' : ''} onClick={() => select(person)}>
          <img src={person.avatar} alt="" /><span><strong>{person.name}</strong><small>{person.roles.find((item) => item.isPrimary)?.role?.name || '未设置角色'}</small></span>{selectedId === person.id && <Check size={15} />}
        </button>)}
        {creating && <button type="button" className="active"><span><strong>新成员</strong><small>填写账号及角色信息</small></span><Check size={15} /></button>}
      </div>
      <div className="personnel-editor">
        <div className="avatar-editor">
          <img src={avatarPreview || form.avatar} alt={`${form.name || '成员'}头像预览`} />
          <div><strong>{avatarFile ? '新头像待保存' : '人员头像'}</strong><small>支持 JPG、PNG、WebP、GIF，最大 5 MB</small><span><button type="button" className="cyber-btn" onClick={() => avatarInputRef.current?.click()}><Camera size={15} />{avatarFile || form.avatar?.includes('/api/personnel/') ? '更换头像' : '选择头像'}</button>{!creating && form.avatar?.includes('/api/personnel/') && <button type="button" className="cyber-btn" disabled={saving} onClick={async () => { setSaving(true); setStatus(null); try { const updated = await onResetPersonnelAvatar(selectedId); setPersonnel(updated); const selected = updated.find((item) => item.id === selectedId); if (selected) select(selected); setStatus({ type: 'success', text: '已恢复默认头像' }); } catch (error) { setStatus({ type: 'error', text: error.message }); } finally { setSaving(false); } }}><RotateCcw size={15} />恢复默认</button>}</span></div>
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => { chooseAvatar(event.target.files?.[0]); event.target.value = ''; }} />
        </div>
        <div className="personnel-fields">
          <label>姓名<input className="cyber-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>登录账号<input className="cyber-input" value={form.username} disabled={!creating} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="例如 wangwu" /></label>
          {creating && <label>初始密码<input type="password" className="cyber-input" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="至少 6 位" /></label>}
          <label>企业微信手机号<div className="input-with-icon"><Phone size={15} /><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="13800138000" /></div></label>
          <label>状态<select className="cyber-select" value={form.availability} onChange={(event) => setForm({ ...form, availability: event.target.value })}>{Object.entries(availabilityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        </div>
        <div className="role-editor-title"><UserRoundCog size={16} />技术角色与能力等级</div>
        <div className="role-editor-grid">
          {roles.map((role) => {
            const assignment = form.roles.find((item) => item.roleId === role.id);
            return <div className={`role-editor-item ${assignment ? 'selected' : ''}`} key={role.id}>
              <label><input type="checkbox" checked={Boolean(assignment)} onChange={() => toggleRole(role.id)} /><span><strong>{role.name}</strong><small>{role.description}</small></span></label>
              {assignment && <div><button type="button" className={assignment.isPrimary ? 'primary' : ''} onClick={() => updateRole(role.id, { isPrimary: true })}>{assignment.isPrimary ? '主角色' : '设为主角色'}</button><select value={assignment.level} onChange={(event) => updateRole(role.id, { level: Number(event.target.value) })}>{[1,2,3,4].map(level => <option value={level} key={level}>L{level}</option>)}</select></div>}
            </div>;
          })}
        </div>
        <div className="personnel-actions"><label><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />启用该成员</label><div>{!creating && selectedId !== 'u-2' && <button type="button" className="cyber-btn danger" disabled={saving} onClick={async () => { if (!window.confirm(`确定删除成员“${form.name}”吗？历史业务记录将转交王方超。`)) return; setSaving(true); try { const updated = await onDeletePersonnel(selectedId); setPersonnel(updated); if (updated[0]) select(updated[0]); setStatus({ type: 'success', text: '成员已删除' }); } catch (error) { setStatus({ type: 'error', text: error.message }); } finally { setSaving(false); } }}><Trash2 size={15} />删除人员</button>}<button type="button" className="cyber-btn success" disabled={saving} onClick={save}><Save size={15} />{saving ? '保存中...' : creating ? '创建人员' : '保存成员信息'}</button></div></div>
        {status && <div className={`personnel-status ${status.type}`}>{status.text}</div>}
      </div>
    </div>
  </section>;
}
