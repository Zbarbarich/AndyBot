import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { authFetch } from '../api/client';
import { formatDate } from '../utils/formatDate';
import { apiBase } from '../api/config';

const API_BASE = `${apiBase}/api/app/quotes`;

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

  const handleDownloadPdf = async (id: number, documentNumber: string) => {
    setPdfLoadingId(id);
    setError('');
    try {
      const res = await authFetch(`${API_BASE}/${id}/pdf`);
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
      const res = await authFetch(API_BASE);
      if (!res.ok) throw new Error('Failed to fetch');
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
      <div className="flex flex-nowrap items-center justify-end gap-2 mb-2">
        <button
          type="button"
          onClick={() => navigate('/quotes/new')}
          className="btn-icon-primary shrink-0"
          aria-label="New quote"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-dark-border bg-dark-surface overflow-hidden">
        {loading ? (
          <p className="text-dark-text-muted py-8 px-4">Loading...</p>
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
                    <td className="whitespace-nowrap">{formatDate(q.valid_until)}</td>
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
    </div>
  );
};

export default QuotesPage;
