import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { widgetController } from '../controllers/widgetController.js';

const router = express.Router();

router.post('/', requireAuth, widgetController.createWidget);
router.get('/', requireAuth, widgetController.getWidgets);
router.get('/:id/config', (req, res) => {
	res.set('Cache-Control', 'public, max-age=60');
	return res.status(501).send({ error: 'Public widget config is not implemented yet' });
});
router.get('/:id', requireAuth, widgetController.getWidgetById);
router.patch('/:id', requireAuth, widgetController.updateWidget);
router.delete('/:id', requireAuth, widgetController.deleteWidget);

export default router;