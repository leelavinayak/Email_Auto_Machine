import dotenv from 'dotenv';
dotenv.config();
import { sendEmail, systemSmtpConfig, welcomeEmailHtml } from './services/emailService.js';

const cfg = systemSmtpConfig();
console.log('system config:', JSON.stringify(cfg, null, 2));

try {
  const res = await sendEmail({
    cfg,
    to: 'leelavinayakkothakota155@gmail.com',
    subject: 'Welcome to Email Auto Machine 🎉',
    html: welcomeEmailHtml('Test User'),
    logo: true,
  });
  console.log('SEND RESULT:', JSON.stringify(res));
} catch (err) {
  console.log('SEND FAILED:', err.message);
  console.log('CODE:', err.code);
  console.log('RESPONSE:', err.response);
}
process.exit(0);