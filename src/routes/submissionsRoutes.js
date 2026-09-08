import express from 'express';
import cors from 'cors';
import { submissionController } from '../controllers/submissionController.js';

const router = express.Router();

router.options('/', cors());
router.post('/', cors(), submissionController.createSubmission);

export default router;