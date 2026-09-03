import express from 'express';
import { authController } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);

router.get('/public/info', (req, res) => {
  res.status(200).send({ message: "Welcome stranger! This info is public." });
});

router.get('/protected/profile', requireAuth, authController.profile);

export default router;