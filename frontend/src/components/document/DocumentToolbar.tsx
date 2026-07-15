import { ReactNode } from 'react';
import { useScrollFadeClass } from '../../hooks/useScrollFadeClass';

interface DocumentToolbarProps {
  children: ReactNode;
}

export const DocumentToolbar = ({ children }: DocumentToolbarProps) => {
  const onScroll = useScrollFadeClass();
  if (!children) return null;
  return (
    <div className="document-toolbar" onScroll={onScroll}>
      {children}
    </div>
  );
};

export default DocumentToolbar;
