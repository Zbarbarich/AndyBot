import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../api/client';
import { BackArrow } from '../components/BackArrow';
import { useDetailFetch } from '../hooks/useDetailFetch';
import { apiBase } from '../api/config';

const INVOICES_API = `${apiBase}/api/app/invoices`;

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
  lines: InvoiceLine[];
  payments?: { id: number; amount: number; payment_method: string | null; paid_at: string; reference?: string | null }[];
}

const InvoiceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const invoiceId = id ? parseInt(id, 10) : NaN;
  const validId = !isNaN(invoiceId);
  const url = validId ? `${INVOICES_API}/${invoiceId}` : null;
  const { data: invoice, loading, error, refetch } = useDetailFetch<InvoiceDetail>(url);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check'>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [pdfError, setPdfError] = useState('');

  const handlePaymentSubmit = async (e: React.FormEvent) => {
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
      const res = await authFetch(`${INVOICES_API}/${invoice.id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          payment_method: paymentMethod,
          reference: paymentReference.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to record payment');
      }
      setPaymentAmount('');
      setPaymentReference('');
      setShowPaymentModal(false);
      await refetch();
    } catch (e) {
      setPaymentError(e instanceof Error ? e.message : 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (!validId) {
    return (
      <div className="page-container">
        <p className="text-red-400">Invalid invoice id</p>
        <BackArrow to="/invoices" label="Back to invoices" className="mt-4" />
      </div>
    );
  }

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
        <BackArrow to="/invoices" label="Back to invoices" className="mt-4" />
      </div>
    );
  }

  const balanceDue = Number(invoice.total) - Number(invoice.amount_paid ?? 0);

  const viewPdf = async () => {
    try {
      const res = await authFetch(`${INVOICES_API}/${invoice.id}/pdf`);
      if (!res.ok) throw new Error('Failed to load PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'Failed to load PDF');
    }
  };

  const downloadPdf = async () => {
    try {
      const res = await authFetch(`${INVOICES_API}/${invoice.id}/pdf`);
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoice_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'Failed to download PDF');
    }
  };

  return (
    <div className="page-container">
      {/* Top: back arrow + PDF links only */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <BackArrow to="/invoices" label="Back to Invoices" />
        <button type="button" onClick={viewPdf} className="link-primary">View PDF</button>
        <button type="button" onClick={downloadPdf} className="link-primary">Download PDF</button>
      </div>
      {pdfError && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">
          {pdfError}
        </div>
      )}

      {/* Details at top – full width, narrow line-based */}
      <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border mb-4">
        <h2 className="text-lg font-semibold text-dark-text mb-3">Invoice details</h2>
        <dl className="space-y-1.5 text-sm text-dark-text">
          <div className="flex flex-wrap gap-x-4 py-0.5 border-b border-dark-border/50">
            <dt className="text-dark-text-muted w-24 shrink-0">Invoice #</dt>
            <dd className="font-mono">{invoice.invoice_number}</dd>
          </div>
          <div className="flex flex-wrap gap-x-4 py-0.5 border-b border-dark-border/50">
            <dt className="text-dark-text-muted w-24 shrink-0">Order #</dt>
            <dd>
              <button type="button" onClick={() => navigate(`/orders/${invoice.order_id}`)} className="link-primary text-sm">
                {invoice.order_document_number}
              </button>
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-4 py-0.5 border-b border-dark-border/50">
            <dt className="text-dark-text-muted w-24 shrink-0">Customer</dt>
            <dd className="truncate">{invoice.customer_name}</dd>
          </div>
          <div className="flex flex-wrap gap-x-4 py-0.5 border-b border-dark-border/50">
            <dt className="text-dark-text-muted w-24 shrink-0">Invoice date</dt>
            <dd className="font-mono">{invoice.invoice_date}</dd>
          </div>
          <div className="flex flex-wrap gap-x-4 py-0.5">
            <dt className="text-dark-text-muted w-24 shrink-0">Due date</dt>
            <dd className="font-mono">{invoice.due_date ?? '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Line items – full width, narrow rows */}
      <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border mb-4">
        <h2 className="text-lg font-semibold text-dark-text mb-3">Line items</h2>
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-1.5 px-2 font-medium text-dark-text-muted">Description</th>
                <th className="text-right py-1.5 px-2 font-medium text-dark-text-muted w-16">Qty</th>
                <th className="text-right py-1.5 px-2 font-medium text-dark-text-muted w-24">Unit price</th>
                <th className="text-right py-1.5 px-2 font-medium text-dark-text-muted w-24">Extended</th>
              </tr>
            </thead>
            <tbody className="text-dark-text">
              {invoice.lines.map((line) => (
                <tr key={line.id} className="border-t border-dark-border">
                  <td className="py-1.5 px-2">{line.description ?? '—'}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{Number(line.quantity)}</td>
                  <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">{Number(line.unit_price).toFixed(2)}</td>
                  <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">{(Number(line.quantity) * Number(line.unit_price)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 pt-2 border-t border-dark-border space-y-0.5 text-sm text-dark-text text-right">
          <div className="flex justify-end gap-4 py-0.5">Subtotal <span className="font-mono w-20">{Number(invoice.subtotal).toFixed(2)}</span></div>
          <div className="flex justify-end gap-4 py-0.5">Tax <span className="font-mono w-20">{Number(invoice.tax_amount).toFixed(2)}</span></div>
          <div className="flex justify-end gap-4 py-0.5">Shipping <span className="font-mono w-20">{Number(invoice.shipping_amount).toFixed(2)}</span></div>
          <div className="flex justify-end gap-4 py-0.5 font-semibold">Total <span className="font-mono w-20">{Number(invoice.total).toFixed(2)}</span></div>
        </div>
      </div>

      {/* Payments – amount paid, balance, Make payment link, payment history at bottom */}
      <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border">
        <h2 className="text-lg font-semibold text-dark-text mb-3">Payments</h2>
        <dl className="space-y-1.5 text-sm text-dark-text mb-3">
          <div className="flex flex-wrap gap-x-4 py-0.5 border-b border-dark-border/50">
            <dt className="text-dark-text-muted w-28 shrink-0">Amount paid</dt>
            <dd className="font-mono">{Number(invoice.amount_paid ?? 0).toFixed(2)}</dd>
          </div>
          <div className="flex flex-wrap gap-x-4 py-0.5 border-b border-dark-border/50">
            <dt className="text-dark-text-muted w-28 shrink-0">Balance due</dt>
            <dd className="font-mono font-semibold">{balanceDue.toFixed(2)}</dd>
          </div>
        </dl>
        {balanceDue > 0 && (
          <button
            type="button"
            onClick={() => { setShowPaymentModal(true); setPaymentAmount(''); setPaymentError(''); }}
            className="link-primary text-sm"
          >
            Make payment
          </button>
        )}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="mt-4 pt-3 border-t border-dark-border">
            <h3 className="text-sm font-medium text-dark-text-muted mb-2">Payment history</h3>
            <ul className="space-y-1 text-sm text-dark-text">
              {invoice.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap gap-x-4 py-0.5 border-b border-dark-border/50">
                  <span className="font-mono">{new Date(p.paid_at).toLocaleDateString()}</span>
                  <span className="font-mono">{Number(p.amount).toFixed(2)}</span>
                  <span>{p.payment_method ?? '—'}{p.reference ? ` ${p.reference}` : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {showPaymentModal && (
        <div className="modal-overlay safe-area-pb" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
          <div className="modal-content">
            <h3 id="payment-modal-title" className="text-lg font-semibold text-dark-text mb-4">Make payment</h3>
            <p className="text-dark-text-muted text-sm mb-4">Balance due: {balanceDue.toFixed(2)}</p>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'check')}
                  className="input-field w-full"
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                </select>
              </div>
              {paymentMethod === 'check' && (
                <div>
                  <label className="block text-sm font-medium text-dark-text-muted mb-1">Check / reference number</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. 1234 or ACH"
                    className="input-field w-full"
                  />
                </div>
              )}
              {paymentError && <p className="text-red-400 text-sm">{paymentError}</p>}
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="submit" disabled={submittingPayment} className="btn-primary">
                  {submittingPayment ? 'Recording...' : 'Confirm payment'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPaymentModal(false); setPaymentError(''); setPaymentReference(''); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetailPage;
