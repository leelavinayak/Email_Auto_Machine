import express from 'express';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { store } from '../store.js';
import { signToken, requireAuth } from '../middleware.js';
import { sendEmail, systemSmtpConfig, otpEmailHtml, welcomeEmailHtml } from '../services/emailService.js';

const router = express.Router();

/* ---------------- Forgot password (OTP) ---------------- */

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const otps = new Map(); // email -> { hash, expiresAt, attempts }

function issueOtp(email) {
  const otp = String(randomInt(0, 1000000)).padStart(6, '0');
  otps.set(String(email).toLowerCase(), {
    hash: bcrypt.hashSync(otp, 4),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
  return otp;
}

function checkOtp(email, otp, { consume = true } = {}) {
  const rec = otps.get(String(email).toLowerCase());
  if (!rec) return { ok: false, message: 'No reset code found for this email. Request a new one.' };
  if (Date.now() > rec.expiresAt) {
    otps.delete(String(email).toLowerCase());
    return { ok: false, message: 'This code has expired. Request a new one.' };
  }
  if (rec.attempts >= OTP_MAX_ATTEMPTS) {
    otps.delete(String(email).toLowerCase());
    return { ok: false, message: 'Too many wrong attempts. Request a new code.' };
  }
  if (!bcrypt.compareSync(String(otp || '').trim(), rec.hash)) {
    rec.attempts += 1;
    return { ok: false, message: 'Invalid code. Please check and try again.' };
  }
  if (consume) otps.delete(String(email).toLowerCase());
  return { ok: true };
}

router.post('/forgot', async (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^\S+@\S+\.\S+$/.test(String(email))) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }
  const user = await store.findUserByEmail(String(email).trim());
  // Always answer the same way so we never reveal whether an account exists.
  if (!user) return res.json({ ok: true });

  const otp = issueOtp(user.email);

  // Prefer the system SMTP (env vars) so the code is actually delivered to the
  // registered inbox; fall back to the user's own SMTP settings if configured.
  const userCfg = (await store.getSetting(user._id)) || { smtp: {}, testMode: true };
  const userSmtp = userCfg.smtp || {};
  const sysCfg = systemSmtpConfig();
  const cfg =
    sysCfg || {
      smtp: userSmtp,
      testMode: userCfg.testMode !== false,
    };
  const simulate = cfg.testMode !== false || !cfg.smtp.host;

  let sentOtp = false;
  if (!simulate) {
    try {
      await sendEmail({
        cfg,
        to: user.email,
        subject: 'Your password reset code',
        html: otpEmailHtml(otp),
        logo: true,
      });
      sentOtp = true;
    } catch (err) {
      console.error('OTP email send failed:', err.message);
    }
  }
  console.log(`[OTP] ${user.email} -> ${otp} ${simulate ? '(simulated: not delivered)' : '(sent via SMTP)'}`);

  // When delivery is simulated (test mode or no SMTP configured), expose the
  // code so the reset flow stays usable.
  res.json({ ok: true, devOtp: simulate ? otp : undefined, sent: sentOtp });
});

router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body || {};
  if (!email || !otp) return res.status(400).json({ error: 'Email and code are required' });
  const r = checkOtp(email, otp, { consume: false });
  if (!r.ok) return res.status(400).json({ error: r.message });
  res.json({ ok: true });
});

