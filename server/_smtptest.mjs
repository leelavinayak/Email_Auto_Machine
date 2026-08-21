import dotenv from 'dotenv';
import { createTransport } from 'nodemailer';

dotenv.config();

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT) || 587;
const secure = process.env.SMTP_SECURE === 'true' || port === 465;

console.log('SMTP_HOST:', host);
console.log('SMTP_PORT:', port);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS set:', !!process.env.SMTP_PASS);
console.log('SMTP_SECURE:', secure);

const t = createTransport({
  host,
  port,
  secure,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

try {
  const ok = await t.verify();
  console.log('VERIFY OK:', JSON.stringify(ok));
} catch (err) {
  console.log('VERIFY FAILED:', err.message);
  console.log('CODE:', err.code);
  console.log('RESPONSE:', err.response);
}
process.exit(0);