import { Router, Request, Response } from 'express';
import db from '../db';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

// 所有管理员路由都需要认证和管理员权限
router.use(authMiddleware, adminMiddleware);

function getLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 今日统计概览
router.get('/stats/today', (_req: Request, res: Response) => {
  const today = getLocalDate();

  const todayCheckins = (db.prepare(
    'SELECT COUNT(DISTINCT user_id) as cnt FROM checkin_records WHERE checkin_date = ?'
  ).get(today) as { cnt: number }).cnt;

  const categoryStats = db.prepare(`
    SELECT category, COUNT(*) as count, SUM(weight) as total_weight
    FROM checkin_records
    WHERE checkin_date = ?
    GROUP BY category
  `).all(today) as { category: string; count: number; total_weight: number }[];

  const totalPointsToday = (db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM point_logs
    WHERE amount > 0 AND created_at LIKE ?
  `).get(`${today}%`) as { total: number }).total;

  res.json({
    date: today,
    todayCheckins,
    categoryStats,
    totalPointsToday,
  });
});

// 月度趋势数据
router.get('/stats/trend', (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const dailyStats = db.prepare(`
    SELECT
      checkin_date,
      COUNT(DISTINCT user_id) as users,
      COUNT(*) as total_checkins,
      SUM(points) as total_points
    FROM checkin_records
    WHERE checkin_date LIKE ?
    GROUP BY checkin_date
    ORDER BY checkin_date
  `).all(`${monthStr}%`);

  const categoryStats = db.prepare(`
    SELECT
      category,
      COUNT(*) as count,
      SUM(weight) as total_weight,
      SUM(points) as total_points
    FROM checkin_records
    WHERE checkin_date LIKE ?
    GROUP BY category
  `).all(`${monthStr}%`);

  res.json({
    year,
    month,
    dailyStats,
    categoryStats,
  });
});

// 总用户数
router.get('/stats/users', (_req: Request, res: Response) => {
  const totalUsers = (db.prepare(
    "SELECT COUNT(*) as cnt FROM users WHERE role = 'resident'"
  ).get() as { cnt: number }).cnt;

  const activeUsers = (db.prepare(
    "SELECT COUNT(DISTINCT user_id) as cnt FROM checkin_records WHERE checkin_date >= date('now', '-7 days', 'localtime')"
  ).get() as { cnt: number }).cnt;

  res.json({ totalUsers, activeUsers });
});

export default router;
