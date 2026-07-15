/**
 * Format a date string (ISO or parseable) as MM-DD-YY in America/New_York.
 * Returns '—' for null/empty/invalid.
 */
export function formatDate(value: string | null | undefined): string {
  if (value == null || value === '') return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const month = parts.find((p) => p.type === 'month')?.value ?? '00';
  const day = parts.find((p) => p.type === 'day')?.value ?? '00';
  const year = parts.find((p) => p.type === 'year')?.value ?? '00';
  return `${month}-${day}-${year}`;
}
