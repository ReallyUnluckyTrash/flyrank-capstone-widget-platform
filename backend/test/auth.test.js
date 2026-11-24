import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const createAccount = jest.fn();
const getUser = jest.fn();
const signIn = jest.fn();
const upsertTenant = jest.fn();

jest.unstable_mockModule('../src/services/authService.js', () => ({
	createAccount,
	getUser,
	signIn,
	upsertTenant,
}));

const { authController } = await import('../src/controllers/authController.js');
const { requireAuth } = await import('../src/middleware/auth.js');

function createResponse() {
	return {
		status: jest.fn().mockReturnThis(),
		send: jest.fn().mockReturnThis(),
	};
}

describe('requireAuth', () => {
	beforeEach(() => jest.clearAllMocks());

	test('rejects requests without a bearer token without calling the auth service', async () => {
		const req = { headers: {} };
		const res = createResponse();
		const next = jest.fn();

		await requireAuth(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.send).toHaveBeenCalledWith({ error: 'Access token is required' });
		expect(getUser).not.toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});

	test('rejects invalid or expired tokens', async () => {
		getUser.mockResolvedValue({ user: null, error: new Error('expired') });
		const req = { headers: { authorization: 'Bearer expired-token' } };
		const res = createResponse();
		const next = jest.fn();

		await requireAuth(req, res, next);

		expect(getUser).toHaveBeenCalledWith('expired-token');
		expect(res.status).toHaveBeenCalledWith(401);
		expect(next).not.toHaveBeenCalled();
	});

	test('sets the authenticated user and tenant before continuing', async () => {
		const user = { id: 'tenant-1', email: 'person@example.com' };
		getUser.mockResolvedValue({ user, error: null });
		const req = { headers: { authorization: 'Bearer valid-token' } };
		const res = createResponse();
		const next = jest.fn();

		await requireAuth(req, res, next);

		expect(req.user).toBe(user);
		expect(req.tenantId).toBe('tenant-1');
		expect(next).toHaveBeenCalledTimes(1);
		expect(res.status).not.toHaveBeenCalled();
	});
});

describe('authController', () => {
	beforeEach(() => jest.clearAllMocks());

	test('rejects login when credentials are missing', async () => {
		const res = createResponse();

		await authController.login({ body: { email: 'person@example.com' } }, res);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(signIn).not.toHaveBeenCalled();
	});

	test('creates the tenant on successful login and returns the session tokens', async () => {
		const user = { id: 'tenant-1', email: 'person@example.com' };
		signIn.mockResolvedValue({
			data: {
				user,
				session: { access_token: 'access', refresh_token: 'refresh' },
			},
			error: null,
		});
		upsertTenant.mockResolvedValue(undefined);
		const res = createResponse();

		await authController.login({
			body: { email: user.email, password: 'secret', company_name: '  Example Co  ' },
		}, res);

		expect(upsertTenant).toHaveBeenCalledWith(user, 'Example Co');
		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.send).toHaveBeenCalledWith({
			access_token: 'access',
			refresh_token: 'refresh',
		});
	});

	test('returns an error when tenant setup fails after login', async () => {
		const user = { id: 'tenant-1', email: 'person@example.com' };
		signIn.mockResolvedValue({
			data: { user, session: { access_token: 'access', refresh_token: 'refresh' } },
			error: null,
		});
		upsertTenant.mockRejectedValue(new Error('database unavailable'));
		jest.spyOn(console, 'error').mockImplementation(() => {});
		const res = createResponse();

		await authController.login({
			body: { email: user.email, password: 'secret' },
		}, res);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.send).toHaveBeenCalledWith({ error: 'Unable to create tenant record' });
	});
});
