import { ReactNode } from 'react';

interface ResponsiveEntityListProps<T> {
  items: T[];
  renderCard: (item: T) => ReactNode;
  renderTable: () => ReactNode;
  emptyMessage?: string;
  loading?: boolean;
  getKey: (item: T) => string | number;
}

function ResponsiveEntityList<T>({
  items,
  renderCard,
  renderTable,
  emptyMessage = 'No items.',
  loading = false,
  getKey,
}: ResponsiveEntityListProps<T>) {
  if (loading) {
    return (
      <div className="glass-card overflow-hidden">
        <p className="text-text-muted py-8 px-4">Loading...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-card overflow-hidden">
        <p className="p-6 text-text-muted text-center">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="md:hidden p-3 space-y-3">
        {items.map((item) => (
          <div key={getKey(item)}>{renderCard(item)}</div>
        ))}
      </div>
      <div className="hidden md:block table-scroll border-0 rounded-none">
        {renderTable()}
      </div>
    </div>
  );
}

export default ResponsiveEntityList;
