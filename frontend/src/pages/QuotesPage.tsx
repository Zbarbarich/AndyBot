import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:3000/api/app/quotes';

interface QuoteSummary {
  id: number;
  document_number: string;
  type: string;
  customer_id: number;
  customer_name: string;
  status: string;
  valid_until: string | null;
  total: number;
  created_at: string;
}

const QuotesPage = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null);

  const getToken = () => localStorage.getItem('token');

  const handleDownloadPdf = async (id: number, documentNumber: string) => {
    setPdfLoadingId(id);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/${id}/pdf`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quote-${documentNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to download PDF');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const fetchQuotes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_BASE, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(res.status === 401 ? 'Unauthorized' : 'Failed to fetch');
      const data = await res.json();
      setQuotes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load quotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  return (
    <div className="page-container">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text">Quotes</h1>
          <button
            type="button"
            onClick={() => navigate('/quotes/new')}
            className="btn-primary w-full sm:w-auto"
          >
            New Quote
          </button>
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
                  <th>Document #</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Valid until</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="text-dark-text">
                {quotes.map((q) => (
                  <tr
                    key={q.id}
                    className="cursor-pointer hover:bg-dark-surface-elevated/50"
                    onClick={() => navigate(`/quotes/${q.id}`)}
                  >
                    <td className="font-mono font-medium">{q.document_number}</td>
                    <td>{q.customer_name}</td>
                    <td className="whitespace-nowrap">{Number(q.total).toFixed(2)}</td>
                    <td>{q.status}</td>
                    <td className="whitespace-nowrap">{q.valid_until ?? '—'}</td>
                    <td onClick={(e) => e.stopPropagation()} className="whitespace-nowrap">
                      <span className="flex flex-wrap gap-1 sm:gap-2">
                        <Link
                          to={`/quotes/${q.id}`}
                          className="btn-secondary text-sm py-1.5 px-2 sm:px-3 min-h-[36px]"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(q.id, q.document_number)}
                          disabled={pdfLoadingId === q.id}
                          className="btn-secondary text-sm py-1.5 px-2 sm:px-3 min-h-[36px]"
                        >
                          {pdfLoadingId === q.id ? '…' : 'PDF'}
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {quotes.length === 0 && (
              <p className="p-6 text-dark-text-muted text-center">No quotes yet. Create one to get started.</p>
            )}
          </div>
        )}
    </div>
  );
};

export default QuotesPage;
