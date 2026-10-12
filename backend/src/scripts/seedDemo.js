import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../../.env', import.meta.url), override: true });

const { pool } = await import('../services/databaseService.js');

const apiUrl = process.env.PUBLIC_APP_URL || 'http://localhost:3000';
const demoTenants = [
	{
		email: 'demo@flyrank.local',
		password: 'DemoPass!2026',
		companyName: 'FlyRank Demo Co',
	},
	{
		email: 'demo-alt@flyrank.local',
		password: 'DemoPass!2026',
		companyName: 'Northstar Demo Labs',
	},
];

const demoWidgets = [
	{
		id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
		tenantIndex: 0,
		title: 'Product Updates',
		description: 'Get product news and launch notes.',
		buttonText: 'Join the list',
		displayOptions: { theme_color: '#fb4934' },
		formFields: [
			{ name: 'name', label: 'Name', type: 'text', required: true },
			{ name: 'email', label: 'Email', type: 'email', required: true },
		],
	},
	{
		id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
		tenantIndex: 1,
		title: 'Early Access',
		description: 'Be first to try the next release.',
		buttonText: 'Request access',
		displayOptions: { theme_color: '#458588' },
		formFields: [
			{ name: 'email', label: 'Work email', type: 'email', required: true },
			{ name: 'company', label: 'Company', type: 'text', required: false },
		],
	},
];

const submissionNames = [
	['Avery Stone', 'avery@example.com'],
	['Jordan Lee', 'jordan@example.com'],
	['Morgan Ellis', 'morgan@example.com'],
	['Riley Chen', 'riley@example.com'],
	['Taylor Brooks', 'taylor@example.com'],
	['Casey Patel', 'casey@example.com'],
];

async function authRequest(path, body) {
	let response;
	let lastError;
	for (let attempt = 0; attempt < 15; attempt += 1) {
		try {
			response = await fetch(`${apiUrl}${path}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			break;
		} catch (error) {
			lastError = error;
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}
	if (!response) throw new Error(`${path} unavailable: ${lastError?.message}`);
	const result = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(`${path} failed (${response.status}): ${result.error || 'unknown error'}`);
	}
	return result;
}

async function getDemoTenant(tenant) {
	try {
		await authRequest('/auth/signup', {
			email: tenant.email,
			password: tenant.password,
		});
	} catch (error) {
		if (!error.message.includes('already registered')) throw error;
	}

	const login = await authRequest('/auth/login', {
		email: tenant.email,
		password: tenant.password,
		company_name: tenant.companyName,
	});
	const profileResponse = await fetch(`${apiUrl}/auth/protected/profile`, {
		headers: { Authorization: `Bearer ${login.access_token}` },
	});
	const profile = await profileResponse.json();
	if (!profileResponse.ok) {
		throw new Error(`/auth/protected/profile failed (${profileResponse.status})`);
	}
	return { ...tenant, id: profile.id };
}

async function seed() {
	const authenticatedTenants = await Promise.all(demoTenants.map(getDemoTenant));
	await pool.query('BEGIN');
	try {
		for (const widget of demoWidgets) {
			const tenant = authenticatedTenants[widget.tenantIndex];
			await pool.query(
				`INSERT INTO widgets
					(id, tenant_id, title, description, form_fields, button_text, display_options)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)
				 ON CONFLICT (id) DO UPDATE SET
					tenant_id = EXCLUDED.tenant_id,
					title = EXCLUDED.title,
					description = EXCLUDED.description,
					form_fields = EXCLUDED.form_fields,
					button_text = EXCLUDED.button_text,
					display_options = EXCLUDED.display_options,
					updated_at = NOW()`,
				[
					widget.id,
					tenant.id,
					widget.title,
					widget.description,
					JSON.stringify(widget.formFields),
					widget.buttonText,
					JSON.stringify(widget.displayOptions),
				],
			);
		}

		for (let index = 0; index < submissionNames.length; index += 1) {
			const [name, email] = submissionNames[index];
			const widget = demoWidgets[index % demoWidgets.length];
			const tenant = authenticatedTenants[widget.tenantIndex];
			await pool.query(
				`INSERT INTO submissions
					(id, widget_id, tenant_id, data, ip_address, country, city, is_spam, created_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - ($9 * INTERVAL '1 day'))
				 ON CONFLICT (id) DO UPDATE SET
					widget_id = EXCLUDED.widget_id,
					tenant_id = EXCLUDED.tenant_id,
					data = EXCLUDED.data,
					ip_address = EXCLUDED.ip_address,
					country = EXCLUDED.country,
					city = EXCLUDED.city,
					is_spam = EXCLUDED.is_spam,
					created_at = EXCLUDED.created_at`,
				[
					`cccccccc-cccc-4ccc-8ccc-cccccccccc${String(index + 1).padStart(2, '0')}`,
					widget.id,
					tenant.id,
					JSON.stringify(widget.id === demoWidgets[0].id ? { name, email } : { email, company: 'Demo Company' }),
					`203.0.113.${index + 10}`,
					index % 3 === 0 ? 'United States' : index % 3 === 1 ? 'Canada' : 'United Kingdom',
					index % 2 === 0 ? 'Austin' : 'Toronto',
					index === submissionNames.length - 1,
					index,
				],
			);
		}

		await pool.query('COMMIT');
		console.log('Demo data seeded successfully.');
		for (const tenant of authenticatedTenants) {
			console.log(`Tenant: ${tenant.email} / ${tenant.password} / ${tenant.id}`);
		}
		console.log('Widget A: aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
		console.log('Widget B: bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
		console.log('Run again safely: npm run seed:demo');
	} catch (error) {
		await pool.query('ROLLBACK');
		throw error;
	} finally {
		await pool.end();
	}
}

seed().catch((error) => {
	console.error('Unable to seed demo data:', error.message);
	process.exitCode = 1;
});
