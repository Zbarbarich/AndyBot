interface ErrorBannerProps {
  message: string;
  className?: string;
}

/**
 * Consistent error banner used across list and detail pages.
 * Place after the action row (list) or back row (detail).
 */
export function ErrorBanner({ message, className = '' }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div
      className={`mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base ${className}`}
      role="alert"
    >
      {message}
    </div>
  );
}
