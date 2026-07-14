interface ReadOnlyLineField {
  label: string;
  value: React.ReactNode;
  align?: 'left' | 'right';
}

interface ReadOnlyLineCardProps {
  title?: string;
  fields: ReadOnlyLineField[];
}

export const ReadOnlyLineCard = ({ title, fields }: ReadOnlyLineCardProps) => (
  <div className="line-item-card">
    {title && <div className="font-medium text-text text-sm">{title}</div>}
    <dl className="space-y-1">
      {fields.map((f) => (
        <div key={f.label} className="kv-row">
          <dt className="text-xs">{f.label}</dt>
          <dd className={`text-sm ${f.align === 'right' ? 'font-mono' : ''}`}>{f.value}</dd>
        </div>
      ))}
    </dl>
  </div>
);

export default ReadOnlyLineCard;
