import { describe, expect, test } from '@jest/globals';
import { isHoneypotFilled } from '../src/services/spamService.js';

describe('isHoneypotFilled', () => {
	const fields = [
		{ name: 'email', honeypot: false },
		{ name: '_hp_website', honeypot: true },
	];

	test('detects non-empty honeypot values', () => {
		expect(isHoneypotFilled(fields, { _hp_website: 'spam.example' })).toBe(true);
	});

	test.each([undefined, '', '   ', 123])('ignores an empty or non-string value: %s', (value) => {
		expect(isHoneypotFilled(fields, { _hp_website: value })).toBe(false);
	});

	test('ignores populated non-honeypot fields', () => {
		expect(isHoneypotFilled(fields, { email: 'person@example.com' })).toBe(false);
	});
});
