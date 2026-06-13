import { Router, Request, Response } from 'express';
import db from '../db';
import { authMiddleware } from '../middleware/auth';
import { Product } from '../types';

const router = Router();

// 获取商品列表
router.get('/products', (req: Request, res: Response) => {
  const products = db.prepare(
    'SELECT * FROM products WHERE stock > 0 ORDER BY id'
  ).all() as Product[];
  res.json({ products });
});

// 兑换商品
router.post('/exchange', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { productId } = req.body;

  if (!productId) {
    res.status(400).json({ error: '请选择要兑换的商品' });
    return;
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as Product | undefined;
  if (!product) {
    res.status(404).json({ error: '商品不存在' });
    return;
  }

  if (product.stock <= 0) {
    res.status(400).json({ error: '商品已售罄' });
    return;
  }

  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as { points: number };
  if (user.points < product.price) {
    res.status(400).json({ error: `积分不足，需要${product.price}积分，当前${user.points}积分` });
    return;
  }

  const transaction = db.transaction(() => {
    db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(product.price, userId);
    db.prepare('UPDATE products SET stock = stock - 1 WHERE id = ?').run(productId);
    db.prepare(
      'INSERT INTO exchange_records (user_id, product_id, product_name, points_cost) VALUES (?, ?, ?, ?)'
    ).run(userId, productId, product.name, product.price);
    db.prepare(
      'INSERT INTO point_logs (user_id, amount, type, description) VALUES (?, ?, ?, ?)'
    ).run(userId, -product.price, 'exchange', `兑换商品：${product.name}`);
  });

  transaction();

  const updatedUser = db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as { points: number };

  res.json({
    message: `成功兑换「${product.name}」`,
    points: updatedUser.points,
  });
});

// 获取兑换记录
router.get('/records', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  const records = db.prepare(
    'SELECT * FROM exchange_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(userId, limit, offset);

  const total = (db.prepare(
    'SELECT COUNT(*) as cnt FROM exchange_records WHERE user_id = ?'
  ).get(userId) as { cnt: number }).cnt;

  res.json({ records, total, page, limit });
});

export default router;
