# Flyrank Widget Platform — Design Document

## 1. The Problem

Widgets are normally embedded on websites the platform owner doesn't control, which means the public submission endpoint receives requests from arbitrary, untrusted origins at unpredictable volume. This project builds a signup-widget platform around that constraint: a tenant creates a widget through an authenticated API, embeds it anywhere via a single script tag, and the backend must safely validate, rate-limit, enrich, and store whatever the public internet sends back — without ever trusting the client or letting a failing dependency take the system down.

## 2. Data Model

The system has three tables, each mapping directly to one of the three request paths described in Section 1: tenants own widgets, widgets receive submissions, and every submission carries its tenant forward for isolation.

### Tenants

Represents each customer/account on the platform. Fields are shaped to sit on top of Supabase Auth rather than duplicate it — this table stores account-level data, not credentials.

| Field | Type | Constraints / Purpose |
|---|---|---|
| `id` | UUID | Primary key; matches `auth.users.id` |
| `email` | TEXT | Mirrored from Supabase Auth for display/dashboard use |
| `company_name` | TEXT | Nullable; displayed in dashboard |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### Widgets

Represents each signup-form widget a tenant creates. Scoped to `type = "signup"` for this build — the column stays a string rather than an enum so a second type can be added later without a migration, but only `"signup"` is implemented now.

| Field | Type | Constraints / Purpose |
|---|---|---|
| `id` | UUID | Primary key; used by the embed snippet |
| `tenant_id` | UUID | FK → `tenants.id`; used for tenant isolation |
| `type` | TEXT | Fixed to `signup` for this build |
| `title` | TEXT | Widget heading |
| `description` | TEXT | Nullable; widget subtext |
| `form_fields` | JSONB | Ordered array of field definitions |
| `button_text` | TEXT | Defaults to `Sign up` |
| `display_options` | JSONB | Position, trigger, and theming |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Index:** `idx_widgets_tenant_id` on `tenant_id` — every widget-management query is filtered by the authenticated tenant, so this index is load-bearing for the isolation guarantee, not just performance.

**`form_fields` shape** — an ordered array the frontend renders directly, and the backend validates submissions against field-by-field:

```json
[
  { "name": "email", "label": "Email address", "type": "email", "required": true },
  { "name": "full_name", "label": "Full name", "type": "text", "required": false },
  { "name": "_hp_website", "label": "Website", "type": "text", "required": false, "honeypot": true }
]
```

**`display_options` shape** — presentation only, never touched by validation logic:

```json
{ "position": "bottom-right", "trigger": "on_load", "delay_seconds": 0, "theme_color": "#4F46E5" }
```

### Submissions

Represents each visitor's completed (or attempted) signup. `tenant_id` is denormalized onto this table rather than joined through widgets on every read, because the dashboard's most common query pattern is "all submissions for this tenant" — joining through widgets for every dashboard page load would be wasteful when the FK can just be copied at insert time.

| Field | Type | Constraints / Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `widget_id` | UUID | Foreign key → `widgets.id` |
| `tenant_id` | UUID | Foreign key → `tenants.id`; denormalized for direct tenant-scoped queries |
| `data` | JSONB | Submitted field values, keyed to `form_fields[].name` |
| `ip_address` | INET | Nullable; source for geo enrichment; not exposed via API |
| `country` | TEXT | Nullable; populated by geo enrichment; null if all providers fail |
| `city` | TEXT | Nullable; populated by geo enrichment; null if all providers fail |
| `is_spam` | BOOLEAN | Default `false`; set `true` on honeypot hit; stored but excluded from dashboard counts by default |
| `created_at` | TIMESTAMPTZ | Submission timestamp |

**Indexes:** `idx_submissions_tenant_id` and `idx_submissions_widget_id` — the former backs tenant isolation on the dashboard API, the latter backs per-widget stats (Requirement 6).

**Tenant isolation enforcement:** every query against `widgets` and `submissions` is scoped by `tenant_id` pulled from the authenticated session (Supabase JWT), never from a request parameter or body — a request can't claim a different tenant's ID and read their data, because the ID used for filtering is never client-supplied on authenticated routes.

## 3. The Embed Flow

The lifecycle has four steps, each crossing from one actor to the next.

1. **Create** — the tenant creates a signup widget via the authenticated Widget Management API. The response includes the widget's `id` and the ready-to-use embed snippet:

   ```html
   <script src="https://api.example.com/widget.js?id=abc123"></script>
   ```

2. **Load** — the tenant pastes that script tag into their own website (a separate origin from the API). When a visitor loads that page, the script fetches the widget's config from a public, cached endpoint using the `id` in the query string.

3. **Render** — the script uses the returned config (`form_fields`, `display_options`, `button_text`) to render the signup form directly on the customer's page — no additional assets or origins involved.

4. **Submit** — when the visitor fills out and submits the form, the script sends the data cross-origin to the public submission endpoint. The backend validates, checks the honeypot, rate-limits, enriches with geo data, stores the row, and fires a best-effort confirmation email — all before returning a response to the visitor's browser.

