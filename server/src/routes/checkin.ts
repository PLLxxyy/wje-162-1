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

// 计算连续打卡天数（包含补签卡填补的日期）
function getConsecutiveDays(userId: number): number {
  const records = db.prepare(
    "SELECT DISTINCT checkin_date FROM checkin_records WHERE user_id = ? ORDER BY checkin_date DESC"
  ).all(userId) as { checkin_date: string }[];

  const makeUpRecords = db.prepare(
    "SELECT DISTINCT make_up_date FROM make_up_card_records WHERE user_id = ? AND type = 'use' AND make_up_date IS NOT NULL ORDER BY make_up_date DESC"
  ).all(userId) as { make_up_date: string }[];

  const allDates = new Set([
    ...records.map((r) => r.checkin_date),
    ...makeUpRecords.map((r) => r.make_up_date!),
  ]);

  if (allDates.size === 0) return 0;

  const today = getLocalDate();
  let count = 0;
  let checkDate = new Date(today);

  // 如果今天没打卡，从昨天开始检查
  if (!allDates.has(today)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (allDates.has(dateStr)) {
      count++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return count;
}

// 自动使用补签卡填补缺卡日，返回使用的补签卡详情列表
function autoUseMakeUpCards(userId: number): { date: string; used: number } {
  const user = db.prepare('SELECT make_up_cards FROM users WHERE id = ?').get(userId) as { make_up_cards: number };
  let cardsLeft = user.make_up_cards;
  let usedCount = 0;
  let usedDate: string | null = null;

  if (cardsLeft <= 0) {
    return { date: '', used: 0 };
  }

  // 获取所有打卡日期和补签日期
  const records = db.prepare(
    "SELECT DISTINCT checkin_date FROM checkin_records WHERE user_id = ? ORDER BY checkin_date DESC"
  ).all(userId) as { checkin_date: string }[];

  const makeUpRecords = db.prepare(
    "SELECT DISTINCT make_up_date FROM make_up_card_records WHERE user_id = ? AND type = 'use' AND make_up_date IS NOT NULL"
  ).all(userId) as { make_up_date: string }[];

  const allDates = new Set([
    ...records.map((r) => r.checkin_date),
    ...makeUpRecords.map((r) => r.make_up_date!),
  ]);

  if (allDates.size === 0) {
    return { date: '', used: 0 };
  }

  const today = getLocalDate();
  const todayDate = new Date(today);

  // 检查昨天是否缺卡（如果今天没打卡，则检查前天），如果缺卡且再前一天有打卡，就补
  let checkDate = new Date(todayDate);
  // 从昨天开始向前找
  checkDate.setDate(checkDate.getDate() - 1);

  for (let i = 0; i < 7; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (!allDates.has(dateStr)) {
      // 发现一个缺卡日，检查再往前一天是否有打卡
      const prevDate = new Date(checkDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split('T')[0];
      if (allDates.has(prevDateStr)) {
        // 自动补这一天
        usedDate = dateStr;
        usedCount = 1;
        break;
      } else {
        // 如果前一天也没有，不往前找了，因为这不是连续性的缺口，而是已经断开太久
        break;
      }
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }

  if (usedCount > 0 && usedDate) {
    // 消耗补签卡并记录
    db.prepare('UPDATE users SET make_up_cards = make_up_cards - 1 WHERE id = ?').run(userId);
    db.prepare(
      'INSERT INTO make_up_card_records (user_id, type, make_up_date, description) VALUES (?, ?, ?, ?)'
    ).run(userId, 'use', usedDate, `自动补签${usedDate}，连续打卡天数保留`);
    return { date: usedDate, used: usedCount };
  }

  return { date: '', used: 0 };
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

  // 在事务中处理：先尝试自动补签卡填补缺口，再计算连续天数和打卡
  let makeUpResult = { date: '', used: 0 };
  const insertCheckin = db.prepare(
    'INSERT INTO checkin_records (user_id, category, weight, location, points, checkin_date) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertPointLog = db.prepare(
    'INSERT INTO point_logs (user_id, amount, type, description) VALUES (?, ?, ?, ?)'
  );
  const updatePoints = db.prepare('UPDATE users SET points = points + ? WHERE id = ?');

  const transaction = db.transaction(() => {
    // 1. 先自动使用补签卡填补连续性缺口
    makeUpResult = autoUseMakeUpCards(userId);

    // 2. 计算连续打卡奖励（此时补签卡已使用，连续性已衔接
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

    // 3. 插入打卡记录
    insertCheckin.run(userId, category, weight, location, basePoints, today);
    updatePoints.run(totalPoints, userId);
    insertPointLog.run(userId, basePoints, 'checkin', `${today} 垃圾分类打卡(${CATEGORY_NAMES[category]})`);
    if (bonusPoints > 0) {
      insertPointLog.run(userId, bonusPoints, 'bonus', `连续打卡${consecutiveDays + 1}天奖励`);
    }

    return { consecutiveDays, bonusPoints, totalPoints };
  });

  const txResult = transaction();

  const user = db.prepare('SELECT points, make_up_cards FROM users WHERE id = ?').get(userId) as { points: number; make_up_cards: number };

  res.json({
    message: '打卡成功',
    points: txResult.totalPoints,
    basePoints,
    bonusPoints: txResult.bonusPoints,
    consecutiveDays: txResult.consecutiveDays + 1,
    totalPoints: user.points,
    makeUpCards: user.make_up_cards,
    usedMakeUpCard: makeUpResult.used > 0,
    usedMakeUpDate: makeUpResult.date || null,
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

  const user = db.prepare('SELECT make_up_cards FROM users WHERE id = ?').get(userId) as { make_up_cards: number };

  res.json({
    checkedIn: !!record,
    record: record || null,
    consecutiveDays,
    makeUpCards: user.make_up_cards,
  });
});

// 获取补签卡使用记录
router.get('/makeup-cards', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const records = db.prepare(
    'SELECT * FROM make_up_card_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(userId, limit, offset);

  const total = (db.prepare(
    'SELECT COUNT(*) as cnt FROM make_up_card_records WHERE user_id = ?'
  ).get(userId) as { cnt: number }).cnt;

  const user = db.prepare('SELECT make_up_cards FROM users WHERE id = ?').get(userId) as { make_up_cards: number };

  res.json({ records, total, page, limit, remaining: user.make_up_cards });
});

export default router;
