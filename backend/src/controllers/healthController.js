import { pool } from '../services/databaseService.js';

export const healthController = {
	live(req, res) {
		return res.status(200).send({ status: 'ok' });
	},

	async ready(req, res) {
		try {
			await pool.query('SELECT 1');
			return res.status(200).send({ status: 'ready' });
		} catch (error) {
			console.error('API readiness check failed:', error);
			return res.status(503).send({ status: 'not_ready' });
		}
	},
};
