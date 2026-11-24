import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const query = jest.fn();

jest.unstable_mockModule('../src/services/databaseService.js', () => ({
	pool: { query },
}));

const {
	deleteWidget,
	getPublicWidgetConfig,
	getWidgetById,
	updateWidget,
} = await import('../src/services/widgetService.js');

describe('widgetService tenant scoping', () => {
	beforeEach(() => query.mockReset());

	test('only finds a widget when both its ID and tenant ID match', async () => {
		query.mockResolvedValue({ rows: [] });

		await expect(getWidgetById('widget-1', 'tenant-1')).resolves.toBeNull();

		expect(query).toHaveBeenCalledWith(
			expect.stringContaining('WHERE id = $1 AND tenant_id = $2'),
			['widget-1', 'tenant-1'],
		);
	});

	test('updates a widget only for the owning tenant', async () => {
		query.mockResolvedValue({ rows: [] });

		await expect(updateWidget('widget-1', 'tenant-1', { title: 'Updated' }))
			.resolves.toBeNull();

		const [sql, values] = query.mock.calls[0];
		expect(sql).toContain('WHERE id = $1 AND tenant_id = $2');
		expect(values.slice(0, 3)).toEqual(['widget-1', 'tenant-1', 'Updated']);
	});

	test('deletes a widget only for the owning tenant', async () => {
		query.mockResolvedValue({ rowCount: 0 });

		await expect(deleteWidget('widget-1', 'tenant-1')).resolves.toBe(false);

		expect(query).toHaveBeenCalledWith(
			expect.stringContaining('WHERE id = $1 AND tenant_id = $2'),
			['widget-1', 'tenant-1'],
		);
	});

	test('public widget config selects only fields intended for the public', async () => {
		query.mockResolvedValue({ rows: [] });

		await getPublicWidgetConfig('widget-1');

		const [sql, values] = query.mock.calls[0];
		expect(sql).toContain('SELECT title, description, form_fields, display_options, button_text');
		expect(sql).not.toContain('tenant_id');
		expect(values).toEqual(['widget-1']);
	});
});
