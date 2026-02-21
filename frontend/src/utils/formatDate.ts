/**
 * Format a date string (ISO or parseable) as mm/dd/yyyy in America/New_York.
 * Returns '—' for null/empty/invalid.
 */
const NY_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
};

export function formatDate(value: string | null | undefined): string {
  if (value == null || value === '') return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', NY_DATE_OPTIONS).format(d);
}
