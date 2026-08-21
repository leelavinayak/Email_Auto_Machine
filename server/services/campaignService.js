import { store } from '../store.js';
import { sendEmail, buildHtml, extractEmail, systemSmtpConfig } from './emailService.js';
import { broadcast } from './events.js';

const controllers = new Map();

async function emitCampaign(campaignId, extra = {}) {
  const campaign = await store.getCampaign(campaignId);
  if (campaign) broadcast('campaign', { id: String(campaignId), campaign, ...extra });
}

export function getController(id) {
  if (!controllers.has(id)) controllers.set(id, { paused: false, cancelled: false });
  return controllers.get(id);
}

export function pauseCampaign(id) {
  const c = getController(id);
  c.paused = true;
  return { paused: true };
}

export function resumeCampaign(id) {
  const c = getController(id);
  c.paused = false;
  return { paused: false };
}

export function cancelCampaign(id) {
  const c = getController(id);
  c.cancelled = true;
  return { cancelled: true };
}

export async function runCampaign(campaignId) {
  const controller = getController(campaignId);
  const campaign = await store.getCampaign(campaignId);
  if (!campaign) return;

  const settings = await store.getSetting(campaign.userId || 'global');
  const userSmtp = (settings && settings.smtp) || {};
  const userTestMode = settings ? settings.testMode !== false : true;

  // Test mode always simulates — never deliver real mail, even if a system
  // SMTP is configured. Real sending uses the user's own SMTP, or the system
  // SMTP (env) as a fallback so campaigns still reach recipients.
  const sysCfg = systemSmtpConfig();
  const smtp = userSmtp.host ? userSmtp : sysCfg ? sysCfg.smtp : null;
  const cfg = { smtp: smtp || {}, testMode: userTestMode };

  if (!cfg.testMode) {
    console.log(
      smtp === userSmtp
        ? `[campaign] ${campaign._id}: sending via user SMTP ${cfg.smtp.host}`
        : `[campaign] ${campaign._id}: no user SMTP — sending via system SMTP ${cfg.smtp.host}`
    );
  } else {
    console.log(`[campaign] ${campaign._id}: TEST MODE — emails are simulated, nothing delivered`);
  }

  const simulated = cfg.testMode !== false;
  await store.updateCampaign(campaignId, { simulated });

  const recipients = await store.getRecipients(campaignId);
  let sent = 0;
  let failed = 0;
  const total = recipients.length;
  let firstError = null;

  // Real sending needs an SMTP server — fail fast with a clear reason instead
  // of a confusing connection error per recipient.
  if (!cfg.testMode && !cfg.smtp.host) {
    const reason = 'SMTP is not configured. Add your SMTP details in Profile → SMTP Server, or set SMTP_HOST in server/.env.';
    for (const r of recipients) {
      await store.updateRecipient(campaignId, r.row, { status: 'failed', error: reason });
    }
    await store.updateCampaign(campaignId, {
      status: 'failed',
      sent: 0,
      failed: recipients.length,
      total,
      error: reason,
      simulated: false,
      failedAt: new Date(),
    });
    await emitCampaign(campaignId);
    controllers.delete(campaignId);
    return;
  }

  for (const r of recipients) {
    if (controller.cancelled) {
      await store.updateCampaign(campaignId, { status: 'failed', error: 'Campaign cancelled by user' });
      break;
    }
    if (controller.paused) {
      await store.updateCampaign(campaignId, { status: 'paused' });
      await emitCampaign(campaignId, { current: { name: r.data?.Name || r.data?.name, email: extractEmail(r.data || {}) } });
      await new Promise((resolve) => {
        const iv = setInterval(() => {
          if (!getController(campaignId).paused) {
            clearInterval(iv);
            resolve();
          }
          if (getController(campaignId).cancelled) {
            clearInterval(iv);
            resolve();
          }
        }, 400);
      });
      if (controller.cancelled) {
        await store.updateCampaign(campaignId, { status: 'failed', error: 'Campaign cancelled by user' });
        break;
      }
      await store.updateCampaign(campaignId, { status: 'sending' });
    }

    const data = r.data || {};
    const to = extractEmail(data);
    if (!to) {
      failed += 1;
      await store.updateRecipient(campaignId, r.row, { status: 'failed', error: 'No Email address found in row' });
    } else {
      try {
        const html = buildHtml({
          body: campaign.body,
          posterImage: campaign.posterImage,
          posterPosition: campaign.posterPosition || 'top',
          design: campaign.design,
        });
        await sendEmail({
          cfg,
          to,
          subject: campaign.subject,
          html,
          posterImage: campaign.posterImage,
          data,
        });
        sent += 1;
        await store.updateRecipient(campaignId, r.row, { status: 'sent', sentAt: new Date() });
      } catch (err) {
        failed += 1;
        if (!firstError) firstError = err.message;
        await store.updateRecipient(campaignId, r.row, { status: 'failed', error: err.message });
      }
    }

    await store.updateCampaign(campaignId, {
      sent,
      failed,
      total,
      status: controller.cancelled ? 'failed' : 'sending',
    });
    await emitCampaign(campaignId, { current: { name: data.Name || data.name, email: to } });
    await new Promise((res) => setTimeout(res, 250));
  }

  if (controller.cancelled) {
    const pending = await store.getRecipients(campaignId, 'pending');
    for (const p of pending) {
      await store.updateRecipient(campaignId, p.row, { status: 'failed', error: 'Cancelled before send' });
    }
    await store.updateCampaign(campaignId, {
      status: 'failed',
      sent,
      failed: failed + pending.length,
      total,
      error: 'Campaign cancelled by user',
      failedAt: new Date(),
    });
    await emitCampaign(campaignId);
  } else {
    // A campaign that delivered nothing is a failure; mark it so it shows
    // under the "Failed" filter as well as "All".
    const allFailed = failed > 0 && sent === 0;
    await store.updateCampaign(campaignId, {
      status: allFailed ? 'failed' : 'completed',
      sent,
      failed,
      total,
      error: allFailed ? firstError || 'SMTP not configured or unreachable' : undefined,
      sentAt: allFailed ? undefined : new Date(),
      failedAt: allFailed ? new Date() : undefined,
    });
    await emitCampaign(campaignId);
  }
  controllers.delete(campaignId);
}
