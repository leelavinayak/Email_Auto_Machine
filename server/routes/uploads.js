import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { store } from '../store.js';
import { requireAuth } from '../middleware.js';

const router = express.Router();
router.use(requireAuth);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = process.env.VERCEL === '1' ? path.join('/tmp', 'email-automachine-uploads') : path.join(__dirname, '..', 'uploads');
const listsDir = path.join(uploadsRoot, 'lists');
const imagesDir = path.join(uploadsRoot, 'images');

fs.mkdirSync(listsDir, { recursive: true });
fs.mkdirSync(imagesDir, { recursive: true });

const listStorage = multer.diskStorage({
  destination: listsDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/[^\w.\- ]/g, '_')}`),
});

const imageStorage = multer.diskStorage({
  destination: imagesDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/[^\w.\- ]/g, '_')}`),
});

const uploadList = multer({ storage: listStorage, limits: { fileSize: 20 * 1024 * 1024 } });
const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/image\/(png|jpe?g|gif|webp)/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

function parseSpreadsheet(buffer, filename) {
  const ext = path.extname(filename).toLowerCase();
  let rows = [];

  if (ext === '.csv') {
    const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    rows = parsed.data;
  } else {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (ws) rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  }

  const columns = rows.length ? Object.keys(rows[0]).filter((c) => c && c.trim() !== '') : [];
  return { rows: rows.filter((r) => r && Object.values(r).some((v) => String(v).trim() !== '')), columns };
}

router.post('/list', uploadList.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    const buffer = fs.readFileSync(file.path);
    const { rows, columns } = parseSpreadsheet(buffer, file.originalname);
    if (!columns.length) {
      return res.status(400).json({ error: 'Could not detect any columns. Make sure the file has a header row.' });
    }
    const list = await store.saveList({ userId: req.userId, filename: file.originalname, columns, rows });
    res.json({
      id: String(list.id || list._id),
      filename: file.originalname,
      columns,
      rowCount: rows.length,
      preview: rows[0] || {},
      url: `/uploads/lists/${path.basename(file.path)}`,
    });
  } catch (err) {
    console.error('Upload list error:', err);
    res.status(400).json({ error: err.message });
  }
});

router.get('/list/:id', async (req, res) => {
  try {
    const list = await store.getList(req.params.id, req.userId);
    if (!list) return res.status(404).json({ error: 'Spreadsheet not found. Please upload again.' });
    res.json({
      id: String(list._id || list.id),
      filename: list.filename,
      columns: list.columns,
      rowCount: (list.rows || []).length,
      preview: (list.rows && list.rows[0]) || {},
    });
  } catch (err) {
    console.error('Get list error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/image', uploadImage.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    res.json({ path: `uploads/images/${req.file.filename}`, url: `/uploads/images/${req.file.filename}` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
