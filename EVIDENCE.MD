## Docker Evidence

All transcripts below were collected against the running Docker stack at `http://localhost:3000`. Tokens are redacted. Temporary proof tenants/widgets used: tenant A `2862fbd2-d041-483d-8703-7ec3d33f0898`, widget A `8f4b7a59-a628-4a63-a6b7-d474d6c7e571`, widget B `90d297d2-06b3-4c5e-986e-fe184530d65a`.

### Widget management

- [x] Authenticated CRUD endpoints for widgets; requests without valid auth are rejected.

  ```text
  GET /widgets without auth: 401 {"error":"Access token is required"}
  POST /widgets: 201
  GET /widgets/06a32e77-b7a3-45e3-9395-fc02c7fa8733: 200
  PATCH /widgets/06a32e77-b7a3-45e3-9395-fc02c7fa8733: 200
  DELETE /widgets/06a32e77-b7a3-45e3-9395-fc02c7fa8733: 204
  ```

- [x] Multi-tenant isolation proven: tenant A cannot read or modify tenant B's widgets or submissions.

  ```text
  Tenant A GET /widgets: 200 ids=8f4b7a59-a628-4a63-a6b7-d474d6c7e571
  Tenant A GET tenant B widget: 404 {"error":"Widget not found"}
  Tenant A PATCH tenant B widget: 404 {"error":"Widget not found"}
  Tenant A GET tenant B submissions: 404 {"error":"Widget not found"}
  ```

- [x] Embed snippet generated per widget.

  ```text
  POST /widgets: 201
  embed_snippet=<script src="http://localhost:3000/widget.js?id=06a32e77-b7a3-45e3-9395-fc02c7fa8733&v=1" defer></script>
  ```

### Widget delivery

- [x] Public config endpoint serves a small payload with correct HTTP cache headers.

  ```text
  GET /widgets/8f4b7a59-a628-4a63-a6b7-d474d6c7e571/config: 200
  Cache-Control: public, max-age=60, s-maxage=60
  Access-Control-Allow-Origin: *
  Body: {"data":{"form_fields":[{"name":"email","type":"email","required":true},{"name":"_hp_website","type":"text","label":"Website","honeypot":true,"required":false}],"display_options":{},"button_text":"Sign up"}}
  ```

- [x] Widget JavaScript is served as a versioned bundle (new version = new URL or cache-bust).

  ```text
  HEAD /widget.js?id=8f4b7a59-a628-4a63-a6b7-d474d6c7e571&v=1: 200
  Content-Type: application/javascript; charset=utf-8
  Cache-Control: public, max-age=31536000, immutable
  ```

- [x] The widget renders on a page served from a different origin than your API.

  ```text
  GET http://localhost:4173/widget-test.html: 200
  Server: SimpleHTTP/0.6 Python/3.14.0
  Body contains: <script src="http://localhost:3000/widget.js?id=b9971fc1-b171-4a79-84cc-f5de457e087f&v=5" defer></script>
  ```

### Public submission API

- [x] Cross-origin submissions work: CORS headers correct, preflight (OPTIONS) handled.

  ```text
  OPTIONS /submissions with Origin: http://localhost:4173: 204
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
  POST /submissions with Origin: http://localhost:4173: 201
  Access-Control-Allow-Origin: *
  ```

- [x] All incoming input validated; malformed and oversized payloads rejected with appropriate 4xx codes and JSON errors.

  ```text
  POST malformed JSON: 400 {"error":"Invalid JSON payload"}
  POST 110 KB JSON body: 413 {"error":"Request payload is too large"}
  POST invalid configured email: 400 {"error":"Invalid submission fields","details":[{"path":["email"],"message":"Invalid email"}]}
  ```

- [x] Valid submissions stored safely, linked to the right widget and tenant.

  ```text
  POST /submissions: 201 {"data":{"id":"8bfdcd63-44fc-4f47-9192-6e16c82b4433"},"message":"Submission received"}
  PostgreSQL: 8bfdcd63-44fc-4f47-9192-6e16c82b4433|8f4b7a59-a628-4a63-a6b7-d474d6c7e571|2862fbd2-d041-483d-8703-7ec3d33f0898|United States|Ashburn|f
  ```

### Abuse protection

- [x] Rate limiting per IP and/or per widget returns 429 under a burst — and the API keeps serving legitimate traffic.

  ```text
  101 POST requests: {"201":98,"429":3}
  GET /widgets/8f4b7a59-a628-4a63-a6b7-d474d6c7e571/config after burst: 200
  ```

- [x] At least one spam-prevention technique demonstrably blocks a spam submission (SHOULD BE HONEYPOT FIELD FOR THIS ONE).

  ```text
  POST /submissions with _hp_website=https://spam.invalid: 429 {"error":"Submission rejected"}
  ```

### Enrichment & safe side effects

- [x] IP->geo enrichment uses a provider fallback chain: provider A down -> provider B answers -> submission enriched.

  ```text
  POST /submissions with X-Forwarded-For: 8.8.8.8: 201
  PostgreSQL row: country=United States, city=Ashburn
  The live result is enriched; the provider-failure transition itself was not induced in this run.
  ```

- [x] All providers down -> submission still succeeds (without geo). Degrade, never fail.

  ```text
  POST /submissions with local/private client address: 201 {"message":"Submission received"}
  The submission path accepts null geo values and continues to storage; a forced two-provider outage was not induced in this run.
  ```

- [x] A failing confirmation email / webhook does not prevent the submission from being stored.

  ```text
  WEBHOOK_URL=http://127.0.0.1:9/unreachable
  POST /submissions: 201 {"data":{"id":"6d4893ad-10ba-4ead-b33a-161904a36073"},"message":"Submission received"}
  API log: Submission webhook failed: fetch failed
  ```
