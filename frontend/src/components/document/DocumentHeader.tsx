import { ReactNode } from 'react';
import { BackArrow } from '../BackArrow';

interface DocumentHeaderProps {
  backTo: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  status?: ReactNode;
  actions?: ReactNode;
}

/**
 * Glass header for document pages.
 * Desktop actions stay in the header; mobile sticky actions are rendered as a sibling
 * outside the glass panel so backdrop-filter does not trap position:fixed.
 */
export const DocumentHeader = ({ backTo, backLabel, title, subtitle, status, actions }: DocumentHeaderProps) => (
  <>
    <div className="document-header">
      <div className="min-w-0 flex-1">
        <BackArrow to={backTo} label={backLabel} />
        <div className="md:mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-text truncate">{title}</h1>
          {status}
        </div>
        {subtitle && <p className="text-sm text-text-muted mt-1 truncate">{subtitle}</p>}
      </div>
      {actions && (
        <div className="hidden md:flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
    {actions && <div className="md:hidden">{actions}</div>}
  </>
);

export default DocumentHeader;
