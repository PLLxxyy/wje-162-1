import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db';
import { generateToken, verifyToken } from '../middleware/auth';
import { User } from '../types';

const router = Router();

// 注册
router.post('/register', (req: Request, res: Response) => {
  const { username, password, nickname } = req.body;

  if (!username || !password || !nickname) {
    res.status(400).json({ error: '用户名、密码和昵称不能为空' });
    return;
  }

  if (username.length < 3 || password.length < 6) {
    res.status(400).json({ error: '用户名至少3位，密码至少6位' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(400).json({ error: '用户名已存在' });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)'
  ).run(username, hash, nickname, 'resident');

  const token = generateToken({ userId: Number(result.lastInsertRowid), role: 'resident' });

  res.json({
    message: '注册成功',
    token,
    user: {
      id: Number(result.lastInsertRowid),
      username,
      nickname,
      role: 'resident',
      points: 0,
      avatar: '',
    },
  });
});

// 登录
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
  if (!user) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  if (!bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  const token = generateToken({ userId: user.id, role: user.role as 'resident' | 'admin' });

  res.json({
    message: '登录成功',
    token,
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      role: user.role,
      points: user.points,
      avatar: user.avatar,
    },
  });
});

// 获取当前用户信息
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: '未登录' });
    return;
  }

  try {
    const payload = verifyToken(authHeader.substring(7));
    const user = db.prepare('SELECT id, username, nickname, role, avatar, points, created_at FROM users WHERE id = ?').get(payload.userId) as Omit<User, 'password'> | undefined;
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }
    res.json({ user });
  } catch {
    res.status(401).json({ error: '登录已过期' });
  }
});

export default router;
