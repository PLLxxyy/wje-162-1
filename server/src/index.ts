import express from 'express';
import cors from 'cors';
import db from './db';
import authRoutes from './routes/auth';
import checkinRoutes from './routes/checkin';
import shopRoutes from './routes/shop';
import rankingRoutes from './routes/ranking';
import announcementRoutes from './routes/announcement';
import adminRoutes from './routes/admin';

// 确保数据库初始化
db.exec('SELECT 1');

const app = express();
const PORT = Number(process.env.PORT) || 3212;

app.use(cors());
app.use(express.json());

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
