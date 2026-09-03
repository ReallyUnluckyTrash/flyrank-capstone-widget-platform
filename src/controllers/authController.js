import { createAccount, signIn, upsertTenant } from '../services/authService.js';

function getCredentials(request) {
  const { email, password } = request.body ?? {};
  return email && password ? { email, password } : null;
}

  function getCompanyName(request) {
    return typeof request.body?.company_name === 'string'
    ? request.body.company_name.trim() || null
    : null;
  }

export const authController = {
  async signup(req, res) {
    const credentials = getCredentials(req);
    if (!credentials) {
        return res.status(400).send({ error: 'Email and password are required' });
    }

    const { data, error } = await createAccount(credentials);
    if (error) {
      return res.status(400).send({ error: error.message });
    }
    return res.status(201).send({ data: data.user });
  },

  async login(req, res) {
    const credentials = getCredentials(req);
    if (!credentials) {
        return res.status(400).send({ error: 'Email and password are required' });
    }

    const { data, error } = await signIn(credentials);
    if (error) {
      return res.status(401).send({ error: error.message });
    }

    try {
        await upsertTenant(data.user, getCompanyName(req));
    } catch (tenantError) {
      console.error('Unable to create tenant record:', tenantError);
      return res.status(500).send({ error: 'Unable to create tenant record' });
    }

    return res.status(200).send({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  },

  profile(req, res) {
    const { user } = req;
    return res.status(200).send({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    });
  },
};