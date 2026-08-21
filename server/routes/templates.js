import express from 'express';
import { store } from '../store.js';
import { requireAuth } from '../middleware.js';

const router = express.Router();
router.use(requireAuth);

const sanitizePosition = (p) => (p === 'bottom' ? 'bottom' : 'top');

router.get('/', async (req, res) => {
  try {
    const templates = await store.listTemplates(req.userId);
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, subject, body, posterImage, posterPosition, design } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Give your template a name' });
    }
    const template = await store.createTemplate({
      userId: req.userId,
      name: String(name).trim(),
      subject: subject || '',
      body: body || '',
      posterImage: posterImage || null,
      posterPosition: sanitizePosition(posterPosition),
      design: design || null,
    });
    res.status(201).json({ template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, subject, body, posterImage, posterPosition, design } = req.body;
    const patch = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (subject !== undefined) patch.subject = subject;
    if (body !== undefined) patch.body = body;
    if (posterImage !== undefined) patch.posterImage = posterImage;
    if (posterPosition !== undefined) patch.posterPosition = sanitizePosition(posterPosition);
    if (design !== undefined) patch.design = design;
    const template = await store.updateTemplate(req.params.id, req.userId, patch);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json({ template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await store.deleteTemplate(req.params.id, req.userId);
    if (!deleted) return res.status(404).json({ error: 'Template not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;