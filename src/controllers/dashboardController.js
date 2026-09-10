import {
	getCountryStats,
	getOverviewStats,
	getSubmissionTimeseries,
	getWidgetStats,
} from '../services/dashboardService.js';

function getTenantId(request) {
	return request.user.id;
}

function parseDate(value, name) {
	if (value === undefined) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		const error = new Error(`${name} must be a valid date`);
		error.status = 400;
		throw error;
	}
	return date.toISOString();
}

function handleError(error, res, message) {
	if (error.status === 400) {
		return res.status(400).send({ error: error.message });
	}
	console.error(`${message}:`, error);
	return res.status(500).send({ error: message });
}

export const dashboardController = {
	async getOverview(req, res) {
		try {
			const stats = await getOverviewStats(getTenantId(req));
			return res.status(200).send({ data: stats });
		} catch (error) {
			return handleError(error, res, 'Unable to load dashboard overview');
		}
	},

	async getTimeseries(req, res) {
		try {
			const from = parseDate(req.query.from, 'from');
			const to = parseDate(req.query.to, 'to');
			const stats = await getSubmissionTimeseries(getTenantId(req), from, to);
			return res.status(200).send({ data: stats });
		} catch (error) {
			return handleError(error, res, 'Unable to load submission timeseries');
		}
	},

	async getWidget(req, res) {
		try {
			const stats = await getWidgetStats(getTenantId(req));
			return res.status(200).send({ data: stats });
		} catch (error) {
			return handleError(error, res, 'Unable to load widget statistics');
		}
	},

	async getCountry(req, res) {
		try {
			const stats = await getCountryStats(getTenantId(req));
			return res.status(200).send({ data: stats });
		} catch (error) {
			return handleError(error, res, 'Unable to load country statistics');
		}
	},
};
