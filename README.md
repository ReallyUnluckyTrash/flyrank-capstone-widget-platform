Language + framework Node.js + Express
Database PostgreSQL via Docker
Geo provider A ip-api.com (JSON endpoint)
Geo provider B (fallback) ipapi.co
Email side effect Console log, or Mailpit (local mail catcher)
The "customer site" Plain HTML file on a second local port ( npx serve / python -m http.server )

Widget Owner (authenticated)
 → Widget Management API → Widget DB (tenant-isolated) → embed snippet
Customer Website (any origin)
 <script src="widget.js?id=123">
 → GET /widgets/:id/config (public · cached · CORS)
 → render widget
Website Visitor
 → POST /submissions (public · CORS)
 | validation — bad payload? → 4xx, never 500
 | rate limit + spam check — flood? → 429, service stays up
 | geo enrichment: Provider A —(fails)→ Provider B —(fails)→ store anyway
 | store submission
 | email / webhook side effect (failure must NOT block success)
Widget Owner (authenticated)
 → Dashboard API ←— submissions + stats
The authenticated owner views their submissions with basic analytics: counts over time, per-widget stats, geo
breakdown. Endpoints + a simple table are enough — this is a backend capstone, not a frontend one.