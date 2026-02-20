import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useListFetch } from '../hooks/useListFetch';
import { ErrorBanner } from '../components/ErrorBanner';

const API_BASE = 'http://localhost:3000/api/app/invoices';

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

      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {(['open', 'closed', 'all'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`pill-button ${statusFilter === tab ? 'active' : ''}`}
          >
            {tab === 'open' ? 'Unpaid' : tab === 'closed' ? 'Paid' : tab}
          </button>
        ))}
        <input
          type="text"
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          placeholder="Customer..."
          className="filter-search-input"
          aria-label="Filter by customer"
        />
        <button
          type="button"
          onClick={() => navigate('/invoices/bill-order')}
          className="btn-icon-primary ml-auto"
          aria-label="Bill an order"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="rounded-lg border border-dark-border bg-dark-surface overflow-hidden">
        {loading ? (
          <p className="text-dark-text-muted py-8 px-4">Loading...</p>
        ) : (
          <div className="table-scroll table-scroll-fit">
            <table>
              <thead>
                <tr>
                  <th className="col-doc">Invoice #</th>
                  <th className="col-doc">Order #</th>
                  <th className="col-customer">Customer</th>
                  <th className="col-amount">Total</th>
                  <th className="col-date">Date</th>
                </tr>
              </thead>
              <tbody className="text-dark-text">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="cursor-pointer hover:bg-dark-surface-elevated/50 active:bg-dark-surface-elevated/70"
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                  >
                    <td className="col-doc font-mono font-medium truncate" title={inv.invoice_number}>{inv.invoice_number}</td>
                    <td className="col-doc font-mono truncate" title={inv.order_document_number}>{inv.order_document_number}</td>
                    <td className="col-customer truncate" title={inv.customer_name}>{inv.customer_name}</td>
                    <td className="col-amount whitespace-nowrap">{Number(inv.total).toFixed(2)}</td>
                    <td className="col-date whitespace-nowrap">{inv.invoice_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invoices.length === 0 && (
              <p className="p-6 text-dark-text-muted text-center">No invoices yet. Create an invoice from an order (mark lines as Billable first).</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicesPage;
