import { createSubmission, SubmissionError } from '../services/submissionService.js';

export const submissionController = {
	async createSubmission(req, res) {
		try {
			const submission = await createSubmission(
				req.validatedSubmission.widget_id,
				req.validatedSubmission.data,
				req,
			);
			return res.status(201).send({ data: submission, message: 'Submission received' });
		} catch (error) {
			if (error instanceof SubmissionError) {
				return res.status(error.status).send({ error: error.message, details: error.details });
			}
			console.error('Unable to create submission:', error);
			return res.status(500).send({ error: 'Unable to process submission' });
		}
	},
};
