import { afterEach, describe, expect, jest, test } from '@jest/globals';
import {
	normalizeFormFields,
	validateConfiguredFields,
	validateSubmissionPayload,
} from '../src/middleware/validation.js';

function createResponse() {
	return {
		status: jest.fn().mockReturnThis(),
		send: jest.fn().mockReturnThis(),
	};
}

describe('validateSubmissionPayload', () => {
	test('stores a valid submission envelope and continues', () => {
		const req = {
			body: {
				widget_id: '123e4567-e89b-42d3-a456-426614174000',
				data: { email: 'person@example.com' },
			},
		};
		const res = createResponse();
		const next = jest.fn();

		validateSubmissionPayload(req, res, next);

		expect(req.validatedSubmission).toEqual(req.body);
		expect(next).toHaveBeenCalledTimes(1);
		expect(res.status).not.toHaveBeenCalled();
	});

	test.each([
		['an invalid widget ID', { widget_id: 'not-a-uuid', data: {} }],
		['non-string field values', {
			widget_id: '123e4567-e89b-42d3-a456-426614174000',
			data: { count: 3 },
		}],
		['extra envelope properties', {
			widget_id: '123e4567-e89b-42d3-a456-426614174000',
			data: {},
			extra: true,
		}],
	])('rejects %s with a 400 response', (_description, body) => {
		const req = { body };
		const res = createResponse();
		const next = jest.fn();

		validateSubmissionPayload(req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
			error: 'Invalid submission payload',
			details: expect.any(Array),
		}));
		expect(next).not.toHaveBeenCalled();
	});
});

describe('validateConfiguredFields', () => {
	test('returns only configured, non-honeypot data', () => {
		const result = validateConfiguredFields([
			{ name: 'name', required: true, type: 'text' },
			{ name: 'email', required: false, type: 'email' },
			{ name: '_hp_website', honeypot: true },
		], {
			name: 'Sam',
			email: '',
			_hp_website: '',
		});

		expect(result).toEqual({ errors: [], data: { name: 'Sam', email: '' } });
	});

	test('reports missing required fields, malformed email, and unknown fields', () => {
		const result = validateConfiguredFields([
			{ name: 'name', required: true, type: 'text' },
			{ name: 'email', required: false, type: 'email' },
		], { name: '  ', email: 'invalid', extra: 'value' });

		expect(result.errors).toEqual([
			{ path: ['name'], message: 'Required field' },
			{ path: ['email'], message: 'Invalid email' },
			{ path: ['extra'], message: 'Unknown field' },
		]);
		expect(result.data).toEqual({ email: 'invalid' });
	});
});

describe('normalizeFormFields', () => {
	afterEach(() => jest.restoreAllMocks());

	test('adds a honeypot without mutating the configured fields', () => {
		const configured = [{ name: 'email', type: 'email' }];

		const result = normalizeFormFields(configured);

		expect(result).toHaveLength(2);
		expect(result[1]).toMatchObject({
			name: '_hp_website',
			type: 'text',
			honeypot: true,
		});
		expect(configured).toHaveLength(1);
	});

	test('does not add a second honeypot', () => {
		const fields = [{ name: 'company', honeypot: true }];

		expect(normalizeFormFields(fields)).toEqual(fields);
	});
});
