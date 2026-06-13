const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE}${url}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }

  return data as T;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; user: { id: number; username: string; nickname: string; role: string; points: number; avatar: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ username, password }) }
    ),

  register: (username: string, password: string, nickname: string) =>
    request<{ token: string; user: { id: number; username: string; nickname: string; role: string; points: number; avatar: string } }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ username, password, nickname }) }
    ),

  getMe: () => request<{ user: { id: number; username: string; nickname: string; role: string; points: number; avatar: string } }>('/auth/me'),

  // Checkin
  doCheckin: (category: string, weight: number, location: string) =>
    request<{ message: string; points: number; basePoints: number; bonusPoints: number; consecutiveDays: number; totalPoints: number }>(
      '/checkin',
      { method: 'POST', body: JSON.stringify({ category, weight, location }) }
    ),

  getCheckinToday: () =>
    request<{ checkedIn: boolean; record: any; consecutiveDays: number }>('/checkin/today'),

  getCheckinCalendar: (year: number, month: number) =>
    request<{ records: any[]; consecutiveDays: number; year: number; month: number }>(
      `/checkin/calendar?year=${year}&month=${month}`
    ),

  getCheckinRecords: (page: number = 1) =>
    request<{ records: any[]; total: number; page: number; limit: number }>(`/checkin/records?page=${page}`),

  getPointLogs: (page: number = 1) =>
    request<{ logs: any[]; total: number; page: number; limit: number }>(`/checkin/points?page=${page}`),

  // Shop
  getProducts: () => request<{ products: any[] }>('/shop/products'),

  exchangeProduct: (productId: number) =>
    request<{ message: string; points: number }>('/shop/exchange', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    }),

  getExchangeRecords: (page: number = 1) =>
    request<{ records: any[]; total: number; page: number; limit: number }>(`/shop/records?page=${page}`),

  // Ranking
  getRanking: () => request<{ rankings: any[] }>('/ranking'),

  // Announcements
  getAnnouncements: () => request<{ announcements: any[] }>('/announcements'),

  createAnnouncement: (title: string, content: string) =>
    request<{ message: string; id: number }>('/announcements', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    }),

  deleteAnnouncement: (id: number) =>
    request<{ message: string }>(`/announcements/${id}`, { method: 'DELETE' }),

  // Admin
  getAdminTodayStats: () =>
    request<{ date: string; todayCheckins: number; categoryStats: any[]; totalPointsToday: number }>('/admin/stats/today'),

  getAdminTrend: (year: number, month: number) =>
    request<{ year: number; month: number; dailyStats: any[]; categoryStats: any[] }>(
      `/admin/stats/trend?year=${year}&month=${month}`
    ),

  getAdminUserStats: () => request<{ totalUsers: number; activeUsers: number }>('/admin/stats/users'),
};
