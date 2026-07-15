import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useListFetch } from '../hooks/useListFetch';
import { ErrorBanner } from '../components/ErrorBanner';
import ListCardRow from '../components/ListCardRow';
import ResizableTable from '../components/ResizableTable';
import { apiBase } from '../api/config';
import { ListPageToolbar } from '../components/MobilePageTitle';
import { formatDate } from '../utils/formatDate';

const API_BASE = `${apiBase}/api/app/invoices`;

type StatusFilter = 'open' | 'closed' | 'all';

interface InvoiceSummary {
  id: number;
  invoice_number: string;
  order_id: number;
  order_document_number: string;
  customer_name: string;
  total: number;
  amount_paid?: number | null;
  invoice_date: string;
  created_at: string;
}

const InvoicesPage = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [customerFilter, setCustomerFilter] = useState('');
  const { data: allInvoices, loading, error } = useListFetch<InvoiceSummary>(API_BASE);
  const invoices = useMemo(() => {
    let list = allInvoices;
    if (statusFilter === 'open') list = list.filter((inv) => Number(inv.amount_paid ?? 0) < Number(inv.total));
    if (statusFilter === 'closed') list = list.filter((inv) => Number(inv.amount_paid ?? 0) >= Number(inv.total));
    if (customerFilter.trim()) {
      const q = customerFilter.trim().toLowerCase();
      list = list.filter((inv) => (inv.customer_name ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [allInvoices, statusFilter, customerFilter]);

  return (
    <div className="page-container">
      <ErrorBanner message={error} />

      <ListPageToolbar hasFilterTabs>
        {(['open', 'closed', 'all'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`pill-button shrink-0 ${statusFilter === tab ? 'active' : ''}`}
          >
            {tab === 'open' ? 'Unpaid' : tab === 'closed' ? 'Paid' : tab}
          </button>
        ))}
        <input
          type="text"
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          placeholder="Customer..."
          className="filter-search-input flex-1 min-w-0"
          aria-label="Filter by customer"
        />
        <button
          type="button"
          onClick={() => navigate('/invoices/bill-order')}
          className="btn-icon-primary shrink-0"
          aria-label="Bill an order"
        >
          <Plus className="w-5 h-5" />
        </button>
      </ListPageToolbar>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <p className="text-text-muted py-8 px-4">Loading...</p>
        ) : invoices.length === 0 ? (
          <p className="p-6 text-text-muted text-center">No invoices yet. Create an invoice from an order (mark lines as Billable first).</p>
        ) : (
          <>
            <div className="md:hidden p-3 space-y-3">
              {invoices.map((inv) => (
                <ListCardRow
                  key={inv.id}
                  title={inv.invoice_number}
                  subtitle={inv.customer_name}
                  meta={
                    <>
                      <span>Order {inv.order_document_number}</span>
                      <span>${Number(inv.total).toFixed(2)}</span>
                      <span>{formatDate(inv.invoice_date)}</span>
                    </>
                  }
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                />
              ))}
            </div>
            <div className="hidden md:block">
              <ResizableTable
                tableId="invoices"
                className="table-scroll-fit border-0 rounded-none"
                columns={[
                  { key: 'invoice', header: 'Invoice #', className: 'col-doc' },
                  { key: 'order', header: 'Order #', className: 'col-doc' },
                  { key: 'customer', header: 'Customer', className: 'col-customer' },
                  { key: 'total', header: 'Total', className: 'col-amount' },
                  { key: 'date', header: 'Date', className: 'col-date' },
                ]}
              >
                <tbody className="text-text">
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="cursor-pointer hover:bg-surface-elevated/50 active:bg-surface-elevated/70"
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                    >
                      <td className="col-doc font-mono font-medium truncate" title={inv.invoice_number}>{inv.invoice_number}</td>
                      <td className="col-doc font-mono truncate" title={inv.order_document_number}>{inv.order_document_number}</td>
                      <td className="col-customer truncate" title={inv.customer_name}>{inv.customer_name}</td>
                      <td className="col-amount whitespace-nowrap">{Number(inv.total).toFixed(2)}</td>
                      <td className="col-date whitespace-nowrap">{formatDate(inv.invoice_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </ResizableTable>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InvoicesPage;
