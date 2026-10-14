import { api } from '../api.js';

export const unwrap = (value) => value?.data ?? value;
export const unwrapList = (value) => {
  const unwrapped = unwrap(value);
  return Array.isArray(unwrapped) ? unwrapped : [];
};

export async function fetchWidgets() {
  const [widgetResult, statResult] = await Promise.all([
    api('/widgets'),
    api('/dashboard/stats/widget'),
  ]);
  const stats = new Map(unwrapList(statResult).map((item) => [
    item.widget_id,
    Number(item.submissions),
  ]));
  return unwrapList(widgetResult).map((widget) => ({
    ...widget,
    submission_count: stats.get(widget.id) || 0,
  }));
}

export function normalizeWidget(widget) {
  return {
    ...widget,
    form_fields: Array.isArray(widget.form_fields) ? widget.form_fields : [],
    created_at: widget.created_at || new Date().toISOString(),
    submission_count: Number(widget.submission_count || 0),
  };
}

export function withClientId(field) {
  return { ...field, id: field.id || crypto.randomUUID() };
}

export const defaultFields = [
  { name: 'name', label: 'Full name', type: 'text', required: true },
  { name: 'email', label: 'Work email', type: 'email', required: true },
];
