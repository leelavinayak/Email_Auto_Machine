import express from 'express';
import { store } from '../store.js';
import { runCampaign, pauseCampaign, resumeCampaign, cancelCampaign } from '../services/campaignService.js';
import { broadcast } from '../services/events.js';
import { requireAuth } from '../middleware.js';

const router = express.Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  try {
    const { listId, title, subject, body, posterImage, posterPosition, design } = req.body;
    if (!listId || !subject || !body) {
      return res.status(400).json({ error: 'List, subject and body are required' });
    }
    const list = await store.getList(listId, req.userId);
    if (!list) return res.status(404).json({ error: 'Spreadsheet list not found. Please upload again.' });

    const rows = list.rows.map((r, i) => ({ row: i, data: r }));
    const campaign = await store.createCampaign({
      userId: req.userId,
      title: title || subject,
      subject,
      body,
      posterImage: posterImage || null,
      posterPosition: posterPosition === 'bottom' ? 'bottom' : 'top',
      design: design || null,
      listFile: list.filename,
      columns: list.columns,
      status: 'sending',
      total: rows.length,
      sent: 0,
      failed: 0,
    });
    await store.bulkInsertRecipients(campaign._id, rows);

    runCampaign(campaign._id);
    broadcast('campaigns', { reason: 'created' });

    res.status(201).json({ campaign });
  } catch (err) {
    console.error('Create campaign error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const campaigns = await store.listCampaigns(req.userId);
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const campaign = await store.getCampaign(req.params.id, req.userId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const recipients = await store.getRecipients(req.params.id);
    res.json({ campaign, recipients });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await store.deleteCampaign(req.params.id, req.userId);
    if (!deleted) return res.status(404).json({ error: 'Campaign not found' });
    broadcast('campaigns', { reason: 'deleted' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/pause', async (req, res) => {
  const owned = await store.getCampaign(req.params.id, req.userId);
  if (!owned) return res.status(404).json({ error: 'Campaign not found' });
pauseCampaign(req.params.id);
  await store.updateCampaign(req.params.id, { status: 'paused' });
  broadcast('campaign', { id: req.params.id, campaign: owned });
  res.json({ ok: true });
});

router.post('/:id/resume', async (req, res) => {
  const owned = await store.getCampaign(req.params.id, req.userId);
  if (!owned) return res.status(404).json({ error: 'Campaign not found' });
  resumeCampaign(req.params.id);
  const campaign = await store.getCampaign(req.params.id);
  if (campaign && (campaign.status === 'paused' || campaign.status === 'sending')) {
    await store.updateCampaign(req.params.id, { status: 'sending' });
  }
  const updated = await store.getCampaign(req.params.id);
  if (updated) broadcast('campaign', { id: req.params.id, campaign: updated });
  res.json({ ok: true });
});

router.post('/:id/cancel', async (req, res) => {
  const owned = await store.getCampaign(req.params.id, req.userId);
  if (!owned) return res.status(404).json({ error: 'Campaign not found' });
  cancelCampaign(req.params.id);
  broadcast('campaign', { id: req.params.id, cancelling: true });
  res.json({ ok: true });
});

export default router;
