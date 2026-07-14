import { ReactNode } from 'react';

interface DocumentFieldGridProps {
  children: ReactNode;
  className?: string;
}

export const DocumentFieldGrid = ({ children, className = '' }: DocumentFieldGridProps) => (
  <div className={`document-field-grid ${className}`}>{children}</div>
);

export const DocumentFieldSpan = ({
  children,
  span = 4,
}: {
  children: ReactNode;
  span?: 4 | 6 | 8 | 12;
}) => {
  const spanClass =
    span === 12
      ? 'document-field-span-12'
      : span === 8
        ? 'document-field-span-8'
        : span === 6
          ? 'document-field-span-6'
          : 'document-field-span-4';
  return <div className={spanClass}>{children}</div>;
};

export default DocumentFieldGrid;
