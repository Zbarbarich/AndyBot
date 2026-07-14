import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import FormSection from '../components/FormSection';
import { LineItemEditor } from '../components/LineItemEditor';
import DocumentPageShell from '../components/document/DocumentPageShell';
import DocumentHeader from '../components/document/DocumentHeader';
import DocumentToolbar from '../components/document/DocumentToolbar';
import DocumentFieldGrid, { DocumentFieldSpan } from '../components/document/DocumentFieldGrid';
import DocumentTotalsPanel from '../components/document/DocumentTotalsPanel';
import DocumentStatusBadge from '../components/document/DocumentStatusBadge';
import { useDetailFetch } from '../hooks/useDetailFetch';
import { apiBase } from '../api/config';
import { formatDate } from '../utils/formatDate';

const INVOICES_API = `${apiBase}/api/app/invoices`;

interface InvoiceLine {
  id: number;
  description: string | null;
  quantity: number;
  unit_price: number;
  sort_order: number;
  unit_of_measure?: string | null;
  item_unit_of_measure?: string | null;
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
      <DocumentPageShell>
        <p className="text-red-400">Invalid invoice id</p>
      </DocumentPageShell>
    );
  }

  if (loading) {
    return (
      <DocumentPageShell>
        <p className="text-text-muted py-8">Loading...</p>
      </DocumentPageShell>
    );
  }

  if (error || !invoice) {
    return (
      <DocumentPageShell>
        <p className="text-red-400">{error || 'Invoice not found'}</p>
      </DocumentPageShell>
    );
  }

  const balanceDue = Number(invoice.total) - Number(invoice.amount_paid ?? 0);
  const isPaid = balanceDue <= 0;

  const viewPdf = async () => {
    try {
      const res = await authFetch(`${INVOICES_API}/${invoice.id}/pdf`);
      if (!res.ok) throw new Error('Failed to load PDF');
      const blob = await res.blob();
      const u = URL.createObjectURL(blob);
      window.open(u, '_blank');
      setTimeout(() => URL.revokeObjectURL(u), 60000);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'Failed to load PDF');
    }
  };

  const downloadPdf = async () => {
    try {
      const res = await authFetch(`${INVOICES_API}/${invoice.id}/pdf`);
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u;
      a.download = `invoice-${invoice.invoice_number}.pdf`;
      a.click();
      URL.revokeObjectURL(u);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'Failed to download PDF');
    }
  };

  return (
    <DocumentPageShell>
      <DocumentHeader
        backTo="/invoices"
        backLabel="Back to Invoices"
        title={`Invoice ${invoice.invoice_number}`}
        subtitle={invoice.customer_name}
        status={
          <DocumentStatusBadge
            status={isPaid ? 'Paid' : 'Open'}
            variant={isPaid ? 'success' : 'warning'}
          />
        }
      />

      <DocumentToolbar>
        <button type="button" onClick={viewPdf} className="btn-doc-action text-sm">
          View PDF
        </button>
        <button type="button" onClick={downloadPdf} className="btn-doc-action text-sm">
          Download PDF
        </button>
        {balanceDue > 0 && (
          <button
            type="button"
            onClick={() => { setShowPaymentModal(true); setPaymentAmount(''); setPaymentError(''); }}
            className="btn-doc-primary text-sm"
          >
            Make payment
          </button>
        )}
      </DocumentToolbar>

      <ErrorBanner message={pdfError || error} />

      <FormSection title="Invoice details" variant="glass">
        <DocumentFieldGrid>
          <DocumentFieldSpan span={4}>
            <label className="block text-sm font-medium text-text-muted mb-1">Order #</label>
            <button type="button" onClick={() => navigate(`/orders/${invoice.order_id}`)} className="link-primary text-sm">
              {invoice.order_document_number}
            </button>
          </DocumentFieldSpan>
          <DocumentFieldSpan span={4}>
            <label className="block text-sm font-medium text-text-muted mb-1">Invoice date</label>
            <p className="text-text font-mono text-sm">{invoice.invoice_date}</p>
          </DocumentFieldSpan>
          <DocumentFieldSpan span={4}>
            <label className="block text-sm font-medium text-text-muted mb-1">Due date</label>
            <p className="text-text font-mono text-sm">{invoice.due_date ?? '—'}</p>
          </DocumentFieldSpan>
        </DocumentFieldGrid>
      </FormSection>

      <FormSection title="Line items" variant="glass">
        <LineItemEditor
          table={
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-1.5 px-2 font-medium text-text-muted">Description</th>
                  <th className="text-right py-1.5 px-2 font-medium text-text-muted w-16">Qty</th>
                  <th className="text-left py-1.5 px-2 font-medium text-text-muted w-14">U/M</th>
                  <th className="text-right py-1.5 px-2 font-medium text-text-muted w-24">Unit price</th>
                  <th className="text-right py-1.5 px-2 font-medium text-text-muted w-24">Extended</th>
                </tr>
              </thead>
              <tbody className="text-text">
                {invoice.lines.map((line) => (
                  <tr key={line.id} className="border-t border-border">
                    <td className="py-1.5 px-2">{line.description ?? '—'}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{Number(line.quantity)}</td>
                    <td className="py-1.5 px-2 font-mono text-sm">
                      {line.unit_of_measure?.trim() || line.item_unit_of_measure?.trim() || 'EA'}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">{Number(line.unit_price).toFixed(2)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{(Number(line.quantity) * Number(line.unit_price)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        />
        <DocumentTotalsPanel
          rows={[
            { label: 'Subtotal', value: Number(invoice.subtotal).toFixed(2) },
            { label: 'Tax', value: Number(invoice.tax_amount).toFixed(2) },
            { label: 'Shipping', value: Number(invoice.shipping_amount).toFixed(2) },
            { label: 'Total', value: Number(invoice.total).toFixed(2), emphasis: true },
          ]}
        />
      </FormSection>

      <FormSection title="Payments" variant="glass">
        <DocumentTotalsPanel
          rows={[
            { label: 'Amount paid', value: Number(invoice.amount_paid ?? 0).toFixed(2) },
            { label: 'Balance due', value: balanceDue.toFixed(2), emphasis: true },
          ]}
        />
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <h3 className="text-sm font-medium text-text-muted mb-2">Payment history</h3>
            <ul className="space-y-2 text-sm text-text">
              {invoice.payments.map((p) => (
                <li key={p.id} className="line-item-card py-2 px-3">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span className="font-mono">{formatDate(p.paid_at)}</span>
                    <span className="font-mono font-medium">{Number(p.amount).toFixed(2)}</span>
                    <span className="text-text-muted">{p.payment_method ?? '—'}{p.reference ? ` · ${p.reference}` : ''}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </FormSection>

      {showPaymentModal && (
        <div className="modal-overlay safe-area-pb" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
          <div className="modal-content">
            <h3 id="payment-modal-title" className="text-lg font-semibold text-text mb-4">Make payment</h3>
            <p className="text-text-muted text-sm mb-4">Balance due: {balanceDue.toFixed(2)}</p>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Amount *</label>
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
                <label className="block text-sm font-medium text-text-muted mb-1">Method</label>
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
                  <label className="block text-sm font-medium text-text-muted mb-1">Check / reference number</label>
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
    </DocumentPageShell>
  );
};

export default InvoiceDetailPage;
