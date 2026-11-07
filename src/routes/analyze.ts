import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { env } from '../config/env.js';

export const analyzeRouter = Router();

analyzeRouter.post('/', requireAuth, requireRole('head'), async (req, res) => {
  try {
    const { file, type } = req.body || {};
    if (!file) return res.status(400).json({ error: 'file required (base64)' });
    const buf = Buffer.from(file.replace(/^data:[^;]+;base64,/, ''), 'base64');
    if (type === 'pdf') {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buf });
      const data = await parser.getText();
      return res.json({ text: data.text, pages: data.pages?.length || 0 });
    }
    // image -> OCR.space
    if (!env.ocrSpaceKey) return res.status(503).json({ error: 'OCR_SPACE_KEY not configured' });
    const form = new FormData();
    form.append('file', new Blob([buf]), 'image.png');
    form.append('apikey', env.ocrSpaceKey);
    form.append('language', 'eng');
    form.append('OCREngine', '2');
    const r = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: form });
    const j = await r.json();
    const text = (j.ParsedResults || []).map((p: any) => p.ParsedText).join('\n');
    res.json({ text });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'analyze failed' });
  }
});
