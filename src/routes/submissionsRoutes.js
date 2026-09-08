import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { submissionController } from '../controllers/submissionController.js';
import { validateSubmissionPayload } from '../middleware/validation.js';

const router = express.Router();
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // limit each IP to 10 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
});

router.options('/', cors());
router.post('/', cors(), limiter, validateSubmissionPayload, submissionController.createSubmission);

export default router;