const TOKEN_KEY = 'flyrank.access_token';
const REFRESH_KEY = 'flyrank.refresh_token';
const WIDGET_BASE_URL = (import.meta.env.VITE_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

export function getWidgetEmbedSnippet(widgetId) {
  return `<script src="${WIDGET_BASE_URL}/widget.js?id=${widgetId}&v=1" defer></script>`;
}

export const session = {
  get token() { return localStorage.getItem(TOKEN_KEY); },
  save(tokens) {
    localStorage.setItem(TOKEN_KEY, tokens.access_token);
    if (tokens.refresh_token) localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (session.token) headers.set('Authorization', `Bearer ${session.token}`);
  const response = await fetch(`/api${path}`, { ...options, headers });
  if (response.status === 401) session.clear();
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

export const jsonBody = (value) => JSON.stringify(value);
