import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../api/client';
import { formatDate } from '../utils/formatDate';
import { BackArrow } from '../components/BackArrow';
import { apiBase } from '../api/config';

const CUSTOMERS_API = `${apiBase}/api/app/customers`;
const INVOICES_API = `${apiBase}/api/app/invoices`;
const ORDERS_API = `${apiBase}/api/app/orders`;

interface PaymentRow {
  id: number;
  payment_type: 'invoice' | 'deposit';
  invoice_id?: number | null;
  order_id: number;
  order_document_number: string;
  amount: string | number;
  payment_method: string | null;
  paid_at: string;
  reference: string | null;
  invoice_number?: string | null;
  applied_to_invoice_id?: number | null;
  applied_invoice_number?: string | null;
}

const CustomerPaymentHistoryPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState<string>('');
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reversingId, setReversingId] = useState<{ type: 'invoice' | 'deposit'; id: number; invoice_id?: number; order_id?: number } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const customerId = parseInt(id, 10);
    if (Number.isNaN(customerId)) {
      setError('Invalid customer id');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [custRes, historyRes] = await Promise.all([
        authFetch(`${CUSTOMERS_API}/${customerId}`),
        authFetch(`${CUSTOMERS_API}/${customerId}/payment-history`),
      ]);
      if (!custRes.ok) {
        setError('Customer not found');
        setLoading(false);
        return;
      }
      if (!historyRes.ok) {
        setError('Failed to load payment history');
        setLoading(false);
        return;
      }
      const cust = await custRes.json();
      const data = await historyRes.json();
      setCustomerName(cust.name ?? '');
      setPayments(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReverse = async (row: PaymentRow) => {
    if (row.payment_type === 'deposit' && row.applied_to_invoice_id != null) {
      return;
    }
    const msg =
      row.payment_type === 'invoice'
        ? `Reverse this payment of $${Number(row.amount).toFixed(2)} on Invoice ${row.invoice_number}? This cannot be undone.`
        : `Remove this unapplied deposit of $${Number(row.amount).toFixed(2)}?`;
    if (!window.confirm(msg)) return;

    setReversingId({
      type: row.payment_type,
      id: row.id,
      invoice_id: row.invoice_id ?? undefined,
      order_id: row.order_id,
    });

    try {
      if (row.payment_type === 'invoice' && row.invoice_id != null) {
        const res = await authFetch(`${INVOICES_API}/${row.invoice_id}/payments/${row.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(err.error || 'Failed to reverse payment');
          return;
        }
      } else if (row.payment_type === 'deposit' && row.applied_to_invoice_id == null) {
        const res = await authFetch(`${ORDERS_API}/${row.order_id}/deposits/${row.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(err.error || 'Failed to remove deposit');
          return;
        }
      }
      await load();
    } catch {
      alert('Request failed');
    } finally {
      setReversingId(null);
    }
  };

  if (error) {
    return (
      <div className="page-container">
        <div className="p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">{error}</div>
        <BackArrow to="/customers" label="Back to Customers" className="mt-4" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-4">
        <BackArrow to={id ? `/customers/${id}` : '/customers'} label={customerName ? `Back to ${customerName}` : 'Back to Customer'} />
      </div>

      <h1 className="text-xl sm:text-2xl font-semibold text-dark-text mb-2">
        Payment history{customerName ? ` – ${customerName}` : ''}
      </h1>
      <p className="text-dark-text-muted text-sm mb-6">
        Reverse a payment if a check bounced or was returned. Applied deposits must be reversed from the invoice they were applied to.
      </p>

      {loading ? (
        <div className="text-dark-text-muted py-8">Loading…</div>
      ) : payments.length === 0 ? (
        <div className="rounded-lg border border-dark-border bg-dark-surface p-6 text-dark-text-muted text-center">
          No payments recorded for this customer.
        </div>
      ) : (
        <>
        <div className="table-scroll overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th className="col-date">Date</th>
                <th>Type</th>
                <th className="col-amount">Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Order #</th>
                <th>Invoice / Applied to</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody className="text-dark-text">
              {payments.map((row) => {
                const canReverse =
                  row.payment_type === 'invoice' ||
                  (row.payment_type === 'deposit' && row.applied_to_invoice_id == null);
                const isReversing =
                  reversingId?.type === row.payment_type &&
                  reversingId?.id === row.id &&
                  (row.payment_type !== 'invoice' || reversingId?.invoice_id === row.invoice_id) &&
                  (row.payment_type !== 'deposit' || reversingId?.order_id === row.order_id);
                return (
                  <tr key={`${row.payment_type}-${row.id}`}>
                    <td className="col-date whitespace-nowrap">{formatDate(row.paid_at)}</td>
                    <td>{row.payment_type === 'invoice' ? 'Invoice payment' : 'Deposit'}</td>
                    <td className="col-amount">${Number(row.amount).toFixed(2)}</td>
                    <td>{row.payment_method ?? '—'}</td>
                    <td>{row.reference ?? '—'}</td>
                    <td className="font-mono">
                      {row.order_document_number ? (
                        <button
                          type="button"
                          className="link-primary text-sm"
                          onClick={() => navigate(`/orders/${row.order_id}`)}
                        >
                          {row.order_document_number}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {row.payment_type === 'invoice' && row.invoice_number && (
                        <button
                          type="button"
                          className="link-primary text-sm font-mono"
                          onClick={() => navigate(`/invoices/${row.invoice_id}`)}
                        >
                          {row.invoice_number}
                        </button>
                      )}
                      {row.payment_type === 'deposit' &&
                        (row.applied_invoice_number ? (
                          <span className="text-dark-text-muted text-sm">
                            Applied to{' '}
                            <button
                              type="button"
                              className="link-primary font-mono"
                              onClick={() => navigate(`/invoices/${row.applied_to_invoice_id}`)}
                            >
                              {row.applied_invoice_number}
                            </button>
                          </span>
                        ) : (
                          <span className="text-dark-text-muted text-sm">Unapplied</span>
                        ))}
                      {row.payment_type === 'invoice' && !row.invoice_number && '—'}
                    </td>
                    <td>
                      {canReverse ? (
                        <button
                          type="button"
                          className="btn-secondary text-sm py-1 px-2 min-h-0 text-red-400 border-red-500/50 hover:border-red-500"
                          onClick={() => handleReverse(row)}
                          disabled={!!isReversing}
                        >
                          {isReversing ? 'Reversing…' : row.payment_type === 'invoice' ? 'Reverse' : 'Remove'}
                        </button>
                      ) : (
                        <span className="text-dark-text-muted text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="text-dark-text border-t border-dark-border font-medium">
              <tr>
                <td colSpan={2} className="py-2 px-2 text-right">Invoice payments</td>
                <td className="col-amount py-2 px-2">
                  ${payments.filter((r) => r.payment_type === 'invoice').reduce((sum, r) => sum + Number(r.amount), 0).toFixed(2)}
                </td>
                <td colSpan={5} />
              </tr>
              <tr>
                <td colSpan={2} className="py-2 px-2 text-right">Deposits</td>
                <td className="col-amount py-2 px-2">
                  ${payments.filter((r) => r.payment_type === 'deposit').reduce((sum, r) => sum + Number(r.amount), 0).toFixed(2)}
                </td>
                <td colSpan={5} />
              </tr>
              <tr>
                <td colSpan={2} className="py-2 px-2 text-right">Total</td>
                <td className="col-amount py-2 px-2">
                  ${payments.reduce((sum, r) => sum + Number(r.amount), 0).toFixed(2)}
                </td>
                <td colSpan={5} />
              </tr>
            </tfoot>
          </table>
        </div>
        </>
      )}
    </div>
  );
};

export default CustomerPaymentHistoryPage;
