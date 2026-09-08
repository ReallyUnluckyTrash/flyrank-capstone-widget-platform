import express from 'express';
import { readFileSync } from 'node:fs';

const widgetSource = readFileSync(new URL('../widget/widget.js', import.meta.url), 'utf8');

const router = express.Router();

router.get('/widget.js', (req, res) => {
  res.type('application/javascript');
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  return res.send(widgetSource);
});

export default router;
