import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

function getLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 本月积分排行榜 (前50名)
router.get('/', (_req: Request, res: Response) => {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;

  // 计算本月积分
  const rankings = db.prepare(`
    SELECT
      u.id,
      u.nickname,
      u.avatar,
      COALESCE(SUM(pl.amount), 0) as monthly_points,
      COUNT(DISTINCT cr.checkin_date) as checkin_days
    FROM users u
    LEFT JOIN point_logs pl ON u.id = pl.user_id
      AND pl.amount > 0
      AND pl.created_at >= ?
      AND pl.created_at <= ?
    LEFT JOIN checkin_records cr ON u.id = cr.user_id
      AND cr.checkin_date >= ?
      AND cr.checkin_date <= ?
    WHERE u.role = 'resident'
    GROUP BY u.id
    ORDER BY monthly_points DESC
    LIMIT 50
  `).all(monthStart, monthEnd, monthStart, monthEnd);

  // 计算每个用户的连续打卡天数
  const result = rankings.map((row: any, index: number) => {
    const consecutiveDays = getConsecutiveDays(row.id);
    return {
      rank: index + 1,
      id: row.id,
      nickname: row.nickname,
      avatar: row.avatar,
      monthly_points: row.monthly_points,
      checkin_days: row.checkin_days,
      consecutive_days: consecutiveDays,
    };
  });

  res.json({ rankings: result });
});

function getConsecutiveDays(userId: number): number {
  const records = db.prepare(
    "SELECT DISTINCT checkin_date FROM checkin_records WHERE user_id = ? ORDER BY checkin_date DESC"
  ).all(userId) as { checkin_date: string }[];

  if (records.length === 0) return 0;

  const today = getLocalDate();
  const dates = records.map((r) => r.checkin_date);

  let count = 0;
  let checkDate = new Date(today);

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

export default router;
