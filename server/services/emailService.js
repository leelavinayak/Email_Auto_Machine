import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function encodeSvg(s) {
  return encodeURIComponent(s).replace(/'/g, '%27');
}

export function borderTiles(style, color) {
  const path =
    style === 'zigzag' ? 'M0 12 L 8 4 L 16 20 L 24 12' : 'M0 12 Q 6 0 12 12 T 24 12';
  const h = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none'><path d='${path}' stroke='${color}' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
  const v = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none'><g transform='rotate(90 12 12)'><path d='${path}' stroke='${color}' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/></g></svg>`;
  return { h: `data:image/svg+xml,${encodeSvg(h)}`, v: `data:image/svg+xml,${encodeSvg(v)}` };
}

export function borderCssFor(d) {
  if (!d || d.enabled === false) return '';
  const hasDesign = Object.keys(d).some((k) => d[k] !== undefined && d[k] !== null && d[k] !== '');
  if (!hasDesign) return '';
  const thickness = Math.min(Math.max(Number(d.thickness) || 3, 1), 16);
  const color = d.color || '#0058be';
  const style = d.style || 'solid';
  if (style === 'wave' || style === 'zigzag') {
    const tiles = borderTiles(style, color);
    const band = Math.min(6 + thickness * 2, 32);
    return `border:1px solid ${color};background-image:url('${tiles.h}'),url('${tiles.h}'),url('${tiles.v}'),url('${tiles.v}');background-size:24px ${band}px,24px ${band}px,${band}px 24px,${band}px 24px;background-position:top center,bottom center,left center,right center;background-repeat:repeat-x,repeat-x,repeat-y,repeat-y;`;
  }
  const nativeStyles = ['solid', 'dashed', 'dotted', 'double'];
  const borderStyle = nativeStyles.includes(style) ? style : 'solid';
  return `border:${thickness}px ${borderStyle} ${color};`;
}

export function buildHtml({ body, posterImage, posterPosition = 'top', design }) {
  const lines = String(body || '').replace(/\r?\n/g, '<br/>');
  const d = design || {};
  const radius = Math.min(Math.max(Number(d.radius) || 0, 0), 48);
  const padding = Math.min(Math.max(Number(d.padding) || 24, 8), 64);
  const bg = d.bgColor || '#ffffff';
  const textColor = d.textColor || '#191c1e';
  const innerStyle = `border-radius:${radius}px;padding:${padding}px;background-color:${bg};color:${textColor};`;
  const borderCss = borderCssFor(d);
  const poster = posterImage
    ? `<div style="text-align:center;padding:${posterPosition === 'bottom' ? '16px 0 0' : '0 0 16px'};"><img src="cid:poster" alt="Poster" style="width:100%;max-width:560px;border-radius:${Math.min(radius, 24) || 12}px;display:block;margin:0 auto;"/></div>`
    : '';
  const content = `<div style="font-family:Arial,Helvetica,sans-serif;"><p style="margin:0;">${lines || ' '}</p></div>`;
  const inner = poster ? (posterPosition === 'bottom' ? content + poster : poster + content) : content;
  return `<div style="background:#eef2f7;padding:28px 16px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="${innerStyle}${borderCss}">${inner}</div>
  </div>
</div>`;
}

export function substituteVariables(text, data) {
  if (!text) return text;
  return String(text).replace(/\{\{\s*([\w\s.-]+)\s*\}\}/g, (m, key) => {
    const v = data && data[key.trim()] !== undefined ? data[key.trim()] : m;
    return v;
  });
}

/* ---------------- Premium transactional email templates ---------------- */

export const EMAIL_LOGO_PATH = path.join(__dirname, '..', 'uploads', 'images', 'Email_Auto_Machine_Logo.png');

export function emailShell({ title, subtitle, bodyHtml, ctaLabel, ctaUrl, footer, showLogo = true }) {
  const cta =
    ctaLabel && ctaUrl
      ? `<div style="padding:2px 30px 28px;text-align:center;">
          <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#2170e4,#0058be);color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;padding:13px 32px;border-radius:10px;box-shadow:0 4px 14px rgba(0,88,190,0.35);">${ctaLabel}</a>
        </div>`
      : '';
  const brand =
    showLogo
      ? `<img src="cid:logo" alt="Email Auto Machine" width="72" height="72" style="width:72px;height:72px;border-radius:18px;object-fit:cover;box-shadow:0 4px 12px rgba(0,88,190,0.28);"/>
    <div style="margin-top:9px;font-size:15px;font-weight:700;color:#0b1c30;letter-spacing:.2px;">Email Auto Machine</div>`
      : `<div style="display:inline-block;width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,#2170e4,#0058be);color:#ffffff;font-size:22px;line-height:46px;text-align:center;box-shadow:0 4px 12px rgba(0,88,190,0.3);">&#128231;</div>
    <div style="margin-top:9px;font-size:15px;font-weight:700;color:#0b1c30;letter-spacing:.2px;">Email Auto Machine</div>`;
  return `<div style="background:#eef2f7;padding:30px 16px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:18px;">
      ${brand}
    </div>
    <div style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 34px rgba(11,28,48,0.10);">
      <div style="background:linear-gradient(135deg,#0b1c30 0%,#0f2c55 55%,#0058be 100%);padding:30px 30px 24px;color:#ffffff;">
        <div style="font-size:21px;font-weight:700;letter-spacing:.2px;">${title}</div>
        ${subtitle ? `<div style="font-size:13px;opacity:.85;margin-top:6px;line-height:1.5;">${subtitle}</div>` : ''}
      </div>
      <div style="padding:28px 30px 20px;color:#1a2433;font-size:15px;line-height:1.7;">${bodyHtml}</div>
      ${cta}
    </div>
    <div style="text-align:center;color:#8a93a6;font-size:12px;line-height:1.65;margin-top:18px;">
      ${footer || 'You received this email because you have an account with Email Auto Machine.'}
      <br/>If you have questions, just reply to this email.
    </div>
  </div>
</div>`;
}

export function otpEmailHtml(otp) {
  return emailShell({
    showLogo: true,
    title: 'Your password reset code',
    subtitle: 'One-time verification — valid for 10 minutes',
    bodyHtml: `<p style="margin:0 0 14px;">You asked to reset the password for your <strong>Email Auto Machine</strong> account. Use this one-time code to continue:</p>
<div style="margin:0 0 18px;background:#f4f7fc;border:1.5px dashed #0058be;border-radius:14px;padding:18px;text-align:center;">
  <div style="font-family:'Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:10px;color:#0058be;">${otp}</div>
</div>
<p style="margin:0;font-size:13px;color:#45464d;">The code expires in <strong>10 minutes</strong>. If you did not request this, you can safely ignore this email — your password will stay unchanged.</p>`,
  });
}

export function welcomeEmailHtml(name) {
  const steps = [
    ['&#128195;', 'Upload your list', 'Add a .csv or .xlsx with an Email column — every row becomes a personalized message.'],
    ['&#9993;&#65039;', 'Compose once', 'Write your email and drop in {{Name}}, {{Company}} and any column as variables.'],
    ['&#128640;', 'Send & track', 'Watch live progress, then review sent and failed results in History.'],
  ]
    .map(
      ([icon, title, text]) => `
<div style="display:flex;gap:12px;align-items:flex-start;margin:0 0 12px;background:#f7f9fc;border-radius:12px;padding:12px 14px;">
  <div style="width:34px;height:34px;flex-shrink:0;border-radius:9px;background:#e3edfb;color:#0058be;font-size:16px;line-height:34px;text-align:center;">${icon}</div>
  <div style="min-width:0;">
    <div style="font-weight:700;font-size:13.5px;color:#0b1c30;">${title}</div>
    <div style="font-size:12.5px;color:#45464d;line-height:1.55;">${text}</div>
  </div>
</div>`
    )
    .join('');
  return emailShell({
    showLogo: true,
    title: 'Welcome aboard, glad you joined!',
    subtitle: 'Your account is ready — here is how to send your first campaign',
    bodyHtml: `<p style="margin:0 0 16px;">Hi <strong>${name}</strong>,</p>
<p style="margin:0 0 18px;">Your <strong>Email Auto Machine</strong> account is created. Connect your SMTP once, and you can send personalized campaigns straight from a spreadsheet — no mail-merge skills needed.</p>
${steps}
<div style="margin-top:18px;background:#e6f4ea;border-radius:12px;padding:12px 14px;font-size:12.5px;color:#146c2e;line-height:1.6;">
  <strong>Tip:</strong> Try Test mode first (Profile → Send Mode) to practice risk-free — then turn it off to send for real.
</div>`,
    ctaLabel: 'Start your first campaign',
    ctaUrl: process.env.APP_URL || 'http://localhost:5173',
    footer: 'Email Auto Machine • Spreadsheet-powered email campaigns',
  });
}

const transportCache = new Map();

export function buildTransporter(cfg) {
  const secure = cfg.smtp.secure === true || cfg.smtp.secure === 'true' || Number(cfg.smtp.port) === 465;
  const sig = `${cfg.smtp.host}|${Number(cfg.smtp.port) || 587}|${cfg.smtp.user || ''}|${cfg.smtp.pass || ''}|${secure}`;
  if (!transportCache.has(sig)) {
    transportCache.set(
      sig,
      nodemailer.createTransport({
        host: cfg.smtp.host,
        port: Number(cfg.smtp.port) || 587,
        secure,
        auth: cfg.smtp.user ? { user: cfg.smtp.user, pass: cfg.smtp.pass || '' } : undefined,
      })
    );
  }
  const transporter = transportCache.get(sig);
  return transporter;
}

export function extractEmail(row) {
  if (!row || typeof row !== 'object') return '';
  const direct = (v) => v !== undefined && v !== null && String(v).trim() !== '' && /@/.test(String(v));
  if (direct(row.Email)) return String(row.Email).trim();
  if (direct(row.email)) return String(row.email).trim();
  for (const key of Object.keys(row)) {
    if (/email/i.test(key)) {
      const v = row[key];
      if (direct(v)) return String(v).trim();
    }
  }
  return '';
}

export function systemSmtpConfig() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return {
    smtp: {
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
      fromName: process.env.SMTP_FROM_NAME || 'Email Auto Machine',
      fromEmail: process.env.SMTP_FROM_EMAIL || '',
    },
    testMode: false,
  };
}

