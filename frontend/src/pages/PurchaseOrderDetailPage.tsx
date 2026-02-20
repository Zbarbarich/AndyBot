import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackArrow } from '../components/BackArrow';
import { authFetch } from '../api/client';
import { formatDate } from '../utils/formatDate';

const API_BASE = 'http://localhost:3000/api/app/purchase-orders';

interface POLine {
  id: number;
  purchase_order_id: number;
  item_id: number | null;
  description: string | null;
  quantity: number | string;
  unit_cost: number | string;
  sort_order: number;
  ordered_at: string | null;
  ordered_via: string | null;
  sku: string | null;
  item_name: string | null;
}

interface PurchaseOrderDetail {
  id: number;
  po_number: string;
  order_id: number;
  order_document_number?: string;
  created_at: string;
  status: string;
  lines: POLine[];
}

const ORDERED_VIA_OPTIONS = ['Email', 'Phone', 'Vendor portal', 'Fax', 'Other'];

const PurchaseOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [po, setPo] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [linePatchingId, setLinePatchingId] = useState<number | null>(null);
  const [lineEditId, setLineEditId] = useState<number | null>(null);
  const [lineOrderedVia, setLineOrderedVia] = useState('');

  const fetchPo = useCallback(async () => {
    if (!id) return;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      setError('Invalid PO id');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`${API_BASE}/${numId}`);
      if (!res.ok) {
        if (res.status === 404) setError('Purchase order not found');
        else setError('Failed to load PO');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setPo(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPo();
  }, [fetchPo]);

  const handleDownloadPdf = async () => {
    if (!po) return;
    setPdfLoading(true);
    setError('');
    try {
      const res = await authFetch(`${API_BASE}/${po.id}/pdf`);
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `po-${po.po_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to download PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleClosePo = async () => {
    if (!po || po.status === 'closed') return;
    setClosing(true);
    setError('');
    try {
      const res = await authFetch(`${API_BASE}/${po.id}/close`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to close PO');
      await fetchPo();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to close purchase order');
    } finally {
      setClosing(false);
    }
  };

  const handleMarkLineOrdered = async (lineId: number, orderedVia: string) => {
    if (!po) return;
    setLinePatchingId(lineId);
    setError('');
    try {
      const res = await authFetch(`${API_BASE}/${po.id}/lines/${lineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordered_at: new Date().toISOString(), ordered_via: orderedVia || null }),
      });
      if (!res.ok) throw new Error('Failed to update line');
      await fetchPo();
      setLineEditId(null);
      setLineOrderedVia('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update line');
    } finally {
      setLinePatchingId(null);
    }
  };

  const handleClearLineOrdered = async (lineId: number) => {
    if (!po) return;
    setLinePatchingId(lineId);
    setError('');
    try {
      const res = await authFetch(`${API_BASE}/${po.id}/lines/${lineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordered_at: null, ordered_via: null }),
      });
      if (!res.ok) throw new Error('Failed to update line');
      await fetchPo();
      setLineEditId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update line');
    } finally {
      setLinePatchingId(null);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <p className="text-dark-text-muted py-8">Loading...</p>
      </div>
    );
  }

  if (error && !po) {
    return (
      <div className="page-container">
        <BackArrow to="/purchasing" label="Back to Purchasing" className="mb-4" />
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!po) return null;

  const isOpen = po.status === 'open';

  return (
    <div className="page-container">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <BackArrow to="/purchasing" label="Back to Purchasing" />
        <span className="text-dark-text font-medium">PO {po.po_number}</span>
      </div>
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={pdfLoading}
          className="btn-secondary"
        >
          {pdfLoading ? '…' : 'Download PDF'}
        </button>
        {isOpen && (
          <button
            type="button"
            onClick={handleClosePo}
            disabled={closing}
            className="btn-primary"
          >
            {closing ? 'Closing…' : 'Close PO'}
          </button>
        )}
      </div>

      <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border mb-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-dark-text-muted">PO #</dt>
            <dd className="font-mono font-medium text-dark-text">{po.po_number}</dd>
          </div>
          <div>
            <dt className="text-dark-text-muted">Customer order</dt>
            <dd className="font-mono text-dark-text">
              {po.order_document_number ? `#${po.order_document_number}` : `ID ${po.order_id}`}
            </dd>
          </div>
          <div>
            <dt className="text-dark-text-muted">Created</dt>
            <dd className="text-dark-text">{formatDate(po.created_at)}</dd>
          </div>
          <div>
            <dt className="text-dark-text-muted">Status</dt>
            <dd className="text-dark-text capitalize">{po.status}</dd>
          </div>
        </dl>
      </div>

      <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border">
        <h2 className="text-lg font-semibold text-dark-text mb-4">Lines</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Item / Description</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Unit cost</th>
                <th className="text-right">Extended</th>
                <th>Ordered</th>
                {isOpen && <th>Actions</th>}
              </tr>
            </thead>
            <tbody className="text-dark-text">
              {po.lines.map((line) => {
                const qty = Number(line.quantity);
                const cost = Number(line.unit_cost);
                const extended = qty * cost;
                const isOrdered = line.ordered_at != null;
                const isEditing = lineEditId === line.id;
                const isPatching = linePatchingId === line.id;
                return (
                  <tr key={line.id} className="hover:bg-dark-surface-elevated/50">
                    <td>
                      <div className="font-medium">{line.sku ? `${line.sku} – ${line.item_name ?? line.description ?? '—'}` : (line.description || '—')}</div>
                    </td>
                    <td className="text-right">{qty}</td>
                    <td className="text-right">{cost.toFixed(2)}</td>
                    <td className="text-right">{extended.toFixed(2)}</td>
                    <td>
                      {isOrdered ? (
                        <span className="text-dark-text-muted text-sm">
                          {formatDate(line.ordered_at)}
                          {line.ordered_via && ` · ${line.ordered_via}`}
                        </span>
                      ) : (
                        <span className="text-dark-text-muted">—</span>
                      )}
                    </td>
                    {isOpen && (
                      <td className="whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={lineOrderedVia}
                              onChange={(e) => setLineOrderedVia(e.target.value)}
                              className="input-field text-sm py-1 px-2 max-w-[140px]"
                            >
                              <option value="">How ordered</option>
                              {ORDERED_VIA_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleMarkLineOrdered(line.id, lineOrderedVia)}
                              disabled={isPatching}
                              className="btn-primary text-sm py-1 px-2"
                            >
                              {isPatching ? '…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setLineEditId(null); setLineOrderedVia(''); }}
                              className="btn-secondary text-sm py-1 px-2"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => { setLineEditId(line.id); setLineOrderedVia(line.ordered_via || ''); }}
                              className="btn-secondary text-sm py-1 px-2"
                            >
                              {isOrdered ? 'Edit' : 'Mark ordered'}
                            </button>
                            {isOrdered && (
                              <button
                                type="button"
                                onClick={() => handleClearLineOrdered(line.id)}
                                disabled={isPatching}
                                className="btn-secondary text-sm py-1 px-2 text-dark-text-muted"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {po.lines.length === 0 && (
          <p className="p-4 text-dark-text-muted text-center text-sm">No lines on this PO.</p>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderDetailPage;
