import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:3000/api/app/invoices';

interface InvoiceSummary {
  id: number;
  invoice_number: string;
  order_id: number;
  order_document_number: string;
  customer_name: string;
  total: number;
  status: string;
  invoice_date: string;
  created_at: string;
}

const InvoicesPage = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null);

  const getToken = () => localStorage.getItem('token');

  const handleDownloadPdf = async (id: number, invoiceNumber: string) => {
    setPdfLoadingId(id);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/${id}/pdf`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to download PDF');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_BASE, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(res.status === 401 ? 'Unauthorized' : 'Failed to fetch');
      const data = await res.json();
      setInvoices(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return (
    <div className="page-container">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text">Invoices</h1>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-dark-text-muted py-8">Loading...</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th className="col-amount">Total</th>
                  <th className="col-status">Status</th>
                  <th className="col-date">Invoice date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="text-dark-text">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="cursor-pointer hover:bg-dark-surface-elevated/50"
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                  >
                    <td className="font-mono font-medium">{inv.invoice_number}</td>
                    <td className="font-mono">{inv.order_document_number}</td>
                    <td>{inv.customer_name}</td>
                    <td className="col-amount whitespace-nowrap">{Number(inv.total).toFixed(2)}</td>
                    <td className="col-status">{inv.status}</td>
                    <td className="col-date whitespace-nowrap">{inv.invoice_date}</td>
                    <td onClick={(e) => e.stopPropagation()} className="whitespace-nowrap">
                      <span className="flex flex-wrap gap-1 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          className="btn-secondary text-sm py-1.5 px-2 sm:px-3 min-h-[36px]"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                          disabled={pdfLoadingId === inv.id}
                          className="btn-secondary text-sm py-1.5 px-2 sm:px-3 min-h-[36px]"
                        >
                          {pdfLoadingId === inv.id ? '…' : 'PDF'}
                        </button>
                      </span>
                    </td>
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
  );
};

export default InvoicesPage;