router.post('/reset-password', async (req, res) => {
  const { email, otp, password } = req.body || {};
  if (!email || !otp) return res.status(400).json({ error: 'Email and code are required' });
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const r = checkOtp(email, otp);
  if (!r.ok) return res.status(400).json({ error: r.message });
  const user = await store.findUserByEmail(String(email).trim());
  if (!user) return res.status(400).json({ error: 'No account found with this email' });
  const hash = await bcrypt.hash(String(password), 10);
  await store.updateUserPassword(user._id, hash);
  console.log(`[OTP] password reset for ${user.email}`);
  res.json({ ok: true });
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, profession, orgName, orgPhone, designation } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!/^\S+@\S+\.\S+$/.test(String(email))) return res.status(400).json({ error: 'Enter a valid email address' });

    const prof = String(profession || '').trim();
    if (!prof) return res.status(400).json({ error: 'Please select what you plan to use this app for' });
    const orgRequired = prof !== 'personal';
    if (orgRequired && !String(orgName || '').trim()) {
      return res.status(400).json({ error: 'Please enter your organization name' });
    }

    const hash = await bcrypt.hash(String(password), 10);
    const user = await store.createUser({
      name: String(name).trim(),
      email: String(email).trim(),
      password: hash,
      phone: String(phone || '').trim(),
      profession: prof,
      orgName: String(orgName || '').trim(),
      orgPhone: String(orgPhone || '').trim(),
      designation: String(designation || '').trim(),
    });

    // Welcome email — best effort, never blocks registration.
    let welcome = { status: 'simulated' };
    try {
      const sysCfg = systemSmtpConfig();
      const cfg = sysCfg || { smtp: {}, testMode: true };
      const simulated = cfg.testMode !== false;
      await sendEmail({
        cfg,
        to: user.email,
        subject: 'Welcome to Email Auto Machine 🎉',
        html: welcomeEmailHtml(user.name || 'there'),
        logo: true,
      });
      welcome = { status: simulated ? 'simulated' : 'sent' };
      console.log(`[auth] welcome email ${simulated ? '(simulated)' : 'sent'} to ${user.email}`);
    } catch (err) {
      welcome = { status: 'failed', error: err.message };
      console.error('Welcome email failed:', err.message);
    }

    res.status(201).json({ token: signToken(user._id), user: store.staticUser(user), welcome });
  } catch (err) {
    if (err.code === 11000 || /already exists/.test(err.message)) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = await store.findUserByEmail(String(email).trim());
    if (!user) return res.status(401).json({ error: 'No account found with this email' });
    const ok = await store.verifyPassword(user, password);
    if (!ok) return res.status(401).json({ error: 'Incorrect password' });
    res.json({ token: signToken(user._id), user: store.staticUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await store.findUserById(req.userId);
  if (!user) return res.status(401).json({ error: 'Account not found' });
  res.json({ user: store.staticUser(user) });
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, email, phone, profession, orgName, orgPhone, designation } = req.body || {};
    const user = await store.findUserById(req.userId);
    if (!user) return res.status(401).json({ error: 'Account not found' });

    const next = { name: String(name ?? user.name).trim(), email: String(email ?? user.email).trim() };
    if (!next.name) return res.status(400).json({ error: 'Name cannot be empty' });
    if (!/^\S+@\S+\.\S+$/.test(next.email)) return res.status(400).json({ error: 'Enter a valid email address' });
    if (phone !== undefined) next.phone = String(phone).trim();

    const prof = profession !== undefined ? String(profession).trim() : user.profession || '';
    const orgNameVal = orgName !== undefined ? String(orgName).trim() : user.orgName || '';
    if (prof && prof !== 'personal') {
      if (!orgNameVal) return res.status(400).json({ error: 'Please enter your organization name' });
    }
    next.profession = prof;
    next.orgName = orgNameVal;
    if (orgPhone !== undefined) next.orgPhone = String(orgPhone).trim();
    if (designation !== undefined) next.designation = String(designation).trim();

    const updated = await store.updateUser(req.userId, next);
    res.json({ user: store.staticUser(updated) });
  } catch (err) {
    if (err.code === 11000 || /already exists/.test(err.message)) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    console.error('Update profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password are required' });
  if (String(newPassword).length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  const user = await store.findUserById(req.userId);
  if (!user) return res.status(401).json({ error: 'Account not found' });
  const ok = await store.verifyPassword(user, String(currentPassword));
  if (!ok) return res.status(400).json({ error: 'Current password is incorrect' });

  const hash = await bcrypt.hash(String(newPassword), 10);
  await store.updateUserPassword(user._id, hash);
  console.log(`[auth] password changed for ${user.email}`);
  res.json({ ok: true });
});

export default router;
