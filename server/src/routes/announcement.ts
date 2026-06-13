import { Router, Request, Response } from 'express';
import db from '../db';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { Announcement } from '../types';

const router = Router();

// 获取公告列表（公开）
router.get('/', (_req: Request, res: Response) => {
  const announcements = db.prepare(
    'SELECT * FROM announcements ORDER BY created_at DESC LIMIT 20'
  ).all() as Announcement[];
  res.json({ announcements });
});

// 发布公告（管理员）
router.post('/', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const { title, content } = req.body;

  if (!title || !content) {
    res.status(400).json({ error: '标题和内容不能为空' });
    return;
  }

  const result = db.prepare(
    'INSERT INTO announcements (title, content) VALUES (?, ?)'
  ).run(title, content);

  res.json({
    message: '公告发布成功',
    id: Number(result.lastInsertRowid),
  });
});

// 删除公告（管理员）
router.delete('/:id', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  res.json({ message: '公告已删除' });
});

export default router;
