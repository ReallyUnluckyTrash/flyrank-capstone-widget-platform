import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const query = jest.fn();

jest.unstable_mockModule('../src/services/databaseService.js', () => ({
	pool: { query },
}));

const { healthController } = await import('../src/controllers/healthController.js');

function createResponse() {
	return {
		status: jest.fn().mockReturnThis(),
		send: jest.fn().mockReturnThis(),
	};
}

describe('healthController', () => {
	beforeEach(() => query.mockReset());
	afterEach(() => jest.restoreAllMocks());

	test('reports liveness without depending on the database', () => {
		const res = createResponse();

		healthController.live({}, res);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.send).toHaveBeenCalledWith({ status: 'ok' });
		expect(query).not.toHaveBeenCalled();
	});

	test('reports readiness when the database responds', async () => {
		query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
		const res = createResponse();

		await healthController.ready({}, res);

		expect(query).toHaveBeenCalledWith('SELECT 1');
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.send).toHaveBeenCalledWith({ status: 'ready' });
	});

	test('reports not ready when the database is unavailable', async () => {
		query.mockRejectedValue(new Error('database unavailable'));
		jest.spyOn(console, 'error').mockImplementation(() => {});
		const res = createResponse();

		await healthController.ready({}, res);

		expect(res.status).toHaveBeenCalledWith(503);
		expect(res.send).toHaveBeenCalledWith({ status: 'not_ready' });
		expect(console.error).toHaveBeenCalledWith(
			'API readiness check failed:',
			expect.any(Error),
		);
	});
});
