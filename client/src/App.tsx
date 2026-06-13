import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { User } from './types';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import CheckinPage from './pages/CheckinPage';
import CalendarPage from './pages/CalendarPage';
import RankingPage from './pages/RankingPage';
import ShopPage from './pages/ShopPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';

type Page = 'home' | 'checkin' | 'calendar' | 'ranking' | 'shop' | 'profile' | 'admin';

const RESIDENT_TABS: { key: Page; label: string }[] = [
  { key: 'home', label: '首页' },
  { key: 'checkin', label: '打卡' },
  { key: 'calendar', label: '日历' },
  { key: 'ranking', label: '排行榜' },
  { key: 'shop', label: '积分商城' },
  { key: 'profile', label: '个人中心' },
];

const ADMIN_TABS: { key: Page; label: string }[] = [
  { key: 'home', label: '首页' },
  { key: 'admin', label: '管理后台' },
  { key: 'profile', label: '个人中心' },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.getMe();
      setUser(data.user as User);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleLogin = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setCurrentPage(userData.role === 'admin' ? 'admin' : 'home');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCurrentPage('home');
  };

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user as User);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ fontSize: 18, color: '#888' }}>加载中...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const tabs = user.role === 'admin' ? ADMIN_TABS : RESIDENT_TABS;

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage user={user} onNavigate={setCurrentPage} />;
      case 'checkin':
        return <CheckinPage onRefreshUser={refreshUser} />;
      case 'calendar':
        return <CalendarPage />;
      case 'ranking':
        return <RankingPage />;
      case 'shop':
        return <ShopPage user={user} onRefreshUser={refreshUser} />;
      case 'profile':
        return <ProfilePage user={user} />;
      case 'admin':
        return <AdminPage />;
      default:
        return <HomePage user={user} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <>
      <header className="app-header">
        <div className="logo">
          <span className="icon">♻️</span>
          <span>垃圾分类积分打卡</span>
        </div>
        <div className="user-info">
          <span className="points-badge">积分: {user.points}</span>
          <span className="nickname">{user.nickname}</span>
          <button className="btn-logout" onClick={handleLogout}>退出</button>
        </div>
      </header>
      <nav className="nav-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-item ${currentPage === tab.key ? 'active' : ''}`}
            onClick={() => setCurrentPage(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <main className="main-content">
        {renderPage()}
      </main>
    </>
  );
}
