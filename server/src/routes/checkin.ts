import { Router, Request, Response } from 'express';
import db from '../db';
import { authMiddleware } from '../middleware/auth';
import { CheckinRecord } from '../types';

const router = Router();

function getLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const POINTS_MAP: Record<string, number> = {
  recyclable: 10,
  kitchen: 5,
  hazardous: 8,
  other: 3,
};

const CATEGORY_NAMES: Record<string, string> = {
  recyclable: '可回收物',
  kitchen: '厨余垃圾',
  hazardous: '有害垃圾',
  other: '其他垃圾',
};

// 计算连续打卡天数
function getConsecutiveDays(userId: number): number {
  const records = db.prepare(
    "SELECT DISTINCT checkin_date FROM checkin_records WHERE user_id = ? ORDER BY checkin_date DESC"
  ).all(userId) as { checkin_date: string }[];

  if (records.length === 0) return 0;

  const today = getLocalDate();
  const dates = records.map((r) => r.checkin_date);

  // 从今天或昨天开始算连续
  let count = 0;
  let checkDate = new Date(today);

  // 如果今天没打卡，从昨天开始检查
  if (!dates.includes(today)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (dates.includes(dateStr)) {
      count++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return count;
}

// 打卡
router.post('/', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { category, weight, location } = req.body;

  if (!category || !weight || !location) {
    res.status(400).json({ error: '请选择分类类型、填写投放重量和选择投放点' });
    return;
  }

  if (!POINTS_MAP[category]) {
    res.status(400).json({ error: '无效的垃圾分类类型' });
    return;
  }

  if (weight <= 0 || weight > 100) {
    res.status(400).json({ error: '投放重量需在0.1-100kg之间' });
    return;
  }

  const today = getLocalDate();

  // 检查今天是否已打卡
  const existing = db.prepare(
    'SELECT id FROM checkin_records WHERE user_id = ? AND checkin_date = ?'
  ).get(userId, today);

  if (existing) {
    res.status(400).json({ error: '今天已经打过卡了，明天再来吧' });
    return;
  }

  const basePoints = POINTS_MAP[category];

  // 计算连续打卡奖励
  const consecutiveDays = getConsecutiveDays(userId);
  let bonusPoints = 0;
  if (consecutiveDays >= 7) {
    bonusPoints = 15;
  } else if (consecutiveDays >= 3) {
    bonusPoints = 5;
  } else if (consecutiveDays >= 2) {
    bonusPoints = 2;
  }

  const totalPoints = basePoints + bonusPoints;

  const insertCheckin = db.prepare(
    'INSERT INTO checkin_records (user_id, category, weight, location, points, checkin_date) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertPointLog = db.prepare(
    'INSERT INTO point_logs (user_id, amount, type, description) VALUES (?, ?, ?, ?)'
  );
  const updatePoints = db.prepare('UPDATE users SET points = points + ? WHERE id = ?');

  const transaction = db.transaction(() => {
    const result = insertCheckin.run(userId, category, weight, location, basePoints, today);
    updatePoints.run(totalPoints, userId);
    insertPointLog.run(userId, basePoints, 'checkin', `${today} 垃圾分类打卡(${CATEGORY_NAMES[category]})`);
    if (bonusPoints > 0) {
      insertPointLog.run(userId, bonusPoints, 'bonus', `连续打卡${consecutiveDays + 1}天奖励`);
    }
    return result;
  });

  transaction();

  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as { points: number };

  res.json({
    message: '打卡成功',
    points: totalPoints,
    basePoints,
    bonusPoints,
    consecutiveDays: consecutiveDays + 1,
    totalPoints: user.points,
  });
});

// 获取打卡日历数据
router.get('/calendar', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { year, month } = req.query;

  const y = parseInt(year as string) || new Date().getFullYear();
  const m = parseInt(month as string) || new Date().getMonth() + 1;
  const monthStr = `${y}-${String(m).padStart(2, '0')}`;

  const records = db.prepare(
    "SELECT checkin_date, category, weight, location, points FROM checkin_records WHERE user_id = ? AND checkin_date LIKE ? ORDER BY checkin_date"
  ).all(userId, `${monthStr}%`) as CheckinRecord[];

  const consecutiveDays = getConsecutiveDays(userId);

  res.json({
    records,
    consecutiveDays,
    year: y,
    month: m,
  });
});

// 获取个人打卡记录列表
router.get('/records', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const records = db.prepare(
    "SELECT * FROM checkin_records WHERE user_id = ? ORDER BY checkin_date DESC LIMIT ? OFFSET ?"
  ).all(userId, limit, offset) as CheckinRecord[];

  const total = (db.prepare(
    'SELECT COUNT(*) as cnt FROM checkin_records WHERE user_id = ?'
  ).get(userId) as { cnt: number }).cnt;

  res.json({ records, total, page, limit });
});

// 获取积分明细
router.get('/points', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const logs = db.prepare(
    'SELECT * FROM point_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(userId, limit, offset);

  const total = (db.prepare(
    'SELECT COUNT(*) as cnt FROM point_logs WHERE user_id = ?'
  ).get(userId) as { cnt: number }).cnt;

  res.json({ logs, total, page, limit });
});

// 检查今天是否已打卡
router.get('/today', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const today = getLocalDate();

  const record = db.prepare(
    'SELECT * FROM checkin_records WHERE user_id = ? AND checkin_date = ?'
  ).get(userId, today);

  const consecutiveDays = getConsecutiveDays(userId);

  res.json({
    checkedIn: !!record,
    record: record || null,
    consecutiveDays,
  });
});

export default router;
