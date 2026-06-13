import { useState, useEffect } from 'react';
import { api } from '../api';
import { RankingItem } from '../types';

export default function RankingPage() {
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRanking();
  }, []);

  const loadRanking = async () => {
    try {
      const data = await api.getRanking();
      setRankings(data.rankings);
    } catch { /* ignore */ }
    setLoading(false);
  };

  if (loading) {
    return <div className="card"><div style={{ textAlign: 'center', padding: 40, color: '#888' }}>加载中...</div></div>;
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">🏆 本月积分排行榜</div>

        {rankings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏆</div>
            <p>暂无排行数据</p>
          </div>
        ) : (
          <ul className="ranking-list">
            {rankings.map((item) => (
              <li key={item.id} className="ranking-item">
                <div className={`rank ${item.rank === 1 ? 'top1' : item.rank === 2 ? 'top2' : item.rank === 3 ? 'top3' : 'normal'}`}>
                  {item.rank}
                </div>
                <div className="user-info">
                  <div className="name">{item.nickname}</div>
                  <div className="streak">
                    本月打卡 {item.checkin_days} 天 | 连续打卡 {item.consecutive_days} 天
                  </div>
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
