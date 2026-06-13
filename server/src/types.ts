export interface User {
  id: number;
  username: string;
  password: string;
  nickname: string;
  role: 'resident' | 'admin';
  avatar: string;
  points: number;
  created_at: string;
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
  created_at: string;
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

export interface JwtPayload {
  userId: number;
  role: 'resident' | 'admin';
}
