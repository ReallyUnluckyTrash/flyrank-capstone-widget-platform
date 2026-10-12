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
POSTGRES_PASSWORD=password
DATABASE_URL=postgresql://user:password@localhost:5432/widget_db
SUPABASE_URL=<your Supabase project URL>
SUPABASE_KEY=<your Supabase publishable/anon key>
```

The Supabase project must allow email/password sign-up and login. The seed
script creates the demo users through the API's normal auth routes.

### 2. Start the API and database

```sh
docker compose up -d --build
```

The API is available at `http://localhost:3000` and the React dashboard at
`http://localhost:3001`.
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

## Limitations

- Authentication depends on a working Supabase project and valid Supabase
	environment variables.
- Supabase email confirmation settings can affect whether the seeded users can
	log in. Disable required email confirmation for local testing if necessary.
- Demo tenant IDs come from Supabase at seed time. The widget IDs are fixed, but
	tenant IDs may change when seeding against another Supabase project.
- Geo lookup depends on external internet services. The app stores the
	submission even when both providers fail, but the location will be empty.
- The rate limiter uses the API process's memory, so it is not suitable for
	multiple API servers without a shared rate-limit store.
- The webhook is optional and only sends a basic JSON request. It has no retry
	queue or delivery history.
- The test page uses local HTTP and is intended for development only.