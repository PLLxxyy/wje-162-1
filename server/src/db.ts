import Database, { type Database as SqliteDatabase } from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(__dirname, '..', 'data.db');

const db: SqliteDatabase = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ========== 建表 ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nickname TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'resident',
    avatar TEXT NOT NULL DEFAULT '',
    points INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS checkin_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    weight REAL NOT NULL,
    location TEXT NOT NULL,
    points INTEGER NOT NULL,
    checkin_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    price INTEGER NOT NULL,
    stock INTEGER NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS exchange_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    points_cost INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS point_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_checkin_user_date ON checkin_records(user_id, checkin_date);
  CREATE INDEX IF NOT EXISTS idx_exchange_user ON exchange_records(user_id);
  CREATE INDEX IF NOT EXISTS idx_point_logs_user ON point_logs(user_id);
`);

// ========== Seed 数据 ==========
const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt;

if (userCount === 0) {
  const hash = bcrypt.hashSync('123456', 10);

  const insertUser = db.prepare(
    'INSERT INTO users (username, password, nickname, role, avatar, points) VALUES (?, ?, ?, ?, ?, ?)'
  );

  insertUser.run('resident', hash, '绿色居民', 'resident', '', 580);
  insertUser.run('admin', hash, '管理员', 'admin', '', 0);

  // 生成更多居民用于排行榜
  const names = [
    '环保达人', '分类先锋', '绿色卫士', '低碳使者', '回收之星',
    '清洁大使', '生态守护', '分类能手', '绿色生活', '环保使者',
    '垃圾克星', '分类小能手', '低碳生活家', '环保小卫士', '绿色行动派',
    '分类高手', '环保先锋', '绿色使者', '低碳达人', '分类达人',
    '环保新星', '绿色先锋', '生态达人', '清洁先锋', '环保行动者',
    '绿色追梦人', '分类小达人', '低碳先锋', '环保践行者', '绿色创想家',
    '环保小达人', '分类小行家', '绿色小能手', '低碳小卫士', '环保小先锋',
    '绿色生活家', '分类行动派', '低碳绿色行', '环保小能人', '绿色小先锋',
  ];

  const today = new Date();

  for (let i = 0; i < names.length; i++) {
    const pts = Math.floor(Math.random() * 400) + 50;
    insertUser.run(`user${i + 3}`, hash, names[i], 'resident', '', pts);

    const userId = i + 3;
    const checkinCount = Math.floor(Math.random() * 15) + 3;
    const categories = ['recyclable', 'kitchen', 'hazardous', 'other'] as const;
    const locations = ['A区投放点', 'B区投放点', 'C区投放点', '社区中心投放点'];

    const insertCheckin = db.prepare(
      'INSERT INTO checkin_records (user_id, category, weight, location, points, checkin_date) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insertPointLog = db.prepare(
      'INSERT INTO point_logs (user_id, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?)'
    );

    for (let j = 0; j < checkinCount; j++) {
      const d = new Date(today);
      d.setDate(d.getDate() - j);
      const dateStr = d.toISOString().split('T')[0];
      const cat = categories[j % 4];
      const weight = Math.round((Math.random() * 5 + 0.5) * 10) / 10;
      const loc = locations[j % locations.length];
      const ptsMap = { recyclable: 10, kitchen: 5, hazardous: 8, other: 3 };
      const earnedPts = ptsMap[cat];

      insertCheckin.run(userId, cat, weight, loc, earnedPts, dateStr);
      insertPointLog.run(userId, earnedPts, 'checkin', `${dateStr} 垃圾分类打卡`, dateStr);
    }
  }

  // Seed 商品
  const insertProduct = db.prepare(
    'INSERT INTO products (name, description, image, price, stock) VALUES (?, ?, ?, ?, ?)'
  );
  insertProduct.run('家用垃圾袋(卷)', '加厚环保垃圾袋，50只/卷', '', 30, 200);
  insertProduct.run('分类垃圾桶(个)', '四色分类垃圾桶，容量10L', '', 120, 50);
  insertProduct.run('洗手液(瓶)', '抑菌洗手液500ml', '', 50, 100);
  insertProduct.run('肥皂(块)', '植物精华洗衣皂250g', '', 20, 300);
  insertProduct.run('洗洁精(瓶)', '柠檬洗洁精500ml', '', 40, 150);
  insertProduct.run('垃圾袋收纳盒', '壁挂式垃圾袋收纳盒', '', 80, 80);
  insertProduct.run('环保购物袋', '可折叠环保帆布袋', '', 60, 120);
  insertProduct.run('消毒液(瓶)', '84消毒液1000ml', '', 45, 90);
  insertProduct.run('分类指南手册', '图文并茂垃圾分类指南', '', 15, 500);
  insertProduct.run('小盆栽(个)', '绿萝小盆栽净化空气', '', 100, 30);

  // Seed 公告
  const insertAnnouncement = db.prepare(
    'INSERT INTO announcements (title, content) VALUES (?, ?)'
  );
  insertAnnouncement.run(
    '关于调整垃圾分类投放时间的通知',
    '各位居民朋友：为提高垃圾分类效率，自即日起，社区垃圾投放时间调整为每日 7:00-9:00 和 18:00-20:00，请大家合理安排时间。感谢配合！'
  );
  insertAnnouncement.run(
    '积分商城上新啦',
    '本月积分商城新增多款生活用品，包括环保购物袋、小盆栽等，欢迎大家用积分兑换！数量有限，先到先得。'
  );
  insertAnnouncement.run(
    '社区垃圾分类知识讲座',
    '本周六下午2点，社区活动中心将举办垃圾分类知识讲座，参与居民可获得50积分奖励，欢迎报名参加！'
  );

  console.log('Seed data inserted successfully');
}

export default db;
