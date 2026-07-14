import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { getPageTitle } from '../utils/mobileNav';

/** Mobile-only page title — sit this in the same row as the + / filters. */
export function MobilePageTitle({ className = '' }: { className?: string }) {
  const { pathname } = useLocation();
  return (
    <h1
      className={`lg:hidden text-xl font-display font-bold text-black dark:text-white leading-none tracking-tight shrink-0 ${className}`}
    >
      {getPageTitle(pathname)}
    </h1>
  );
}

/**
 * List page top row.
 * - Default: title left, actions/+ on the right (same baseline).
 * - hasFilterTabs: title sits over the top of the leftmost oval filter tab.
 */
export function ListPageToolbar({
  children,
  className = '',
  hasFilterTabs = false,
}: {
  children?: ReactNode;
  className?: string;
  hasFilterTabs?: boolean;
}) {
  if (hasFilterTabs) {
    return (
      <div className={`mb-4 ${className}`}>
        <MobilePageTitle className="mb-1.5" />
        <div className="flex flex-nowrap items-center gap-2 min-w-0">{children}</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-nowrap items-center gap-2 mb-4 ${className}`}>
      <MobilePageTitle />
      <div className="flex-1 min-w-0 flex flex-nowrap items-center justify-end gap-2">{children}</div>
    </div>
  );
}

export default MobilePageTitle;
