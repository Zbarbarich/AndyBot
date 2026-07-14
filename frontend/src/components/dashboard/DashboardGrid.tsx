import { ReactNode } from 'react';

interface DashboardGridProps {
  children: ReactNode;
}

const DashboardGrid = ({ children }: DashboardGridProps) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 auto-rows-min">
    {children}
  </div>
);

export default DashboardGrid;
