import { ReactNode } from 'react';

interface DocumentPageShellProps {
  children: ReactNode;
  className?: string;
}

export const DocumentPageShell = ({ children, className = '' }: DocumentPageShellProps) => (
  <div className={`page-container pb-24 md:pb-8 space-y-4 ${className}`}>{children}</div>
);

export default DocumentPageShell;
