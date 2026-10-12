import { randomUUID } from 'node:crypto';
import { pool } from './databaseService.js';
import { normalizeFormFields } from '../middleware/validation.js';

export async function createWidget(tenantId, input) {
	const result = await pool.query(
		`INSERT INTO widgets
			(id, tenant_id, title, description, form_fields, button_text, display_options)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING *`,
		[
			randomUUID(),
			tenantId,
			input.title,
			input.description ?? null,
			JSON.stringify(normalizeFormFields(input.form_fields)),
			input.button_text ?? 'Sign up',
			JSON.stringify(input.display_options ?? {}),
		],
	);
	return result.rows[0];
}

export async function getWidgets(tenantId) {
	const result = await pool.query(
		'SELECT * FROM widgets WHERE tenant_id = $1 ORDER BY created_at DESC',
		[tenantId],
	);
	return result.rows;
}

export async function getWidgetById(widgetId, tenantId) {
	const result = await pool.query(
		'SELECT * FROM widgets WHERE id = $1 AND tenant_id = $2',
		[widgetId, tenantId],
	);
	return result.rows[0] ?? null;
}

export async function getPublicWidgetConfig(widgetId) {
	const result = await pool.query(
		`SELECT title, description, form_fields, display_options, button_text
		 FROM widgets
		 WHERE id = $1`,
		[widgetId],
	);
	if (!result.rows[0]) return null;
	return {
		...result.rows[0],
		form_fields: normalizeFormFields(result.rows[0].form_fields),
	};
}

export async function getWidgetForSubmission(widgetId) {
	const result = await pool.query(
		`SELECT id, tenant_id, type, form_fields
		 FROM widgets
		 WHERE id = $1`,
		[widgetId],
	);
	if (!result.rows[0]) return null;
	return {
		...result.rows[0],
		form_fields: normalizeFormFields(result.rows[0].form_fields),
	};
}

export async function updateWidget(widgetId, tenantId, input) {
	const fields = Object.keys(input);
	if (fields.length === 0) {
		return getWidgetById(widgetId, tenantId);
	}

	const values = [widgetId, tenantId];
	const assignments = fields.map((field, index) => {
		const value = field === 'form_fields'
			? JSON.stringify(normalizeFormFields(input[field]))
			: field === 'display_options'
				? JSON.stringify(input[field] ?? {})
				: input[field];
		values.push(value);
		return `${field} = $${index + 3}`;
	});
	values.push(new Date());

	const result = await pool.query(
		`UPDATE widgets
		 SET ${assignments.join(', ')}, updated_at = $${values.length}
		 WHERE id = $1 AND tenant_id = $2
		 RETURNING *`,
		values,
	);
	return result.rows[0] ?? null;
}

export async function deleteWidget(widgetId, tenantId) {
	const result = await pool.query(
		'DELETE FROM widgets WHERE id = $1 AND tenant_id = $2 RETURNING id',
		[widgetId, tenantId],
	);
	return result.rowCount > 0;
}
