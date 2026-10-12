import { randomUUID } from 'node:crypto';
import { pool } from './databaseService.js';
import { enrichIp } from './geoService.js';
import { isHoneypotFilled } from './spamService.js';
import { validateConfiguredFields } from '../middleware/validation.js';
import { getWidgetForSubmission } from './widgetService.js';
import { broadcastToTenant } from './sseService.js';

export class SubmissionError extends Error {
	constructor(status, message, details) {
		super(message);
		this.status = status;
		this.details = details;
	}
}

async function sendWebhook(payload) {
	if (!process.env.WEBHOOK_URL) return;

	try {
		await fetch(process.env.WEBHOOK_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(3000),
		});
	} catch (error) {
		console.warn('Submission webhook failed:', error.message);
	}
}

export async function createSubmission(widgetId, data, request) {
	const widget = await getWidgetForSubmission(widgetId);
	if (!widget) throw new SubmissionError(404, 'Widget not found');
	if (widget.type !== 'signup') throw new SubmissionError(400, 'Unsupported widget type');

	const fields = Array.isArray(widget.form_fields) ? widget.form_fields : [];
	if (isHoneypotFilled(fields, data)) {
		throw new SubmissionError(429, 'Submission rejected');
	}

	const validated = validateConfiguredFields(fields, data);
	if (validated.errors.length > 0) {
		throw new SubmissionError(400, 'Invalid submission fields', validated.errors);
	}

	const geo = await enrichIp(request);
	const submissionId = randomUUID();
	await pool.query(
		`INSERT INTO submissions
			(id, widget_id, tenant_id, data, ip_address, country, city)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		[submissionId, widget.id, widget.tenant_id, JSON.stringify(validated.data), geo.ipAddress, geo.country, geo.city],
	);

	const payload = {
		id: submissionId,
		widget_id: widget.id,
		tenant_id: widget.tenant_id,
		data: validated.data,
		country: geo.country,
		city: geo.city,
	};
	broadcastToTenant(widget.tenant_id, 'submission.created', payload);
	void sendWebhook(payload);

	return { id: submissionId };
}

export async function getWidgetSubmissions(widgetId, tenantId, page, pageSize) {
	const widgetResult = await pool.query(
		'SELECT id FROM widgets WHERE id = $1 AND tenant_id = $2',
		[widgetId, tenantId],
	);
	if (!widgetResult.rows[0]) return null;

	const offset = (page - 1) * pageSize;
	const [countResult, submissionsResult] = await Promise.all([
		pool.query(
			'SELECT COUNT(*)::int AS total FROM submissions WHERE widget_id = $1 AND tenant_id = $2',
			[widgetId, tenantId],
		),
		pool.query(
			`SELECT id, widget_id, data, country, city, is_spam, created_at
			 FROM submissions
			 WHERE widget_id = $1 AND tenant_id = $2
			 ORDER BY created_at DESC, id DESC
			 LIMIT $3 OFFSET $4`,
			[widgetId, tenantId, pageSize, offset],
		),
	]);

	return {
		data: submissionsResult.rows,
		pagination: {
			page,
			page_size: pageSize,
			total: countResult.rows[0].total,
			total_pages: Math.ceil(countResult.rows[0].total / pageSize),
		},
	};
}
