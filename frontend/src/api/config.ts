/**
 * API base URL for backend requests.
 * In dev: set VITE_API_BASE=http://localhost:3000 in .env
 * In prod: leave unset (empty string) so requests use relative /api/... (same origin).
 */
export const apiBase = import.meta.env.VITE_API_BASE ?? '';
