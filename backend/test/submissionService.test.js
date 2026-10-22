import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const poolQuery = jest.fn();
const enrichIp = jest.fn();
const getWidgetForSubmission = jest.fn();
const broadcastToTenant = jest.fn();

jest.unstable_mockModule('../src/services/databaseService.js', () => ({
	pool: { query: poolQuery },
}));
jest.unstable_mockModule('../src/services/geoService.js', () => ({ enrichIp }));
jest.unstable_mockModule('../src/services/widgetService.js', () => ({ getWidgetForSubmission }));
jest.unstable_mockModule('../src/services/sseService.js', () => ({ broadcastToTenant }));

const { SubmissionError, createSubmission } = await import('../src/services/submissionService.js');

const widget = {
	id: 'widget-1',
	tenant_id: 'tenant-1',
	type: 'signup',
	form_fields: [
		{ name: 'name', type: 'text', required: true },
		{ name: 'email', type: 'email', required: true },
		{ name: '_hp_website', type: 'text', honeypot: true },
	],
};

describe('createSubmission', () => {
	const originalWebhookUrl = process.env.WEBHOOK_URL;

	beforeEach(() => {
		jest.clearAllMocks();
		delete process.env.WEBHOOK_URL;
		getWidgetForSubmission.mockResolvedValue(widget);
		enrichIp.mockResolvedValue({
			ipAddress: '8.8.8.8',
			country: 'Canada',
			city: 'Toronto',
		});
		poolQuery.mockResolvedValue({ rows: [] });
	});

	afterEach(() => {
		if (originalWebhookUrl === undefined) {
			delete process.env.WEBHOOK_URL;
		} else {
			process.env.WEBHOOK_URL = originalWebhookUrl;
		}
	});

	test('validates and persists a submission, then broadcasts it', async () => {
		const request = { ip: '8.8.8.8' };

		const result = await createSubmission('widget-1', {
			name: 'Sam',
			email: 'sam@example.com',
			_hp_website: '',
		}, request);

		expect(result.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		);
		expect(poolQuery).toHaveBeenCalledWith(
			expect.stringContaining('INSERT INTO submissions'),
			[
				result.id,
				'widget-1',
				'tenant-1',
				JSON.stringify({ name: 'Sam', email: 'sam@example.com' }),
				'8.8.8.8',
				'Canada',
				'Toronto',
			],
		);
		expect(broadcastToTenant).toHaveBeenCalledWith('tenant-1', 'submission.created', {
			id: result.id,
			widget_id: 'widget-1',
			tenant_id: 'tenant-1',
			data: { name: 'Sam', email: 'sam@example.com' },
			country: 'Canada',
			city: 'Toronto',
		});
	});

	test('rejects an unknown widget', async () => {
		getWidgetForSubmission.mockResolvedValue(null);

		await expect(createSubmission('missing', {}, {})).rejects.toMatchObject({
			status: 404,
			message: 'Widget not found',
		});
		expect(enrichIp).not.toHaveBeenCalled();
		expect(poolQuery).not.toHaveBeenCalled();
	});

	test('rejects unsupported widget types', async () => {
		getWidgetForSubmission.mockResolvedValue({ ...widget, type: 'survey' });

		await expect(createSubmission('widget-1', {}, {})).rejects.toMatchObject({
			status: 400,
			message: 'Unsupported widget type',
		});
		expect(enrichIp).not.toHaveBeenCalled();
		expect(poolQuery).not.toHaveBeenCalled();
	});

	test('rejects honeypot submissions before geo lookup or persistence', async () => {
		await expect(createSubmission('widget-1', {
			name: 'Sam',
			email: 'sam@example.com',
			_hp_website: 'spam.example',
		}, {})).rejects.toMatchObject({
			status: 429,
			message: 'Submission rejected',
		});
		expect(enrichIp).not.toHaveBeenCalled();
		expect(poolQuery).not.toHaveBeenCalled();
	});

	test('rejects invalid configured fields with details', async () => {
		let error;
		try {
			await createSubmission('widget-1', { name: '', email: 'invalid' }, {});
		} catch (caughtError) {
			error = caughtError;
		}

		expect(error).toBeInstanceOf(SubmissionError);
		expect(error).toMatchObject({
			status: 400,
			message: 'Invalid submission fields',
			details: [
				{ path: ['name'], message: 'Required field' },
				{ path: ['email'], message: 'Invalid email' },
			],
		});
		expect(enrichIp).not.toHaveBeenCalled();
		expect(poolQuery).not.toHaveBeenCalled();
	});
});
