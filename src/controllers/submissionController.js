import {
	createSubmission,
	getWidgetSubmissions,
	SubmissionError,
} from '../services/submissionService.js';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function parsePositiveInteger(value, name, defaultValue) {
	if (value === undefined) return defaultValue;
	if (!/^\d+$/.test(value) || Number(value) < 1) {
		const error = new Error(`${name} must be a positive integer`);
		error.status = 400;
		throw error;
	}
	return Number(value);
}

export const submissionController = {
	async getWidgetSubmissions(req, res) {
		try {
			const page = parsePositiveInteger(req.query.page, 'page', 1);
			const pageSize = parsePositiveInteger(
				req.query.page_size ?? req.query.limit,
				'page_size',
				DEFAULT_PAGE_SIZE,
			);
			if (pageSize > MAX_PAGE_SIZE) {
				return res.status(400).send({ error: `page_size must be at most ${MAX_PAGE_SIZE}` });
			}

			const result = await getWidgetSubmissions(
				req.params.id,
				req.tenantId,
				page,
				pageSize,
			);
			if (!result) {
				return res.status(404).send({ error: 'Widget not found' });
			}
			return res.status(200).send(result);
		} catch (error) {
			if (error.status === 400) {
				return res.status(400).send({ error: error.message });
			}
			console.error('Unable to load widget submissions:', error);
			return res.status(500).send({ error: 'Unable to load widget submissions' });
		}
	},

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
