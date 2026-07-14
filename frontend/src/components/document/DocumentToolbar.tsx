import { ReactNode } from 'react';

interface DocumentToolbarProps {
  children: ReactNode;
}

export const DocumentToolbar = ({ children }: DocumentToolbarProps) => {
  if (!children) return null;
  return <div className="document-toolbar">{children}</div>;
};

export default DocumentToolbar;
