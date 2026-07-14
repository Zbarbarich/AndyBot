import { ReactNode } from 'react';

interface StickyFormActionsProps {
  children: ReactNode;
  className?: string;
}

/** Mobile sticky bottom action bar; inline on md+. */
export const StickyFormActions = ({ children, className = '' }: StickyFormActionsProps) => (
  <>
    <div className={`form-actions-sticky md:hidden ${className}`}>{children}</div>
    <div className={`hidden md:flex flex-wrap items-center gap-2 ${className}`}>{children}</div>
  </>
);

export default StickyFormActions;
