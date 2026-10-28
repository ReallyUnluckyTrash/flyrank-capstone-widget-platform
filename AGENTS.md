# Agent Guide

## Project layout

- `backend/` contains the Node.js/Express API, organized into routes, controllers, middleware, and services. The public signup widget script is in `backend/src/widget/`.
- `frontend/` contains the React dashboard, built with Vite.
- `db/migrations/` contains PostgreSQL schema migrations, mounted into the database container during initialization.
- `docker-compose.yml` defines the local PostgreSQL, API, and frontend services.
- `README.md` documents the system architecture, local setup, demo data, and API usage. Refer to it rather than duplicating setup details here.

## Validation

Run commands from the repository root:

- Backend tests: `npm --prefix backend test`
- Frontend tests: `npm --prefix frontend test`
- Frontend production build: `npm --prefix frontend run build`
- Local Docker stack: `docker compose up -d --build` (requires the root `.env` values documented in `README.md`)

Run the relevant checks for the area changed. Backend tests use Jest; frontend tests use Vitest, jsdom, and Testing Library.

## Working conventions

- Keep backend modules in ES module syntax and follow the existing route/controller/service boundaries.
- Keep database schema changes in `db/migrations/` and use the existing PostgreSQL schema as the source of truth.
- Follow nearby code formatting and component/service patterns; formatting is not uniform across the frontend and backend.
- Do not commit `.env` or expose credentials. Use `.env.example` as the checked-in configuration template.
