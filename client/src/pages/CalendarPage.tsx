import { useState, useEffect } from 'react';
import { api } from '../api';
import { CATEGORY_MAP } from '../types';

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [records, setRecords] = useState<any[]>([]);
  const [consecutiveDays, setConsecutiveDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCalendar();
  }, [year, month]);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const data = await api.getCheckinCalendar(year, month);
      setRecords(data.records);
      setConsecutiveDays(data.consecutiveDays);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const prevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  // Build calendar data
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Map date -> record
  const recordMap: Record<string, any> = {};
  records.forEach((r) => {
    recordMap[r.checkin_date] = r;
  });

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const cells: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getCatInfo = (category: string) => CATEGORY_MAP[category] || { name: '', icon: '', color: '#888' };

  return (
    <div>
      <div className="card">
        <div className="card-title">📅 打卡日历</div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="month-nav" style={{ marginBottom: 0 }}>
            <button onClick={prevMonth}>&lt;</button>
            <span className="month-label">{year}年{month}月</span>
            <button onClick={nextMonth}>&gt;</button>
          </div>
          {consecutiveDays > 0 && (
            <div className="streak-badge active">🔥 连续打卡 {consecutiveDays} 天</div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>加载中...</div>
        ) : (
          <div className="calendar-grid">
            {weekDays.map((d) => (
              <div key={d} className="calendar-header-cell">{d}</div>
            ))}
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="calendar-cell empty" />;
              }
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const record = recordMap[dateStr];
              const isToday = dateStr === todayStr;
              const cat = record ? getCatInfo(record.category) : null;

              return (
                <div
                  key={dateStr}
                  className={`calendar-cell ${record ? 'has-record' : 'no-record'} ${isToday ? 'today' : ''}`}
                  title={record ? `${cat?.name} ${record.weight}kg +${record.points}分` : ''}
                >
                  <span className="day-num">{day}</span>
                  {record && (
                    <span className="day-cat" style={{ color: cat?.color }}>
                      {cat?.icon}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="card">
        <div className="card-title">图例</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {Object.entries(CATEGORY_MAP).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{val.icon}</span>
              <span style={{ fontSize: 13, color: '#666' }}>{val.name}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, border: '2px solid #2d8a4e' }} />
            <span style={{ fontSize: 13, color: '#666' }}>今天</span>
          </div>
        </div>
      </div>
    </div>
  );
}
