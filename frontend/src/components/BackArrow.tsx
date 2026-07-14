import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackArrowProps {
  to: string;
  label?: string;
  className?: string;
}

export function BackArrow({ to, label = 'Back', className = '' }: BackArrowProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={`btn-icon-primary hidden md:inline-flex ${className}`}
      aria-label={label}
    >
      <ArrowLeft className="w-5 h-5 shrink-0" />
    </button>
  );
}
