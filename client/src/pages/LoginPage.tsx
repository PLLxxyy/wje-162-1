import { useState } from 'react';
import { api } from '../api';
import { User } from '../types';

interface Props {
  onLogin: (token: string, user: User) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const data = await api.register(username, password, nickname);
        onLogin(data.token, data.user as User);
      } else {
        const data = await api.login(username, password);
        onLogin(data.token, data.user as User);
      }
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="icon-big">♻️</div>
        <h1>垃圾分类积分打卡</h1>
        <p className="subtitle">共建绿色社区，从分类开始</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label>昵称</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="请输入昵称"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? '处理中...' : isRegister ? '注 册' : '登 录'}
          </button>
        </form>

        <div className="switch-mode">
          {isRegister ? (
            <>已有账号？<a onClick={() => { setIsRegister(false); setError(''); }}>去登录</a></>
          ) : (
            <>没有账号？<a onClick={() => { setIsRegister(true); setError(''); }}>去注册</a></>
          )}
        </div>
      </div>
    </div>
  );
}
