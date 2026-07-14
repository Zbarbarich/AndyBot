import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { authFetch } from '../api/client';
import { formatDate } from '../utils/formatDate';
import { apiBase } from '../api/config';
import { ErrorBanner } from '../components/ErrorBanner';
import { ListPageToolbar } from '../components/MobilePageTitle';

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

  const handleDownloadPdf = async (id: number, documentNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF');
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
      <ListPageToolbar>
        <button
          type="button"
          onClick={() => navigate('/quotes/new')}
          className="btn-icon-primary shrink-0"
          aria-label="New quote"
        >
          <Plus className="w-5 h-5" />
        </button>
      </ListPageToolbar>

      <ErrorBanner message={error} />

      <div className="glass-card overflow-hidden">
        {loading ? (
          <p className="text-text-muted py-8 px-4">Loading...</p>
        ) : quotes.length === 0 ? (
          <p className="p-6 text-text-muted text-center">No quotes yet. Create one to get started.</p>
        ) : (
          <>
            <div className="md:hidden p-3 space-y-3">
              {quotes.map((q) => (
                <div key={q.id} className="list-card flex-col items-stretch !cursor-default">
                  <button type="button" className="flex items-center gap-3 w-full text-left min-h-[44px]" onClick={() => navigate(`/quotes/${q.id}`)}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text truncate">{q.document_number}</div>
                      <div className="text-sm text-text-muted truncate">{q.customer_name}</div>
                    </div>
                  </button>
                  <div className="flex gap-2 mt-2 pt-2 border-t border-border">
                    <button type="button" className="btn-secondary text-sm flex-1 min-h-[44px]" onClick={() => navigate(`/quotes/${q.id}`)}>View</button>
                    <button type="button" className="btn-secondary text-sm flex-1 min-h-[44px]" disabled={pdfLoadingId === q.id} onClick={(e) => handleDownloadPdf(q.id, q.document_number, e)}>
                      {pdfLoadingId === q.id ? '…' : 'PDF'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block table-scroll border-0 rounded-none">
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
                <tbody className="text-text">
                  {quotes.map((q) => (
                    <tr key={q.id} className="cursor-pointer" onClick={() => navigate(`/quotes/${q.id}`)}>
                      <td className="font-mono font-medium">{q.document_number}</td>
                      <td>{q.customer_name}</td>
                      <td className="whitespace-nowrap">{Number(q.total).toFixed(2)}</td>
                      <td>{q.status}</td>
                      <td className="whitespace-nowrap">{formatDate(q.valid_until)}</td>
                      <td onClick={(e) => e.stopPropagation()} className="whitespace-nowrap">
                        <span className="flex flex-wrap gap-2">
                          <Link to={`/quotes/${q.id}`} className="btn-secondary text-sm py-2 px-3 min-h-[44px]">View</Link>
                          <button type="button" onClick={(e) => handleDownloadPdf(q.id, q.document_number, e)} disabled={pdfLoadingId === q.id} className="btn-secondary text-sm py-2 px-3 min-h-[44px]">
                            {pdfLoadingId === q.id ? '…' : 'PDF'}
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QuotesPage;
