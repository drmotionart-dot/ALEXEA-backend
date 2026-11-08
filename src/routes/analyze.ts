import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { env } from '../config/env.js';

export const analyzeRouter = Router();

analyzeRouter.post('/', requireAuth, requireRole('head'), async (req, res) => {
  try {
    const { file } = req.body || {};
    if (!file) return res.status(400).json({ error: 'file required (base64)' });
    if (!env.ocrSpaceKey) return res.status(503).json({ error: 'OCR_SPACE_KEY not configured' });
    const buf = Buffer.from(file.replace(/^data:[^;]+;base64,/, ''), 'base64');
    const form = new FormData();
    form.append('file', new Blob([buf]), 'upload.bin');
    form.append('apikey', env.ocrSpaceKey);
    form.append('language', 'eng');
    form.append('OCREngine', '2');
    form.append('isOverlayRequired', 'false');
    const r = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: form });
    const j = await r.json();
    if (j.IsErroredOnProcessing) return res.status(400).json({ error: j.ErrorMessage || 'OCR failed' });
    const text = (j.ParsedResults || []).map((p: any) => p.ParsedText).join('\n');
    res.json({ text, pages: (j.ParsedResults || []).length });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'analyze failed' });
  }
});
