import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { dashboardController } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/stats/stream', requireAuth, dashboardController.stream);
router.get('/stats/overview', requireAuth, dashboardController.getOverview);
router.get('/stats/timeseries', requireAuth, dashboardController.getTimeseries);
router.get('/stats/widget', requireAuth, dashboardController.getWidget);
router.get('/stats/country', requireAuth, dashboardController.getCountry);
router.get('/stats/recent-submissions', requireAuth, dashboardController.getRecentSubmissions);

export default router;