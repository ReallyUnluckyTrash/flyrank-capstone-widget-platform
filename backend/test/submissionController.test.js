import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const createSubmission = jest.fn();
const getWidgetSubmissions = jest.fn();
class SubmissionError extends Error {
	constructor(status, message, details) {
		super(message);
		this.status = status;
		this.details = details;
	}
}

jest.unstable_mockModule('../src/services/submissionService.js', () => ({
	createSubmission,
	getWidgetSubmissions,
	SubmissionError,
}));

const { submissionController } = await import('../src/controllers/submissionController.js');

function createResponse() {
	return {
		status: jest.fn().mockReturnThis(),
		send: jest.fn().mockReturnThis(),
	};
}

describe('submissionController.getWidgetSubmissions', () => {
	beforeEach(() => jest.clearAllMocks());

	test('uses safe defaults and scopes the query to the authenticated tenant', async () => {
		const result = { data: [], pagination: { page: 1, page_size: 25, total: 0, total_pages: 0 } };
		getWidgetSubmissions.mockResolvedValue(result);
		const req = {
			params: { id: 'widget-1' },
			query: {},
			tenantId: 'tenant-1',
		};
		const res = createResponse();

		await submissionController.getWidgetSubmissions(req, res);

		expect(getWidgetSubmissions).toHaveBeenCalledWith('widget-1', 'tenant-1', 1, 25);
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.send).toHaveBeenCalledWith(result);
	});

	test('accepts the legacy limit query parameter', async () => {
		getWidgetSubmissions.mockResolvedValue({ data: [], pagination: {} });

		await submissionController.getWidgetSubmissions({
			params: { id: 'widget-1' },
			query: { page: '2', limit: '50' },
			tenantId: 'tenant-1',
		}, createResponse());

		expect(getWidgetSubmissions).toHaveBeenCalledWith('widget-1', 'tenant-1', 2, 50);
	});

	test.each([
		[{ page: '0' }, 'page must be a positive integer'],
		[{ page: '1.5' }, 'page must be a positive integer'],
		[{ page_size: '0' }, 'page_size must be a positive integer'],
		[{ page_size: '101' }, 'page_size must be at most 100'],
	])('rejects invalid pagination values %j', async (query, message) => {
		const res = createResponse();

		await submissionController.getWidgetSubmissions({
			params: { id: 'widget-1' },
			query,
			tenantId: 'tenant-1',
		}, res);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.send).toHaveBeenCalledWith({ error: message });
		expect(getWidgetSubmissions).not.toHaveBeenCalled();
	});

	test('returns 404 when the widget is not owned by the tenant', async () => {
		getWidgetSubmissions.mockResolvedValue(null);
		const res = createResponse();

		await submissionController.getWidgetSubmissions({
			params: { id: 'other-tenant-widget' },
			query: {},
			tenantId: 'tenant-1',
		}, res);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.send).toHaveBeenCalledWith({ error: 'Widget not found' });
	});
});
