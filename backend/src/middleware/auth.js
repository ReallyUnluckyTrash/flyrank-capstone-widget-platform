import { getUser } from '../services/authService.js';

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ error: 'Access token is required' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const { user, error } = await getUser(token);

  if (error || !user) {
    return res.status(401).send({ error: 'Invalid or expired access token' });
  }

  req.user = user;
  req.tenantId = user.id; // Assuming tenantId is the same as user.id; adjust if necessary
  return next();
}