import * as z from "zod";

const submissionEnvelopeSchema = z.object({
	widget_id: z.uuid(),
	data: z.record(z.string(), z.string()),
}).strict();

export function validateSubmissionPayload(req, res, next) {
	const result = submissionEnvelopeSchema.safeParse(req.body);
	if (!result.success) {
		return res.status(400).send({
			error: 'Invalid submission payload',
			details: result.error.issues,
		});
	}

	req.validatedSubmission = result.data;
	return next();
}

export function validateConfiguredFields(fields, data) {
	const errors = [];
	const configuredNames = new Set();
	const parsedData = {};

	for (const field of fields) {
		const name = field.name;
		configuredNames.add(name);
		const value = data[name] ?? '';

		if (field.honeypot) {
			continue;
		}

		if (field.required && value.trim() === '') {
			errors.push({ path: [name], message: 'Required field' });
			continue;
		}

		if (value !== '' && field.type === 'email' && !z.email().safeParse(value).success) {
			errors.push({ path: [name], message: 'Invalid email' });
		}

		parsedData[name] = value;
	}

	for (const name of Object.keys(data)) {
		if (!configuredNames.has(name)) {
			errors.push({ path: [name], message: 'Unknown field' });
		}
	}

	return { errors, data: parsedData };
}

export function normalizeFormFields(fields) {
	const normalized = Array.isArray(fields) ? [...fields] : [];
	if (!normalized.some((field) => field?.honeypot === true)) {
		normalized.push({
			name: '_hp_website',
			label: 'Website',
			type: 'text',
			required: false,
			honeypot: true,
		});
	}
	return normalized;
}