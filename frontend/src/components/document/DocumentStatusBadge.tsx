interface DocumentStatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'muted';
}

const variantClass: Record<NonNullable<DocumentStatusBadgeProps['variant']>, string> = {
  default: 'bg-primary/15 text-primary border-primary/30',
  success: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  muted: 'bg-surface-elevated text-text-muted border-border',
};

export const DocumentStatusBadge = ({ status, variant = 'default' }: DocumentStatusBadgeProps) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${variantClass[variant]}`}
  >
    {status}
  </span>
);

export default DocumentStatusBadge;
