import { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  variant?: 'card' | 'glass';
}

export const FormSection = ({
  title,
  description,
  children,
  className = '',
  variant = 'card',
}: FormSectionProps) => (
  <div
    className={`space-y-4 ${variant === 'glass' ? 'glass-section' : 'detail-card'} ${className}`}
  >
    <div>
      <h2 className="detail-card-title mb-0">{title}</h2>
      {description && <p className="text-sm text-text-muted mt-1">{description}</p>}
    </div>
    {children}
  </div>
);

export default FormSection;
