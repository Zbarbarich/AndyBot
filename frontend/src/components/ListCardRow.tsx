import { ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';

interface ListCardRowProps {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  onClick?: () => void;
  href?: string;
  /** Use flat surface style when nested inside glass-card container */
  variant?: 'flat' | 'glass';
}

const ListCardRow = ({ title, subtitle, meta, onClick, variant = 'flat' }: ListCardRowProps) => {
  const className = `${variant === 'glass' ? 'list-card' : 'list-card-flat'} w-full text-left`;

  const inner = (
    <>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-text truncate">{title}</div>
        {subtitle && <div className="text-sm text-text-muted truncate mt-0.5">{subtitle}</div>}
        {meta && <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-text-muted">{meta}</div>}
      </div>
      <ChevronRight className="w-5 h-5 shrink-0 text-text-muted" aria-hidden />
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }

  return <div className={className}>{inner}</div>;
};

export default ListCardRow;