export async function sendEmail({ cfg, to, subject, html, posterImage, data, logo = false }) {
  const mail = {
    from: cfg.smtp.fromName ? `"${cfg.smtp.fromName}" <${cfg.smtp.fromEmail || cfg.smtp.user}>` : cfg.smtp.fromEmail || cfg.smtp.user,
    to,
    subject: substituteVariables(subject, data),
    html: substituteVariables(html, data),
  };
  const attachments = [];
  if (posterImage) {
    const fullPath = path.join(__dirname, '..', posterImage);
    if (fs.existsSync(fullPath)) {
      attachments.push({
        filename: path.basename(posterImage),
        path: fullPath,
        cid: 'poster',
      });
    }
  }
  if (logo && fs.existsSync(EMAIL_LOGO_PATH)) {
    attachments.push({
      filename: 'logo.png',
      path: EMAIL_LOGO_PATH,
      cid: 'logo',
    });
  }
  if (attachments.length) mail.attachments = attachments;
  if (cfg.testMode) {
    await new Promise((r) => setTimeout(r, 350));
    if (to && /invalid/i.test(String(data?.Email || data?.email || ''))) {
      const e = new Error('Simulated bounce: email address rejected');
      e.code = 'SIM_BOUNCE';
      throw e;
    }
    return { messageId: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, simulated: true };
  }
  const from = cfg.smtp.fromName ? `"${cfg.smtp.fromName}" <${cfg.smtp.fromEmail || cfg.smtp.user}>` : cfg.smtp.fromEmail || cfg.smtp.user;
  if (!from) {
    throw new Error('No sender address configured — set From Email (or SMTP Username) in Profile → SMTP Server');
  }
  mail.from = from;
  const transporter = buildTransporter(cfg);
  const info = await transporter.sendMail(mail);
  return { messageId: info.messageId };
}

export function getTransporter() {
  return { cache: [...transportCache.entries()].map(([sig]) => ({ sig })) };
}
