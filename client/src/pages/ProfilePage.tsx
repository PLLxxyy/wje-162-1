import { useState, useEffect } from 'react';
import { api } from '../api';
import { User, CheckinRecord, PointLog, ExchangeRecord, Announcement, CATEGORY_MAP, MakeUpCardRecord } from '../types';

interface Props {
  user: User;
}

type Tab = 'records' | 'points' | 'exchange' | 'makeup' | 'announcements';

const TAG_CLASS: Record<string, string> = {
  recyclable: 'tag tag-recyclable',
  kitchen: 'tag tag-kitchen',
  hazardous: 'tag tag-hazardous',
  other: 'tag tag-other',
  checkin: 'tag tag-checkin',
  bonus: 'tag tag-bonus',
  exchange: 'tag tag-exchange',
  obtain: 'tag tag-bonus',
  use: 'tag tag-exchange',
};

export default function ProfilePage({ user }: Props) {
  const [tab, setTab] = useState<Tab>('records');

  return (
    <div>
      {/* 用户信息卡片 */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg, #2d8a4e, #1a6b35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, color: 'white', fontWeight: 700,
        }}>
          {user.nickname.charAt(0)}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#333' }}>{user.nickname}</div>
          <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
            @{user.username} | {user.role === 'admin' ? '管理员' : '居民'}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#2d8a4e' }}>{user.points}</div>
            <div style={{ fontSize: 13, color: '#888' }}>当前积分</div>
          </div>
          <div style={{ borderTop: '1px dashed #eee', paddingTop: 6 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#ff9800' }}>
              🎫 {user.make_up_cards || 0}
            </div>
            <div style={{ fontSize: 13, color: '#888' }}>补签卡</div>
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'records' ? 'active' : ''}`} onClick={() => setTab('records')}>打卡记录</button>
        <button className={`tab-btn ${tab === 'points' ? 'active' : ''}`} onClick={() => setTab('points')}>积分明细</button>
        <button className={`tab-btn ${tab === 'exchange' ? 'active' : ''}`} onClick={() => setTab('exchange')}>兑换记录</button>
        <button className={`tab-btn ${tab === 'makeup' ? 'active' : ''}`} onClick={() => setTab('makeup')}>补签卡</button>
        <button className={`tab-btn ${tab === 'announcements' ? 'active' : ''}`} onClick={() => setTab('announcements')}>社区公告</button>
      </div>

      {tab === 'records' && <CheckinRecordsTab />}
      {tab === 'points' && <PointLogsTab />}
      {tab === 'exchange' && <ExchangeRecordsTab />}
      {tab === 'makeup' && <MakeUpCardsTab />}
      {tab === 'announcements' && <AnnouncementsTab />}
    </div>
  );
}

function CheckinRecordsTab() {
  const [records, setRecords] = useState<CheckinRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, [page]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await api.getCheckinRecords(page);
      setRecords(data.records);
      setTotal(data.total);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="card">
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>加载中...</div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p>暂无打卡记录</p>
        </div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>分类</th>
                <th>重量</th>
                <th>投放点</th>
                <th>积分</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{r.checkin_date}</td>
                  <td>
                    <span className={TAG_CLASS[r.category] || 'tag'}>
                      {CATEGORY_MAP[r.category]?.name || r.category}
                    </span>
                  </td>
                  <td>{r.weight} kg</td>
                  <td>{r.location}</td>
                  <td style={{ color: '#2d8a4e', fontWeight: 600 }}>+{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button>
              <span className="page-info">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PointLogsTab() {
  const [logs, setLogs] = useState<PointLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [page]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getPointLogs(page);
      setLogs(data.logs);
      setTotal(data.total);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const totalPages = Math.ceil(total / 20);

  const typeNames: Record<string, string> = { checkin: '打卡', bonus: '奖励', exchange: '兑换' };

  return (
    <div className="card">
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>加载中...</div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p>暂无积分明细</p>
        </div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>类型</th>
                <th>说明</th>
                <th>积分</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.created_at}</td>
                  <td>
                    <span className={TAG_CLASS[log.type] || 'tag'}>
                      {typeNames[log.type] || log.type}
                    </span>
                  </td>
                  <td>{log.description}</td>
                  <td style={{ color: log.amount > 0 ? '#2d8a4e' : '#e74c3c', fontWeight: 600 }}>
                    {log.amount > 0 ? '+' : ''}{log.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button>
              <span className="page-info">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ExchangeRecordsTab() {
  const [records, setRecords] = useState<ExchangeRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, [page]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await api.getExchangeRecords(page);
      setRecords(data.records);
      setTotal(data.total);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="card">
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>加载中...</div>
      ) : records.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🛍️</div>
          <p>暂无兑换记录</p>
        </div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>商品</th>
                <th>消耗积分</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{r.created_at}</td>
                  <td>{r.product_name}</td>
                  <td style={{ color: '#e74c3c', fontWeight: 600 }}>-{r.points_cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button>
              <span className="page-info">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MakeUpCardsTab() {
  const [records, setRecords] = useState<MakeUpCardRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, [page]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await api.getMakeUpCardRecords(page);
      setRecords(data.records);
      setTotal(data.total);
      setRemaining(data.remaining);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const totalPages = Math.ceil(total / 20);

  const typeNames: Record<string, string> = { obtain: '获得', use: '使用' };

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '12px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#ff9800' }}>🎫 {remaining}</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>剩余补签卡</div>
          </div>
          <div style={{ width: 1, height: 40, background: '#eee' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#2d8a4e' }}>
              {records.filter(r => r.type === 'obtain').reduce((acc) => acc + 1, 0) + (page - 1) * 20}
            </div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>累计获得</div>
          </div>
          <div style={{ width: 1, height: 40, background: '#eee' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#e74c3c' }}>
              {records.filter(r => r.type === 'use').reduce((acc) => acc + 1, 0) + (page - 1) * 20}
            </div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>累计使用</div>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>加载中...</div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎫</div>
            <p>暂无补签卡记录</p>
            <p style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
              去积分商城兑换补签卡，连续打卡不断签！
            </p>
          </div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>类型</th>
                  <th>补签日期</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.created_at}</td>
                    <td>
                      <span className={TAG_CLASS[r.type] || 'tag'}>
                        {typeNames[r.type] || r.type}
                      </span>
                    </td>
                    <td style={{ color: r.make_up_date ? '#e74c3c' : '#999' }}>
                      {r.make_up_date || '-'}
                    </td>
                    <td>{r.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="pagination">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button>
                <span className="page-info">{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="card">
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>加载中...</div>
      ) : announcements.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📢</div>
          <p>暂无公告</p>
        </div>
      ) : (
        announcements.map((ann) => (
          <div key={ann.id} className="announcement-item">
            <div className="ann-title">{ann.title}</div>
            <div className="ann-date">{ann.created_at}</div>
            <div className="ann-content">{ann.content}</div>
          </div>
        ))
      )}
    </div>
  );
}
