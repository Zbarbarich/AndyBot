import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const INVOICES_API = 'http://localhost:3000/api/app/invoices';

interface InvoiceLine {
  id: number;
  description: string | null;
  quantity: number;
  unit_price: number;
  sort_order: number;
}

interface InvoiceDetail {
  id: number;
  invoice_number: string;
  order_id: number;
  order_document_number: string;
  customer_id: number;
  customer_name: string;
  ticket_id: number | null;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  shipping_amount: number;
  total: number;
  amount_paid?: number;
  payment_method?: string | null;
  paid_at?: string | null;
  balance_due?: number;
  status: string;
  lines: InvoiceLine[];
}

const InvoiceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check'>('cash');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) {
        setError('Invalid invoice id');
        setLoading(false);
        return;
      }
      const invoiceId = parseInt(id, 10);
      if (isNaN(invoiceId)) {
        setError('Invalid invoice id');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${INVOICES_API}/${invoiceId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) {
          if (res.status === 404) setError('Invoice not found');
          else setError('Failed to load invoice');
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (!cancelled) setInvoice(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load invoice');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="page-container">
          <p className="text-dark-text-muted py-8">Loading...</p>
        </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="page-container">
        <p className="text-red-400">{error || 'Invoice not found'}</p>
        <button type="button" onClick={() => navigate('/invoices')} className="btn-secondary mt-4">
          Back to invoices
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text">
            Invoice {invoice.invoice_number}
          </h1>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/invoices')} className="btn-secondary">
              Back to list
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch(`${INVOICES_API}/${invoice.id}/pdf`, { headers: { Authorization: `Bearer ${getToken()}` } });
                  if (!res.ok) throw new Error('Failed to load PDF');
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                  setTimeout(() => URL.revokeObjectURL(url), 60000);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Failed to load PDF');
                }
              }}
              className="btn-secondary"
            >
              View PDF
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch(`${INVOICES_API}/${invoice.id}/pdf`, { headers: { Authorization: `Bearer ${getToken()}` } });
                  if (!res.ok) throw new Error('Failed to download PDF');
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `invoice-${invoice.invoice_number}.pdf`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Failed to download PDF');
                }
              }}
              className="btn-primary"
            >
              Download PDF
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border space-y-4">
          <h2 className="text-lg font-semibold text-dark-text">Payment</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-dark-text text-sm">
            <dt className="text-dark-text-muted">Amount paid</dt>
            <dd className="font-mono">{Number(invoice.amount_paid ?? 0).toFixed(2)}</dd>
            <dt className="text-dark-text-muted">Payment method</dt>
            <dd>{invoice.payment_method ?? '—'}</dd>
            <dt className="text-dark-text-muted">Paid at</dt>
            <dd>{invoice.paid_at ? new Date(invoice.paid_at).toLocaleString() : '—'}</dd>
            <dt className="text-dark-text-muted">Balance due</dt>
            <dd className="font-mono font-semibold">
              {(Number(invoice.total) - Number(invoice.amount_paid ?? 0)).toFixed(2)}
            </dd>
          </dl>
          {Number(invoice.amount_paid ?? 0) < Number(invoice.total) && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!invoice) return;
                const amt = parseFloat(paymentAmount);
                if (isNaN(amt) || amt <= 0) {
                  setPaymentError('Enter a valid amount');
                  return;
                }
                setSubmittingPayment(true);
                setPaymentError('');
                try {
                  const res = await fetch(`${INVOICES_API}/${invoice.id}/payment`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${getToken()}`,
                    },
                    body: JSON.stringify({ amount: amt, payment_method: paymentMethod }),
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'Failed to record payment');
                  }
                  const data = await res.json();
                  setInvoice(data);
                  setPaymentAmount('');
                } catch (e) {
                  setPaymentError(e instanceof Error ? e.message : 'Failed to record payment');
                } finally {
                  setSubmittingPayment(false);
                }
              }}
              className="flex flex-wrap items-end gap-4"
            >
              <label className="flex flex-col gap-1">
                <span className="text-sm text-dark-text-muted">Amount</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="input-field w-32"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-dark-text-muted">Method</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'check')}
                  className="input-field w-28"
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                </select>
              </label>
              <button type="submit" disabled={submittingPayment} className="btn-primary">
                {submittingPayment ? 'Recording...' : 'Record payment'}
              </button>
            </form>
          )}
          {paymentError && <p className="text-red-400 text-sm">{paymentError}</p>}
        </div>

        <div className="mt-6 p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border">
          <h2 className="text-lg font-semibold text-dark-text mb-4">Details</h2>
          <dl className="compact-grid text-dark-text text-sm">
            <div className="short-field"><dt className="text-dark-text-muted text-xs">Invoice #</dt><dd className="font-mono">{invoice.invoice_number}</dd></div>
            <div><dt className="text-dark-text-muted text-xs">Order #</dt><dd className="font-mono">
              <button type="button" onClick={() => navigate(`/orders/${invoice.order_id}`)} className="text-primary hover:underline">
                {invoice.order_document_number}
              </button>
            </dd></div>
            <div className="sm:col-span-2"><dt className="text-dark-text-muted text-xs">Customer</dt><dd className="truncate">{invoice.customer_name}</dd></div>
            <div className="short-field"><dt className="text-dark-text-muted text-xs">Invoice date</dt><dd className="font-mono">{invoice.invoice_date}</dd></div>
            <div className="short-field"><dt className="text-dark-text-muted text-xs">Due date</dt><dd className="font-mono">{invoice.due_date ?? '—'}</dd></div>
            <div className="short-field"><dt className="text-dark-text-muted text-xs">Status</dt><dd>{invoice.status}</dd></div>
          </dl>
        </div>

        <div className="mt-6 p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border">
          <h2 className="text-lg font-semibold text-dark-text mb-4">Line items</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="col-id">Qty</th>
                  <th className="col-amount">Unit price</th>
                  <th className="col-amount">Extended</th>
                </tr>
              </thead>
              <tbody className="text-dark-text">
                {invoice.lines.map((line) => (
                  <tr key={line.id}>
                    <td>{line.description ?? '—'}</td>
                    <td className="col-id">{Number(line.quantity)}</td>
                    <td className="col-amount whitespace-nowrap">{Number(line.unit_price).toFixed(2)}</td>
                    <td className="col-amount whitespace-nowrap">
                      {(Number(line.quantity) * Number(line.unit_price)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 space-y-1 text-dark-text text-right">
            <p>Subtotal: {Number(invoice.subtotal).toFixed(2)}</p>
            <p>Tax: {Number(invoice.tax_amount).toFixed(2)}</p>
            <p>Shipping: {Number(invoice.shipping_amount).toFixed(2)}</p>
            <p className="font-semibold text-lg">Total: {Number(invoice.total).toFixed(2)}</p>
          </div>
        </div>
    </div>
  );
};

export default InvoiceDetailPage;
