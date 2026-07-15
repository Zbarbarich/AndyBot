import { ReactNode, useCallback, useRef } from 'react';
import { useTableColumnPrefs } from '../hooks/useTableColumnPrefs';
import { useScrollFadeClass } from '../hooks/useScrollFadeClass';

export interface ResizableColumn {
  key: string;
  header: ReactNode;
  /** Extra th className */
  className?: string;
  /** Default width px when no preference */
  defaultWidth?: number;
}

interface ResizableTableProps {
  tableId: string;
  columns: ResizableColumn[];
  /** `<tbody>...</tbody>` (and optional `<tfoot>`) content */
  children: ReactNode;
  className?: string;
  /** Optional table class */
  tableClassName?: string;
  /** When true, omit the outer table-scroll wrapper (e.g. inside ResponsiveEntityList). */
  embedded?: boolean;
}

/**
 * Fixed row height, balanced default column widths; drag header edges to resize.
 * Widths persist per user via /api/auth/me/preferences.
 */
export default function ResizableTable({
  tableId,
  columns,
  children,
  className = '',
  tableClassName = 'w-full text-left text-sm',
  embedded = false,
}: ResizableTableProps) {
  const keys = columns.map((c) => c.key);
  const defaultW = Math.max(
    80,
    Math.floor(640 / Math.max(columns.length, 1))
  );
  const { widths, setColumnWidth } = useTableColumnPrefs(
    tableId,
    keys,
    defaultW
  );
  const onScroll = useScrollFadeClass();
  const dragRef = useRef<{ key: string; startX: number; startW: number } | null>(null);

  const onPointerDown = useCallback(
    (key: string, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startW = widths[key] ?? defaultW;
      dragRef.current = { key, startX: e.clientX, startW };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        if (!dragRef.current) return;
        const delta = ev.clientX - dragRef.current.startX;
        setColumnWidth(dragRef.current.key, dragRef.current.startW + delta);
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [widths, defaultW, setColumnWidth]
  );

  const totalW = columns.reduce((s, c) => s + (widths[c.key] ?? c.defaultWidth ?? defaultW), 0);

  const table = (
    <table className={tableClassName} style={{ tableLayout: 'fixed', width: Math.max(totalW, 640), minWidth: '100%' }}>
      <colgroup>
        {columns.map((c) => (
          <col key={c.key} style={{ width: widths[c.key] ?? c.defaultWidth ?? defaultW }} />
        ))}
      </colgroup>
      <thead>
        <tr className="h-11">
          {columns.map((c) => (
            <th
              key={c.key}
              className={`relative select-none whitespace-nowrap overflow-hidden text-ellipsis px-3 py-2 ${c.className ?? ''}`}
              style={{ height: 44 }}
            >
              <span className="pr-2">{c.header}</span>
              <span
                role="separator"
                aria-orientation="vertical"
                aria-label={`Resize ${c.key}`}
                className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary/60"
                onPointerDown={(e) => onPointerDown(c.key, e)}
              />
            </th>
          ))}
        </tr>
      </thead>
      {children}
    </table>
  );

  if (embedded) return table;

  return (
    <div className={`table-scroll ${className}`} onScroll={onScroll}>
      {table}
    </div>
  );
}
