import { useState, useEffect } from 'react';
import { api } from '../api';
import { CATEGORY_MAP } from '../types';

type Tab = 'stats' | 'announcements';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('stats');

  return (
    <div>
      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>数据统计</button>
        <button className={`tab-btn ${tab === 'announcements' ? 'active' : ''}`} onClick={() => setTab('announcements')}>公告管理</button>
      </div>

      {tab === 'stats' && <StatsTab />}
      {tab === 'announcements' && <AnnouncementManageTab />}
    </div>
  );
}

function StatsTab() {
  const [todayStats, setTodayStats] = useState<any>(null);
  const [userStats, setUserStats] = useState<{ totalUsers: number; activeUsers: number } | null>(null);
  const [trendData, setTrendData] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadTrend();
  }, [year, month]);

  const loadStats = async () => {
    try {
      const [today, users, trend] = await Promise.all([
        api.getAdminTodayStats(),
        api.getAdminUserStats(),
        api.getAdminTrend(year, month),
      ]);
      setTodayStats(today);
      setUserStats(users);
      setTrendData(trend);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const loadTrend = async () => {
    try {
      const trend = await api.getAdminTrend(year, month);
      setTrendData(trend);
    } catch { /* ignore */ }
  };

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  if (loading) {
    return <div className="card"><div style={{ textAlign: 'center', padding: 40, color: '#888' }}>加载中...</div></div>;
  }

  const catColors: Record<string, string> = {
    recyclable: '#1976d2',
    kitchen: '#388e3c',
    hazardous: '#c62828',
    other: '#7b1fa2',
  };

  const catNames: Record<string, string> = {
    recyclable: '可回收物',
    kitchen: '厨余垃圾',
    hazardous: '有害垃圾',
    other: '其他垃圾',
  };

  // Calculate max for bar chart
  const dailyMax = trendData?.dailyStats
    ? Math.max(...trendData.dailyStats.map((d: any) => d.users), 1)
    : 1;

  const catMax = trendData?.categoryStats
    ? Math.max(...trendData.categoryStats.map((c: any) => c.total_weight), 1)
    : 1;

  return (
    <div>
      {/* 概览统计 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{todayStats?.todayCheckins || 0}</div>
          <div className="stat-label">今日打卡人数</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{todayStats?.totalPointsToday || 0}</div>
          <div className="stat-label">今日发放积分</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏠</div>
          <div className="stat-value">{userStats?.totalUsers || 0}</div>
          <div className="stat-label">注册居民数</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-value">{userStats?.activeUsers || 0}</div>
          <div className="stat-label">近7天活跃用户</div>
        </div>
      </div>

      {/* 今日分类投放量 */}
      <div className="card">
        <div className="card-title">今日分类投放量</div>
        {todayStats?.categoryStats?.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {todayStats.categoryStats.map((cs: any) => (
              <div key={cs.category} style={{ textAlign: 'center', padding: 16, background: '#f9f9f9', borderRadius: 8 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>
                  {CATEGORY_MAP[cs.category]?.icon || '📦'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>
                  {catNames[cs.category] || cs.category}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: catColors[cs.category] || '#333', marginTop: 4 }}>
                  {cs.count} 次
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  {cs.total_weight?.toFixed(1)} kg
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state"><p>今日暂无打卡数据</p></div>
        )}
      </div>

      {/* 月度趋势图 */}
      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span>月度趋势</span>
          <div className="month-nav" style={{ marginBottom: 0 }}>
            <button onClick={prevMonth}>&lt;</button>
            <span className="month-label">{year}年{month}月</span>
            <button onClick={nextMonth}>&gt;</button>
          </div>
        </div>

        {/* 每日打卡人数柱状图 */}
        <div style={{ marginBottom: 32 }}>
          <h4 style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>每日打卡人数</h4>
          {trendData?.dailyStats?.length > 0 ? (
            <div className="bar-chart">
              {trendData.dailyStats.map((ds: any) => (
                <div key={ds.checkin_date} className="bar-col">
                  <div className="bar-value">{ds.users}</div>
                  <div
                    className="bar"
                    style={{
                      height: `${(ds.users / dailyMax) * 160}px`,
                      background: 'linear-gradient(180deg, #2d8a4e, #4caf50)',
                    }}
                  />
                  <div className="bar-label">{ds.checkin_date.split('-')[2]}日</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state"><p>暂无数据</p></div>
          )}
        </div>

        {/* 分类投放量分布 */}
        <div>
          <h4 style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>分类投放量统计</h4>
          {trendData?.categoryStats?.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {trendData.categoryStats.map((cs: any) => (
                <div key={cs.category} style={{ textAlign: 'center' }}>
                  <div style={{
                    height: `${(cs.total_weight / catMax) * 120 + 20}px`,
                    background: `linear-gradient(180deg, ${catColors[cs.category]}dd, ${catColors[cs.category]}88)`,
                    borderRadius: '8px 8px 0 0',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: 8,
                    color: 'white',
                    fontWeight: 600,
                    fontSize: 13,
                  }}>
                    {cs.total_weight?.toFixed(1)}kg
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>
                    {catNames[cs.category] || cs.category}
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>{cs.count} 次</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state"><p>暂无数据</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

function AnnouncementManageTab() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const data = await api.getAnnouncements();
      setAnnouncements(data.announcements);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    try {
      await api.createAnnouncement(title, content);
      showToast('success', '公告发布成功');
      setShowModal(false);
      setTitle('');
      setContent('');
      loadAnnouncements();
    } catch (err: any) {
      showToast('error', err.message || '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此公告？')) return;
    try {
      await api.deleteAnnouncement(id);
      showToast('success', '公告已删除');
      loadAnnouncements();
    } catch (err: any) {
      showToast('error', err.message || '删除失败');
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div>
      {toast && <div className={`toast toast-${toast.type}`}>{toast.message}</div>}

      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span>📢 公告管理</span>
          <button className="btn-green btn-small" onClick={() => setShowModal(true)}>+ 发布公告</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>加载中...</div>
        ) : announcements.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📢</div>
            <p>暂无公告</p>
          </div>
        ) : (
          announcements.map((ann) => (
            <div key={ann.id} className="announcement-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="ann-title">{ann.title}</div>
                <div className="ann-date">{ann.created_at}</div>
                <div className="ann-content">{ann.content}</div>
              </div>
              <button className="btn-danger" style={{ marginLeft: 16, flexShrink: 0 }} onClick={() => handleDelete(ann.id)}>
                删除
              </button>
            </div>
          ))
        )}
      </div>

      {/* 创建公告弹窗 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>发布公告</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>公告标题</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="请输入公告标题"
                  required
                />
              </div>
              <div className="form-group">
                <label>公告内容</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="请输入公告内容"
                  rows={5}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: 8, resize: 'vertical' }}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }} disabled={submitting}>
                  {submitting ? '发布中...' : '发布'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
