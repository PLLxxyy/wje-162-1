import { useState, useEffect } from 'react';
import { api } from '../api';
import { User, Announcement, RankingItem } from '../types';

type Page = 'home' | 'checkin' | 'calendar' | 'ranking' | 'shop' | 'profile' | 'admin';

interface Props {
  user: User;
  onNavigate: (page: Page) => void;
}

export default function HomePage({ user, onNavigate }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentAnn, setCurrentAnn] = useState(0);
  const [todayStatus, setTodayStatus] = useState<{ checkedIn: boolean; consecutiveDays: number } | null>(null);
  const [topRanking, setTopRanking] = useState<RankingItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentAnn((prev) => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  const loadData = async () => {
    try {
      const [annData, todayData, rankData] = await Promise.all([
        api.getAnnouncements(),
        api.getCheckinToday(),
        api.getRanking(),
      ]);
      setAnnouncements(annData.announcements);
      setTodayStatus(todayData);
      setTopRanking(rankData.rankings.slice(0, 10));
    } catch { /* ignore */ }
  };

  return (
    <div>
      {/* 公告轮播 */}
      {announcements.length > 0 && (
        <div className="announcement-carousel">
          <span className="label">公告</span>
          <div className="content">
            <span className="title">{announcements[currentAnn]?.title}</span>
            {' - '}
            {announcements[currentAnn]?.content}
          </div>
        </div>
      )}

      {/* 打卡状态卡片 */}
      <div className="card">
        <div className="card-title">今日打卡状态</div>
        {todayStatus?.checkedIn ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#2d8a4e', marginBottom: 8 }}>今日已打卡</div>
            {todayStatus.consecutiveDays > 0 && (
              <div className="streak-badge active">
                🔥 连续打卡 {todayStatus.consecutiveDays} 天
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
            <div style={{ fontSize: 16, color: '#888', marginBottom: 16 }}>今天还没有打卡，快来记录你的垃圾分类吧</div>
            <button className="btn-primary" style={{ width: 'auto', padding: '10px 40px' }} onClick={() => onNavigate('checkin')}>
              立即打卡
            </button>
          </div>
        )}
      </div>

      {/* 快捷入口 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { icon: '📸', label: '打卡', page: 'checkin' as Page },
          { icon: '📅', label: '日历', page: 'calendar' as Page },
          { icon: '🏆', label: '排行榜', page: 'ranking' as Page },
          { icon: '🛍️', label: '积分商城', page: 'shop' as Page },
        ].map((item) => (
          <div
            key={item.page}
            className="card"
            style={{ textAlign: 'center', cursor: 'pointer', padding: '20px 12px', marginBottom: 0 }}
            onClick={() => onNavigate(item.page)}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>{item.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* 排行榜预览 */}
      <div className="card">
        <div className="card-title" style={{ justifyContent: 'space-between' }}>
          <span>🏆 本月积分排行 TOP 10</span>
          <button className="btn-secondary btn-small" onClick={() => onNavigate('ranking')}>查看全部</button>
        </div>
        {topRanking.length === 0 ? (
          <div className="empty-state">
            <p>暂无排行数据</p>
          </div>
        ) : (
          <ul className="ranking-list">
            {topRanking.map((item) => (
              <li key={item.id} className="ranking-item">
                <div className={`rank ${item.rank === 1 ? 'top1' : item.rank === 2 ? 'top2' : item.rank === 3 ? 'top3' : 'normal'}`}>
                  {item.rank}
                </div>
                <div className="user-info">
                  <div className="name">{item.nickname}</div>
                  <div className="streak">连续打卡 {item.consecutive_days} 天</div>
                </div>
                <div className="points">
                  {item.monthly_points}<span>分</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
