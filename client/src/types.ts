export interface User {
  id: number;
  username: string;
  nickname: string;
  role: 'resident' | 'admin';
  avatar: string;
  points: number;
}

export interface CheckinRecord {
  id: number;
  user_id: number;
  category: 'recyclable' | 'kitchen' | 'hazardous' | 'other';
  weight: number;
  location: string;
  points: number;
  checkin_date: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  image: string;
  price: number;
  stock: number;
}

export interface ExchangeRecord {
  id: number;
  user_id: number;
  product_id: number;
  product_name: string;
  points_cost: number;
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

export interface PointLog {
  id: number;
  user_id: number;
  amount: number;
  type: 'checkin' | 'bonus' | 'exchange';
  description: string;
  created_at: string;
}

export interface RankingItem {
  rank: number;
  id: number;
  nickname: string;
  avatar: string;
  monthly_points: number;
  checkin_days: number;
  consecutive_days: number;
}

export const CATEGORY_MAP: Record<string, { name: string; icon: string; color: string }> = {
  recyclable: { name: '可回收物', icon: '♻️', color: '#1976d2' },
  kitchen: { name: '厨余垃圾', icon: '🥬', color: '#388e3c' },
  hazardous: { name: '有害垃圾', icon: '⚠️', color: '#c62828' },
  other: { name: '其他垃圾', icon: '🗑️', color: '#7b1fa2' },
};

export const LOCATION_OPTIONS = ['A区投放点', 'B区投放点', 'C区投放点', '社区中心投放点', '东门投放点', '西门投放点'];

export const PRODUCT_ICONS: Record<number, string> = {
  1: '🛍️',
  2: '🪣',
  3: '🧴',
  4: '🧼',
  5: '🧽',
  6: '📦',
  7: '👜',
  8: '💧',
  9: '📖',
  10: '🌱',
};
