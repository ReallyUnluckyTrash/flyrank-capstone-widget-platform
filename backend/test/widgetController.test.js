import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

const createWidget = jest.fn();
const deleteWidget = jest.fn();
const getPublicWidgetConfig = jest.fn();
const getWidgetById = jest.fn();
const getWidgets = jest.fn();
const updateWidget = jest.fn();

jest.unstable_mockModule('../src/services/widgetService.js', () => ({
	createWidget,
	deleteWidget,
	getPublicWidgetConfig,
	getWidgetById,
	getWidgets,
	updateWidget,
}));

const { widgetController } = await import('../src/controllers/widgetController.js');

function createResponse() {
	return {
		status: jest.fn().mockReturnThis(),
		send: jest.fn().mockReturnThis(),
	};
}

describe('widgetController.createWidget', () => {
	const originalPublicAppUrl = process.env.PUBLIC_APP_URL;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.restoreAllMocks();
		if (originalPublicAppUrl === undefined) {
			delete process.env.PUBLIC_APP_URL;
		} else {
			process.env.PUBLIC_APP_URL = originalPublicAppUrl;
		}
	});

	test('requires the public API URL before creating a widget', async () => {
		delete process.env.PUBLIC_APP_URL;
		const res = createResponse();

		await widgetController.createWidget({
			body: { title: 'Signup', form_fields: [] },
			user: { id: 'tenant-1' },
		}, res);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.send).toHaveBeenCalledWith({
			error: 'PUBLIC_APP_URL is not configured',
		});
		expect(createWidget).not.toHaveBeenCalled();
	});

	test('normalizes the configured API URL in the generated embed snippet', async () => {
		process.env.PUBLIC_APP_URL = 'https://api.example.test///';
		createWidget.mockResolvedValue({ id: 'widget-1' });
		const res = createResponse();

		await widgetController.createWidget({
			body: { title: 'Signup', form_fields: [] },
			user: { id: 'tenant-1' },
		}, res);

		expect(res.status).toHaveBeenCalledWith(201);
		expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
			embed_snippet: '<script src="https://api.example.test/widget.js?id=widget-1&v=1" defer></script>',
		}));
	});
});
