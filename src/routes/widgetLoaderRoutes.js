import express from 'express';

const router = express.Router();

router.get('/widget.js', (req, res) => {
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  return res.status(501).send('// Widget loader is not implemented yet');
});

export default router;