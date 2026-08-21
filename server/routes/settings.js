import express from 'express';
import { store } from '../store.js';
import { buildTransporter } from '../services/emailService.js';
import { requireAuth } from '../middleware.js';

const router = express.Router();
router.use(requireAuth);

const DEFAULT_SETTINGS = {
  smtp: { host: '', port: 587, user: '', pass: '', secure: false, fromName: '', fromEmail: '' },
  testMode: true,
};

router.get('/', async (req, res) => {
  const s = await store.getSetting(req.userId);
  if (!s) {
    await store.saveSetting(req.userId, DEFAULT_SETTINGS);
    return res.json(DEFAULT_SETTINGS);
  }
  res.json({
    smtp: {
      host: s.smtp?.host || '',
      port: s.smtp?.port || 587,
      user: s.smtp?.user || '',
      pass: s.smtp?.pass || '',
      secure: s.smtp?.secure || false,
      fromName: s.smtp?.fromName || '',
      fromEmail: s.smtp?.fromEmail || '',
    },
    testMode: s.testMode !== false,
  });
});

router.post('/', async (req, res) => {
  const { smtp, testMode } = req.body;
  const saved = await store.saveSetting(req.userId, {
    smtp: {
      host: smtp?.host || '',
      port: Number(smtp?.port) || 587,
      user: smtp?.user || '',
      pass: smtp?.pass || '',
      secure: !!smtp?.secure,
      fromName: smtp?.fromName || '',
      fromEmail: smtp?.fromEmail || '',
    },
    testMode: testMode !== false,
  });
  res.json(saved);
});

router.post('/test', async (req, res) => {
  const { smtp } = req.body;
  if (!smtp?.host) return res.json({ ok: false, message: 'SMTP host is not configured' });
  try {
    buildTransporter({ smtp });
    res.json({ ok: true, message: 'SMTP connection settings look good' });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

export default router;