This is also the order the system is built in: Phase 2 hardens step 4 first since it is the highest-risk path, then Phase 3 wires up steps 2 and 3 around it.

## 4. API Surface / Contracts (for all three paths)

Endpoints are grouped by actor, matching the three paths in the architecture diagram. Auth is enforced via Supabase JWT; public endpoints take no auth but are still validated and rate-limited.

### Auth (authenticated / semi-public)

- **`POST /signup`** — create an account. Body: `email`, `password`. Returns `400` if credentials are missing/invalid, otherwise `201` with the created user.
- **`POST /login`** — sign in. Body: `email`, `password` (plus optional company name for first-time tenant provisioning). On success, upserts a tenant record for the user and returns `200` with `access_token` and `refresh_token`. Returns `400` for missing credentials, `401` for invalid credentials, `500` if tenant record creation fails post-login.
- **`GET /profile`** *(requireAuth)* — returns the authenticated user's `id`, `email`, `created_at`.

### Widget owner (authenticated) — Widget Management API

- **`POST /widgets`** *(requireAuth)* — create a widget. Body: `title`, `description`, `form_fields`, `button_text`, `display_options`. Returns `400` if `title` or `form_fields` is missing. Returns `201` with the created widget plus `embed_snippet`.
- **`GET /widgets`** *(requireAuth)* — list the authenticated tenant's widgets.
- **`GET /widgets/:id`** *(requireAuth)* — fetch one widget. `404` if it doesn't exist or doesn't belong to the tenant.
- **`PATCH /widgets/:id`** *(requireAuth)* — update a widget. `404` if it doesn't belong to the tenant.
- **`DELETE /widgets/:id`** *(requireAuth)* — delete a widget. Returns `204` on success, `404` if it doesn't belong to the tenant.

All queries scoped to the authenticated `tenant_id`, backed by the widget DB's tenant isolation (Section 2).

### Customer website (any origin, public, cached, CORS)

- **`GET /widget.js`** — the versioned JS loader script referenced by the embed snippet. Served with `Cache-Control: public, max-age=31536000, immutable` (cache-busted by URL/filename on release, not by this header alone).
- **`GET /widgets/:id/config`** *(CORS-enabled)* — public widget config (`form_fields`, `display_options`, `button_text`). Served with `Cache-Control: public, max-age=60, s-maxage=60`. Returns `404` for an unknown id, no tenant data leaked.

### Website visitor (public, CORS)

- **`OPTIONS /submissions`** *(CORS)* — preflight, handled explicitly via `cors()`.
- **`POST /submissions`** *(CORS, rate-limited, validated)* — accepts `{ widget_id, data }`. Pipeline, in order:
  1. **Validation** (`validateSubmissionPayload` middleware) — malformed or oversized payload → `4xx`, never reaches the controller.
  2. **Rate limit + spam check** (`limiter` middleware) — flood → `429`, before controller logic runs.
  3. **Submission processing** (inside `createSubmission`) — geo enrichment (Provider A → Provider B → no geo data), spam/honeypot check, store submission, then fire-and-forget email/webhook side effect (failure does not block the response).
     - Known/expected failures (e.g. bad `widget_id`, spam rejection) throw a `SubmissionError` and return its `status` + `message` + `details`.
     - Unexpected failures are logged and return `500` `{ error: 'Unable to process submission' }`.
     - Returns `201` with `{ data: submission, message: 'Submission received' }` on success.

### Widget owner (authenticated) — Dashboard API

- **`GET /widgets/:id/submissions`** *(requireAuth)* — paginated submissions for one widget, scoped to the authenticated tenant.
  - Query params:
    - `page` — positive integer, default `1`. Non-numeric/non-positive → `400`.
    - `page_size` (alias: `limit`) — positive integer, default `DEFAULT_PAGE_SIZE`. Non-numeric/non-positive → `400`. Values above `MAX_PAGE_SIZE` → `400` `{ error: 'page_size must be at most {MAX_PAGE_SIZE}' }`.
  - Returns `404` if the widget doesn't exist or doesn't belong to the tenant.
  - Returns `200` with the paginated result (submissions + pagination metadata) on success.
  - Any other thrown error with `status === 400` returns `400` with its message; unexpected errors are logged and return `500` `{ error: 'Unable to load widget submissions' }`.
- **`GET /stats/overview`** *(requireAuth)* — aggregate overview stats (e.g. total submissions). `500` on failure via shared `handleError`.
- **`GET /stats/timeseries`** *(requireAuth)* — submissions over time. Query params `from`, `to` (parsed as dates; invalid dates presumably error via `parseDate`). `500` on failure.
- **`GET /stats/widget`** *(requireAuth)* — per-widget submission breakdown. `500` on failure.
- **`GET /stats/country`** *(requireAuth)* — geo/country breakdown. `500` on failure.
- **`GET /stats/stream`** *(requireAuth, SSE)* — Server-Sent Events stream for the authenticated tenant. Sends `event: connected` on open, a `: heartbeat` comment every 30s, and `broadcastToTenant(tenantId, event, payload)` events on server-side data changes (e.g. new submissions). Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no`. Connections tracked per-tenant in memory, cleaned up on client/response close.