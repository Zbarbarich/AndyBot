interface TotalRow {
  label: string;
  value: string | number;
  emphasis?: boolean;
}

interface DocumentTotalsPanelProps {
  rows: TotalRow[];
  children?: React.ReactNode;
}

export const DocumentTotalsPanel = ({ rows, children }: DocumentTotalsPanelProps) => (
  <div className="space-y-1">
    {children}
    <dl className="border-t border-border pt-2 space-y-0">
      {rows.map((row) => (
        <div
          key={row.label}
          className={`kv-row ${row.emphasis ? 'font-semibold pt-1 text-base' : ''}`}
        >
          <dt>{row.label}</dt>
          <dd className="font-mono">{row.value}</dd>
        </div>
      ))}
    </dl>
  </div>
);

export default DocumentTotalsPanel;
