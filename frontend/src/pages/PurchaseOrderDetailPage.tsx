import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { BackArrow } from '../components/BackArrow';
import { authFetch } from '../api/client';
import { formatDate } from '../utils/formatDate';
import { apiBase } from '../api/config';

const API_BASE = `${apiBase}/api/app/purchase-orders`;

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
  ordered_via_notes: string | null;
  received_at: string | null;
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
  customer_name?: string | null;
  customer_address?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  lines: POLine[];
}

const ORDERED_VIA_OPTIONS = ['Email', 'Phone', 'Vendor portal', 'Fax', 'Online', 'Other'];

const PurchaseOrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [po, setPo] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [linePatchingId, setLinePatchingId] = useState<number | null>(null);
  const [lineEditId, setLineEditId] = useState<number | null>(null);
  const [lineOrderedVia, setLineOrderedVia] = useState('');
  const [lineOrderedViaNotes, setLineOrderedViaNotes] = useState('');
  const [markingReceivedId, setMarkingReceivedId] = useState<number | null>(null);

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

  const handleViewPdf = async () => {
    if (!po) return;
    setPdfLoading(true);
    setError('');
    try {
      const res = await authFetch(`${API_BASE}/${po.id}/pdf`);
      if (!res.ok) throw new Error('Failed to load PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load PDF');
    } finally {
      setPdfLoading(false);
    }
  };

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

  const handleCancelPo = async () => {
    if (!po || po.status !== 'open') return;
    if (!window.confirm('Cancel this purchase order? Order lines can be added to a new PO after cancellation.')) return;
    setCancelling(true);
    setError('');
    try {
      const res = await authFetch(`${API_BASE}/${po.id}/cancel`, { method: 'PATCH' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to cancel PO');
      await fetchPo();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel purchase order');
    } finally {
      setCancelling(false);
    }
  };

  const handleMarkLineOrdered = async (lineId: number, orderedVia: string, orderedViaNotes: string) => {
    if (!po) return;
    setLinePatchingId(lineId);
    setError('');
    try {
      const res = await authFetch(`${API_BASE}/${po.id}/lines/${lineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordered_at: new Date().toISOString(),
          ordered_via: orderedVia || null,
          ordered_via_notes: orderedViaNotes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to update line');
      await fetchPo();
      setLineEditId(null);
      setLineOrderedVia('');
      setLineOrderedViaNotes('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update line');
    } finally {
      setLinePatchingId(null);
    }
  };

  const handleMarkLineReceived = async (lineId: number) => {
    if (!po) return;
    setMarkingReceivedId(lineId);
    setError('');
    try {
      const res = await authFetch(`${API_BASE}/${po.id}/lines/${lineId}/received`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to mark received');
      await fetchPo();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to mark received');
    } finally {
      setMarkingReceivedId(null);
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
  const allLinesReceived = po.lines.length > 0 && po.lines.every((l) => l.received_at != null);

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
          onClick={handleViewPdf}
          disabled={pdfLoading}
          className="btn-text-action"
        >
          {pdfLoading ? '…' : 'View PDF'}
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={pdfLoading}
          className="btn-text-action"
        >
          {pdfLoading ? '…' : 'Download PDF'}
        </button>
        {isOpen && (
          <button
            type="button"
            onClick={handleCancelPo}
            disabled={cancelling}
            className="btn-text-action"
          >
            {cancelling ? 'Cancelling…' : 'Cancel PO'}
          </button>
        )}
        {isOpen && (
          <button
            type="button"
            onClick={handleClosePo}
            disabled={closing || !allLinesReceived}
            className="btn-text-action"
            title={!allLinesReceived ? 'All lines must be received before closing' : undefined}
          >
            {closing ? 'Closing…' : 'Close PO'}
          </button>
        )}
        {isOpen && !allLinesReceived && po.lines.length > 0 && (
          <span className="text-dark-text-muted text-sm">All lines must be received before closing.</span>
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
        {(po.customer_name != null || po.customer_address != null || po.customer_email != null || po.customer_phone != null) && (
          <div className="mt-4 pt-4 border-t border-dark-border">
            <h3 className="text-sm font-medium text-dark-text-muted mb-2">Customer</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {po.customer_name != null && po.customer_name !== '' && (
                <div className="sm:col-span-2">
                  <dt className="text-dark-text-muted">Name</dt>
                  <dd className="text-dark-text">{po.customer_name}</dd>
                </div>
              )}
              {po.customer_address != null && po.customer_address !== '' && (
                <div className="sm:col-span-2">
                  <dt className="text-dark-text-muted">Address</dt>
                  <dd className="text-dark-text whitespace-pre-wrap">{po.customer_address}</dd>
                </div>
              )}
              {po.customer_email != null && po.customer_email !== '' && (
                <div>
                  <dt className="text-dark-text-muted">Email</dt>
                  <dd className="text-dark-text">{po.customer_email}</dd>
                </div>
              )}
              {po.customer_phone != null && po.customer_phone !== '' && (
                <div>
                  <dt className="text-dark-text-muted">Phone</dt>
                  <dd className="text-dark-text">{po.customer_phone}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
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
                <th>Received</th>
                {isOpen && <th>Actions</th>}
              </tr>
            </thead>
            <tbody className="text-dark-text">
              {po.lines.map((line) => {
                const qty = Number(line.quantity);
                const cost = Number(line.unit_cost);
                const extended = qty * cost;
                const isOrdered = line.ordered_at != null;
                const isReceived = line.received_at != null;
                const isEditing = lineEditId === line.id;
                const isPatching = linePatchingId === line.id;
                const showNotesField = (lineOrderedVia === 'Other' || lineOrderedVia === 'Online') && isEditing;
                return (
                  <tr key={line.id} className="hover:bg-dark-surface-elevated/50">
                    <td>
                      <div className="font-medium">{line.description || line.item_name || '—'}</div>
                      {line.sku ? (
                        <div className="text-xs text-dark-text-muted mt-0.5">SKU: {line.sku}</div>
                      ) : null}
                    </td>
                    <td className="text-right">{qty}</td>
                    <td className="text-right">{cost.toFixed(2)}</td>
                    <td className="text-right">{extended.toFixed(2)}</td>
                    <td>
                      {isOrdered ? (
                        <span className="text-dark-text-muted text-sm">
                          {formatDate(line.ordered_at)}
                          {line.ordered_via && ` · ${line.ordered_via}`}
                          {line.ordered_via_notes && (
                            <span className="block mt-0.5 text-xs" title={line.ordered_via_notes}>
                              {line.ordered_via_notes.length > 40 ? `${line.ordered_via_notes.slice(0, 40)}…` : line.ordered_via_notes}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-dark-text-muted">—</span>
                      )}
                    </td>
                    <td>
                      {isReceived ? (
                        <span className="text-dark-text-muted text-sm">{formatDate(line.received_at)}</span>
                      ) : (
                        <span className="text-dark-text-muted">—</span>
                      )}
                    </td>
                    {isOpen && (
                      <td className="whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex flex-col gap-2">
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
                                onClick={() => handleMarkLineOrdered(line.id, lineOrderedVia, lineOrderedViaNotes)}
                                disabled={isPatching}
                                className="btn-text-action text-sm py-1 px-2"
                              >
                                {isPatching ? '…' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setLineEditId(null); setLineOrderedVia(''); setLineOrderedViaNotes(''); }}
                                className="btn-text-action text-sm py-1 px-2"
                              >
                                Cancel
                              </button>
                            </div>
                            {showNotesField && (
                              <input
                                type="text"
                                value={lineOrderedViaNotes}
                                onChange={(e) => setLineOrderedViaNotes(e.target.value)}
                                placeholder="URL or description"
                                className="input-field text-sm py-1 px-2 max-w-[240px]"
                              />
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1">
                            {!isOrdered && (
                              <button
                                type="button"
                                onClick={() => { setLineEditId(line.id); setLineOrderedVia(line.ordered_via || ''); setLineOrderedViaNotes(line.ordered_via_notes || ''); }}
                                className="btn-text-action text-sm py-1 px-2"
                              >
                                Mark ordered
                              </button>
                            )}
                            {isOrdered && !isReceived && (
                              <button
                                type="button"
                                onClick={() => handleMarkLineReceived(line.id)}
                                disabled={markingReceivedId === line.id}
                                className="btn-text-action text-sm py-1 px-2"
                              >
                                {markingReceivedId === line.id ? '…' : 'Mark received'}
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
