/**
 * Format a date string (ISO YYYY-MM-DD or parseable) as mm/dd/yyyy for display.
 * Returns '—' for null/empty/invalid.
 */
export function formatDate(value: string | null | undefined): string {
  if (value == null || value === '') return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}
