import { useState, useEffect } from 'react';
import { api } from '../api';
import { CATEGORY_MAP, LOCATION_OPTIONS } from '../types';

interface Props {
  onRefreshUser: () => Promise<void>;
}

interface CheckinResult {
  points: number;
  basePoints: number;
  bonusPoints: number;
  consecutiveDays: number;
  totalPoints: number;
}

export default function CheckinPage({ onRefreshUser }: Props) {
  const [category, setCategory] = useState('');
  const [weight, setWeight] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [consecutiveDays, setConsecutiveDays] = useState(0);

  useEffect(() => {
    checkToday();
  }, []);

  const checkToday = async () => {
    try {
      const data = await api.getCheckinToday();
      if (data.checkedIn) {
        setAlreadyCheckedIn(true);
      }
      setConsecutiveDays(data.consecutiveDays);
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!category) {
      setError('请选择垃圾分类类型');
      return;
    }
    if (!weight || parseFloat(weight) <= 0) {
      setError('请填写有效的投放重量');
      return;
    }
    if (!location) {
      setError('请选择投放点');
      return;
    }

    setLoading(true);
    try {
      const data = await api.doCheckin(category, parseFloat(weight), location);
      setResult(data);
      setAlreadyCheckedIn(true);
      setConsecutiveDays(data.consecutiveDays);
      await onRefreshUser();
    } catch (err: any) {
      setError(err.message || '打卡失败');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCategory('');
    setWeight('');
    setLocation('');
    setResult(null);
    setError('');
  };

  // 打卡成功页面
  if (result) {
    return (
      <div className="card">
        <div className="checkin-success">
          <div className="success-icon">🎉</div>
          <h3>打卡成功！</h3>
          <div className="detail">基础积分：+{result.basePoints}</div>
          {result.bonusPoints > 0 && (
            <div className="detail bonus">连续打卡奖励：+{result.bonusPoints}</div>
          )}
          <div className="detail" style={{ fontWeight: 600, fontSize: 18, marginTop: 12 }}>
            本次获得：{result.points} 积分
          </div>
          <div className="detail" style={{ marginTop: 8 }}>
            当前总积分：{result.totalPoints}
          </div>
          <div className="streak-badge active" style={{ marginTop: 16 }}>
            🔥 连续打卡 {result.consecutiveDays} 天
          </div>
          <div style={{ marginTop: 24 }}>
            <button className="btn-primary" style={{ width: 'auto', padding: '10px 40px' }} onClick={resetForm}>
              继续打卡
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 已打卡页面
  if (alreadyCheckedIn) {
    return (
      <div className="card">
        <div className="checkin-success">
          <div className="success-icon">✅</div>
          <h3>今日已打卡</h3>
          <div className="detail">明天再来吧！</div>
          {consecutiveDays > 0 && (
            <div className="streak-badge active" style={{ marginTop: 16 }}>
              🔥 连续打卡 {consecutiveDays} 天
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">📸 垃圾分类打卡</div>

      {error && <div className="error-msg">{error}</div>}

      <form onSubmit={handleSubmit} className="checkin-form">
        <div className="form-group">
          <label>垃圾分类类型</label>
          <div className="category-grid">
            {Object.entries(CATEGORY_MAP).map(([key, val]) => (
              <div
                key={key}
                className={`category-item ${category === key ? 'selected' : ''}`}
                onClick={() => setCategory(key)}
              >
                <div className="cat-icon">{val.icon}</div>
                <div className="cat-name">{val.name}</div>
                <div className="cat-points">
                  {key === 'recyclable' ? '+10分' : key === 'hazardous' ? '+8分' : key === 'kitchen' ? '+5分' : '+3分'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>投放重量 (kg)</label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="100"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="请输入投放重量"
          />
        </div>

        <div className="form-group">
          <label>投放点</label>
          <select value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="">请选择投放点</option>
            {LOCATION_OPTIONS.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? '提交中...' : '确认打卡'}
        </button>
      </form>
    </div>
  );
}
