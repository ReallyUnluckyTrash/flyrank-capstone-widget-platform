import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const getCountryStats = jest.fn();
const getOverviewStats = jest.fn();
const getRecentSubmissions = jest.fn();
const getSubmissionTimeseries = jest.fn();
const getWidgetStats = jest.fn();
const openTenantStream = jest.fn();

jest.unstable_mockModule('../src/services/dashboardService.js', () => ({
	getCountryStats,
	getOverviewStats,
	getRecentSubmissions,
	getSubmissionTimeseries,
	getWidgetStats,
}));
jest.unstable_mockModule('../src/services/sseService.js', () => ({ openTenantStream }));

const { dashboardController } = await import('../src/controllers/dashboardController.js');

function createResponse() {
	return {
		status: jest.fn().mockReturnThis(),
		send: jest.fn().mockReturnThis(),
	};
}

describe('dashboardController', () => {
	beforeEach(() => jest.clearAllMocks());

	test('loads overview stats for the authenticated tenant', async () => {
		const stats = { total_submissions: 4, total_widgets: 2, spam_count: 1 };
		getOverviewStats.mockResolvedValue(stats);
		const res = createResponse();

		await dashboardController.getOverview({ user: { id: 'tenant-1' } }, res);

		expect(getOverviewStats).toHaveBeenCalledWith('tenant-1');
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.send).toHaveBeenCalledWith({ data: stats });
	});

	test('normalizes valid timeseries dates and passes the tenant ID', async () => {
		getSubmissionTimeseries.mockResolvedValue([]);
		const res = createResponse();

		await dashboardController.getTimeseries({
			user: { id: 'tenant-1' },
			query: { from: '2026-01-01', to: '2026-01-31' },
		}, res);

		expect(getSubmissionTimeseries).toHaveBeenCalledWith(
			'tenant-1',
			'2026-01-01T00:00:00.000Z',
			'2026-01-31T00:00:00.000Z',
		);
		expect(res.status).toHaveBeenCalledWith(200);
	});

	test('rejects an invalid timeseries date without querying the service', async () => {
		const res = createResponse();

		await dashboardController.getTimeseries({
			user: { id: 'tenant-1' },
			query: { from: 'not-a-date' },
		}, res);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.send).toHaveBeenCalledWith({ error: 'from must be a valid date' });
		expect(getSubmissionTimeseries).not.toHaveBeenCalled();
	});

	test('returns a server error when a dashboard service fails', async () => {
		getOverviewStats.mockRejectedValue(new Error('database unavailable'));
		jest.spyOn(console, 'error').mockImplementation(() => {});
		const res = createResponse();

		await dashboardController.getOverview({ user: { id: 'tenant-1' } }, res);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.send).toHaveBeenCalledWith({ error: 'Unable to load dashboard overview' });
	});
});
