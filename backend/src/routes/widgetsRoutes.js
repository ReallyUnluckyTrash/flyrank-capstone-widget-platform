import express from 'express';
import cors from 'cors';
import { requireAuth } from '../middleware/auth.js';
import { submissionController } from '../controllers/submissionController.js';
import { widgetController } from '../controllers/widgetController.js';

const router = express.Router();

router.post('/', requireAuth, widgetController.createWidget);
router.get('/', requireAuth, widgetController.getWidgets);
router.get('/:id/config', cors(), (req, res, next) => {
	res.set('Cache-Control', 'public, max-age=60, s-maxage=60');
	return widgetController.getPublicWidgetConfig(req, res, next);
});
router.get('/:id/submissions', requireAuth, submissionController.getWidgetSubmissions);
router.get('/:id', requireAuth, widgetController.getWidgetById);
router.patch('/:id', requireAuth, widgetController.updateWidget);
router.delete('/:id', requireAuth, widgetController.deleteWidget);

export default router;