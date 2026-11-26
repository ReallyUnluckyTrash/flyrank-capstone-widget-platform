# FlyRank Widget Platform

## What the system does

This project lets a user create a signup widget and place it on another website.

The widget collects information such as a name and email address. The API checks
the submission, blocks simple spam, looks up the visitor's location, and stores
the submission in PostgreSQL. A widget owner can then view their widgets,
submissions, and basic dashboard statistics.

The main parts are:

- Node.js and Express API
- React dashboard for authentication, analytics, widget configuration, and submissions
- PostgreSQL database running in Docker
- Supabase authentication for widget owners
- A small JavaScript file that displays the widget
- IP location lookup using two providers, with fallback behavior

## Architecture

```text
Widget owner
		|
		| login and manage widgets
		v
Express API :3000 -----------------------> Supabase Auth
		|
		| save widgets and submissions
		v
PostgreSQL database
		^
		|
Visitor's browser on another origin :4173
		|
		| loads widget.js
		| sends a signup submission
		v
Public widget endpoints
		|
		+--> validate input
		+--> rate limit and honeypot check
		+--> geo provider A, then provider B
		+--> save submission
		+--> optional webhook (does not block saving)
```

## Frontend dashboard

The React dashboard lives in `frontend/` and provides the interface widget
owners use to manage their account and widgets. It includes:

- Email/password sign-up and sign-in through the backend API
- An analytics overview with dashboard statistics
- A widget list and editor for configuring signup widgets
- A submissions view for reviewing collected signups
- Embed-code generation for placing a widget on another website

The frontend is built with React, React Router, and Vite. It calls the Express
API for authentication and dashboard data. During local development, Vite
proxies API requests to `http://localhost:3000`; in the Docker stack, the
dashboard is served on `http://localhost:3001`.

The repository keeps the frontend and backend separate while sharing
deployment and project configuration at the root:

```text
frontend/         React dashboard, Vite config, and frontend Dockerfile
  src/            UI, routes, and API helpers
backend/          Node.js package and backend Dockerfile
  src/            Express routes, controllers, services, and widget script
db/               PostgreSQL migrations
docker-compose.yml
```

## Run the project

Run these commands from the repository root in PowerShell or another terminal.

### 1. Check the environment file

Make sure the root `.env` file contains these values:

```text
POSTGRES_USER=user
POSTGRES_PASSWORD=local-only-change-this-password
POSTGRES_DB=widget_db
DATABASE_URL=postgresql://user:local-only-change-this-password@localhost:5432/widget_db
PUBLIC_APP_URL=http://localhost:3000
VITE_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_URL=<your Supabase project URL>
SUPABASE_KEY=<your Supabase publishable/anon key>
```

The example database password is for local development only. Use a unique
strong password for any public deployment.
`PUBLIC_APP_URL` and `VITE_PUBLIC_APP_URL` must be set to the public API origin
used by generated widget embed snippets. For local development, the example
values point to `http://localhost:3000`.

The Supabase project must allow email/password sign-up and login. The seed
script creates the demo users through the API's normal auth routes.

### 2. Start the API and database

```sh
docker compose up -d --build
```

The API is available at `http://localhost:3000` and the React dashboard at
`http://localhost:3001`.
The API exposes `/health/live` for process liveness and `/health/ready` for
database-backed readiness; Compose uses the readiness endpoint to monitor the
API container.
The seed command in the next step also runs this startup command, so you can
skip this step when you only want the demo environment.

To run the React dashboard outside Docker during development, start the API
and database as above, then run:

```sh
npm --prefix frontend install
npm --prefix frontend run dev
```

Vite serves the dashboard at `http://localhost:5173` and proxies API requests
to the Express API on port 3000. Use this workflow for frontend development;
the Docker stack serves the production frontend build on port 3001.

### 3. Seed demo data

```sh
npm --prefix backend run seed:demo
```

The seed command also starts or rebuilds the Docker stack and waits for the API
before creating the demo users through `/auth/signup` and `/auth/login`. It then
creates two widgets and six submissions. It is safe to run more than once.

Use these credentials for the seeded users:

```text
Email: demo@flyrank.local
Password: DemoPass!2026

Email: demo-alt@flyrank.local
Password: DemoPass!2026
```

The command prints the real Supabase user IDs. Use those IDs when testing
authenticated dashboard requests. They can be different if the project uses a
different Supabase instance.

The demo widget IDs are:

```text
aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
```

### 4. Start the second-origin test page

Open a second terminal and run:

```sh
python -m http.server 4173
```

Open `http://localhost:4173/widget-test.html`. This page is served from port
4173 and loads the widget JavaScript from the API on port 3000.

### 5. Log in and try the main endpoints

Get an access token with:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/auth/login -ContentType 'application/json' -Body '{"email":"demo@flyrank.local","password":"DemoPass!2026"}'
```

Use the returned `access_token` as a bearer token for widget management,
submissions, and dashboard requests.

```text
GET  http://localhost:3000/widgets/{widget_id}/config
POST http://localhost:3000/submissions
GET  http://localhost:3000/widgets/{widget_id}/submissions?page=1&page_size=25
GET  http://localhost:3000/dashboard/stats/overview
GET  http://localhost:3000/widget.js?id={widget_id}&v=1
```

The widget management and dashboard endpoints need a valid Supabase bearer
token. Public config, widget JavaScript, and submission creation do not need a
login token.

## One-line setup

To start the complete stack and load demo data:

```sh
npm --prefix backend run seed:demo
```

## Public demo with ngrok

The Compose stack binds its API and frontend to localhost. To make the demo
accessible through ngrok, open two terminals and start a tunnel for each:

```powershell
ngrok http 3000
ngrok http 3001
```

Use the port-3001 tunnel URL to open the dashboard. Put the port-3000 tunnel's
HTTPS URL in both `PUBLIC_APP_URL` and `VITE_PUBLIC_APP_URL` in your local
`.env` file. Those values are used to generate embed snippets and are not
needed in `.env.example`. Rebuild after changing the frontend URL:

```powershell
docker compose up -d --build
```

The ngrok URLs may change when tunnels restart; update `.env` and rebuild the
frontend if the API tunnel URL changes. Caddy is not part of this setup because
ngrok provides the public HTTPS endpoint. The named database volume persists
across container replacements, but it is not a backup. The SQL files mounted
into `docker-entrypoint-initdb.d` run only when PostgreSQL initializes an
empty volume; apply future schema changes using a migration process.

## Limitations

- Authentication depends on a working Supabase project and valid Supabase
	environment variables.
- Supabase email confirmation settings can affect whether the seeded users can
	log in. Disable required email confirmation for local testing if necessary.
- Demo tenant IDs come from Supabase at seed time. The widget IDs are fixed, but
	tenant IDs may change when seeding against another Supabase project.
- Geo lookup sends public visitor IP addresses to ipwho.is, then ipapi.co if the
	primary lookup fails. The ipwho.is free endpoint requires no API key, allows
	commercial use, and is limited to 1,000 requests per day without an uptime
	SLA; review the provider's current terms before relying on it for real users.
	The app stores submissions even when both providers fail, but the location
	will be empty.
- The rate limiter uses the API process's memory, so it is not suitable for
	multiple API servers without a shared rate-limit store.
- The webhook is optional and only sends a basic JSON request. It has no retry
	queue or delivery history.
- The test page uses local HTTP and is intended for development only.