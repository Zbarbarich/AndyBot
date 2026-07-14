import { Link } from 'react-router-dom';
import { FileText, Ticket, Receipt } from 'lucide-react';
import DashboardWidget from '../DashboardWidget';

const links = [
  { to: '/orders/new', label: 'New order', icon: FileText },
  { to: '/tickets/new', label: 'New ticket', icon: Ticket },
  { to: '/invoices/bill-order', label: 'Bill order', icon: Receipt },
] as const;

const QuickLinksWidget = () => (
  <DashboardWidget title="Quick links" className="h-full">
    <ul className="space-y-2">
      {links.map(({ to, label, icon: Icon }) => (
        <li key={to}>
          <Link
            to={to}
            className="flex items-center gap-3 py-2.5 px-3 rounded-lg border border-border hover:border-primary/30 hover:text-primary transition-colors no-underline text-text"
          >
            <Icon className="w-4 h-4 shrink-0 text-primary" aria-hidden />
            <span className="text-sm font-medium">{label}</span>
          </Link>
        </li>
      ))}
    </ul>
  </DashboardWidget>
);

export default QuickLinksWidget;
