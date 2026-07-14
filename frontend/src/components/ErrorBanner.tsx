interface ErrorBannerProps {
  message: string;
  className?: string;
}

export function ErrorBanner({ message, className = '' }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div className={`error-banner mb-4 ${className}`} role="alert">
      {message}
    </div>
  );
}
