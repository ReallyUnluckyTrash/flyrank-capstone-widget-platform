export const locale = 'en-US';
export const fmt = new Intl.NumberFormat(locale);
export const shortDate = (value) => new Date(value).toLocaleDateString(locale, {
  month: 'short',
  day: 'numeric',
});
export const dateTime = (value) => new Date(value).toLocaleString(locale, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
