import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { enrichIp } from '../src/services/geoService.js';

afterEach(() => {
	jest.restoreAllMocks();
});

describe('enrichIp', () => {
	test('skips geo providers for private IP addresses', async () => {
		const fetch = jest.spyOn(globalThis, 'fetch');

		await expect(enrichIp({ ip: '192.168.1.12' })).resolves.toEqual({
			ipAddress: '192.168.1.12',
			country: null,
			city: null,
		});
		expect(fetch).not.toHaveBeenCalled();
	});

	test('uses the primary provider for public IP addresses', async () => {
		const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			json: async () => ({ status: 'success', country: 'Canada', city: 'Toronto' }),
		});

		await expect(enrichIp({ ip: '8.8.8.8' })).resolves.toEqual({
			ipAddress: '8.8.8.8',
			country: 'Canada',
			city: 'Toronto',
		});
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fetch.mock.calls[0][0]).toContain('ip-api.com/json/8.8.8.8');
	});

	test('uses the fallback provider when the primary provider fails', async () => {
		const fetch = jest.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce({ ok: false, status: 503 })
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ country_name: 'Canada', city: 'Toronto' }),
			});
		jest.spyOn(console, 'warn').mockImplementation(() => {});

		await expect(enrichIp({ ip: '8.8.8.8' })).resolves.toEqual({
			ipAddress: '8.8.8.8',
			country: 'Canada',
			city: 'Toronto',
		});
		expect(fetch).toHaveBeenCalledTimes(2);
		expect(fetch.mock.calls[1][0]).toContain('ipapi.co/8.8.8.8/json/');
	});

	test('returns null geo data and logs when both providers fail', async () => {
		jest.spyOn(globalThis, 'fetch')
			.mockRejectedValueOnce(new Error('primary unavailable'))
			.mockRejectedValueOnce(new Error('fallback unavailable'));
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

		await expect(enrichIp({ ip: '8.8.8.8' })).resolves.toEqual({
			ipAddress: '8.8.8.8',
			country: null,
			city: null,
		});
		expect(warn).toHaveBeenCalledTimes(2);
	});
});
