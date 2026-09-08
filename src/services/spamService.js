export function isHoneypotFilled(fields, data) {
	return fields.some((field) => field.honeypot && typeof data[field.name] === 'string' && data[field.name].trim() !== '');
}
