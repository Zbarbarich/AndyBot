import { ReactNode } from 'react';

interface LineItemEditorProps {
  /** @deprecated Mobile now uses the same condensed table; ignored if provided. */
  mobile?: ReactNode;
  table: ReactNode;
}

/**
 * Condensed line-item table with horizontal scroll on small screens.
 * Cards were too tall for long documents on mobile.
 */
export const LineItemEditor = ({ table }: LineItemEditorProps) => (
  <div className="table-scroll line-items-compact">{table}</div>
);

interface LineItemCardProps {
  children: ReactNode;
  onRemove?: () => void;
  showRemove?: boolean;
  lineNumber?: number;
}

/** Kept for rare non-table uses; prefer LineItemEditor table layout. */
export const LineItemCard = ({ children, onRemove, showRemove, lineNumber }: LineItemCardProps) => (
  <div className="line-item-card">
    {lineNumber != null && (
      <div className="text-xs text-text-muted font-medium">Line {lineNumber}</div>
    )}
    {children}
    {showRemove && onRemove && (
      <button type="button" onClick={onRemove} className="btn-secondary w-full text-red-400 text-sm min-h-[44px]">
        Remove line
      </button>
    )}
  </div>
);

export default LineItemEditor;
