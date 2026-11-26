import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db/database.js';
import { previewFile, executeImport } from '../services/excelImport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const uploadDir = isVercel ? '/tmp/uploads' : path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${basename}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // up to 50MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx, .xls, and .csv files are supported.'));
    }
  }
});

const router = express.Router();

/**
 * POST /api/import/upload-preview
 * Upload and inspect file, detect columns, return preview
 */
router.post('/upload-preview', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const preview = previewFile(filePath);

    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: filePath
      },
      ...preview
    });
  } catch (err) {
    console.error('[Import Preview] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/import/execute
 * Execute import with mapping and duplicate handling
 */
router.post('/execute', (req, res) => {
  try {
    const { filePath, mapping, duplicateStrategy = 'skip' } = req.body;

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(400).json({ success: false, error: 'File path invalid or file does not exist.' });
    }

    const result = executeImport(filePath, mapping || {}, duplicateStrategy);
    res.json(result);
  } catch (err) {
    console.error('[Import Execute] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/import/history
 */
router.get('/history', (req, res) => {
  try {
    const history = db.prepare('SELECT * FROM import_history ORDER BY id DESC LIMIT 20').all();
    res.json({ success: true, history });
  } catch (err) {
    console.error('[Import History] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
