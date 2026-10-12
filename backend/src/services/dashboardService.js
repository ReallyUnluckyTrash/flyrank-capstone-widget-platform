import { pool } from './databaseService.js';

export async function getOverviewStats(tenantId) {
	const result = await pool.query(
		`SELECT
			(SELECT COUNT(*) FROM submissions WHERE tenant_id = $1) AS total_submissions,
			(SELECT COUNT(*) FROM widgets WHERE tenant_id = $1) AS total_widgets,
			(SELECT COUNT(*) FROM submissions WHERE tenant_id = $1 AND is_spam = TRUE) AS spam_count`,
		[tenantId],
	);
	return result.rows[0];
}

export async function getSubmissionTimeseries(tenantId, from, to) {
	const result = await pool.query(
		`SELECT created_at::date AS date, COUNT(*) AS submissions
		 FROM submissions
		 WHERE tenant_id = $1
			AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
			AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
		 GROUP BY created_at::date
		 ORDER BY date`,
		[tenantId, from, to],
	);
	return result.rows;
}

export async function getWidgetStats(tenantId) {
	const result = await pool.query(
		`SELECT w.id AS widget_id, w.title, COUNT(s.id) AS submissions
		 FROM widgets w
		 LEFT JOIN submissions s
			ON s.widget_id = w.id AND s.tenant_id = w.tenant_id
		 WHERE w.tenant_id = $1
		 GROUP BY w.id, w.title
		 ORDER BY submissions DESC, w.title`,
		[tenantId],
	);
	return result.rows;
}

export async function getCountryStats(tenantId) {
	const result = await pool.query(
		`SELECT COALESCE(country, 'Unknown') AS country, COUNT(*) AS submissions
		 FROM submissions
		 WHERE tenant_id = $1
		 GROUP BY COALESCE(country, 'Unknown')
		 ORDER BY submissions DESC, country`,
		[tenantId],
	);
	return result.rows;
}

