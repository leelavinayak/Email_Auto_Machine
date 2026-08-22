import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './services/db.js';
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/uploads.js';
import campaignRoutes from './routes/campaigns.js';
import templateRoutes from './routes/templates.js';
import settingRoutes from './routes/settings.js';
import eventRoutes from './routes/events.js';

process.on('uncaughtException', (err) => {
  console.error('[server] uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled rejection:', reason);
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
const uploadsRoot = process.env.VERCEL === '1' ? path.join('/tmp', 'email-automachine-uploads') : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsRoot));

app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/events', eventRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, db: global.__DB_MODE__ || 'unknown' });
});

let dbPromise;
export const initializeDB = () => {
  if (!dbPromise) dbPromise = connectDB();
  return dbPromise;
};

export default app;

if (process.env.VERCEL !== '1') {
  initializeDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Email Auto Machine API running on http://localhost:${PORT}`);
      console.log(`Database mode: ${global.__DB_MODE__ || 'unknown'}`);
    });
  });
}
