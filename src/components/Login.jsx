import React, { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, LogIn, ShieldCheck, UserRound } from 'lucide-react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('u2');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err.message || '登录失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="login-mark"><ShieldCheck size={34} /></div>
        <div>
          <span className="login-kicker">EPOINTS ACCESS CONTROL</span>
          <h1>效能协同系统</h1>
          <p>统一管理任务交付、积分激励与技术保障。</p>
        </div>
      </section>

      <section className="login-panel glass-panel">
        <div className="login-panel-title">
          <LockKeyhole size={20} />
          <div><h2>账号登录</h2><span>请输入组织账号以继续</span></div>
        </div>
        <form onSubmit={handleSubmit}>
          <label htmlFor="username">账号</label>
          <div className="login-field"><UserRound size={17} /><input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus /></div>
          <label htmlFor="password">密码</label>
          <div className="login-field"><LockKeyhole size={17} /><input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /><button type="button" onClick={() => setShowPassword(!showPassword)} title={showPassword ? '隐藏密码' : '显示密码'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          {error && <div className="login-error" role="alert">{error}</div>}
          <button className="cyber-btn login-submit" disabled={submitting} type="submit"><LogIn size={17} />{submitting ? '正在验证...' : '登录系统'}</button>
        </form>
        <div className="login-demo"><strong>管理员账号</strong><span>u2</span><span>初始密码 demo123</span></div>
      </section>
    </main>
  );
}
