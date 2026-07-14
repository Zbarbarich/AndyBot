import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ErrorBanner } from '../components/ErrorBanner';
import FormSection from '../components/FormSection';
import { LineItemEditor } from '../components/LineItemEditor';
import DocumentPageShell from '../components/document/DocumentPageShell';
import DocumentHeader from '../components/document/DocumentHeader';
import DocumentToolbar from '../components/document/DocumentToolbar';
import DocumentFieldGrid, { DocumentFieldSpan } from '../components/document/DocumentFieldGrid';
import DocumentTotalsPanel from '../components/document/DocumentTotalsPanel';
import DocumentStatusBadge from '../components/document/DocumentStatusBadge';
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
      <DocumentPageShell>
        <p className="text-text-muted py-8">Loading...</p>
      </DocumentPageShell>
    );
  }

  if (error && !po) {
    return (
      <DocumentPageShell>
        <p className="text-red-400">{error}</p>
      </DocumentPageShell>
    );
  }

  if (!po) return null;

  const isOpen = po.status === 'open';
  const allLinesReceived = po.lines.length > 0 && po.lines.every((l) => l.received_at != null);
  const poTotal = po.lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unit_cost), 0);

  return (
    <DocumentPageShell>
      <DocumentHeader
        backTo="/purchasing"
        backLabel="Back to Purchasing"
        title={`PO ${po.po_number}`}
        subtitle={po.customer_name ?? undefined}
        status={
          <DocumentStatusBadge
            status={po.status}
            variant={po.status === 'closed' ? 'success' : po.status === 'cancelled' ? 'muted' : 'default'}
          />
        }
      />

      <DocumentToolbar>
        <button type="button" onClick={handleViewPdf} disabled={pdfLoading} className="btn-doc-action text-sm">
          {pdfLoading ? '…' : 'View PDF'}
        </button>
        <button type="button" onClick={handleDownloadPdf} disabled={pdfLoading} className="btn-doc-action text-sm">
          {pdfLoading ? '…' : 'Download PDF'}
        </button>
        {isOpen && (
          <button type="button" onClick={handleCancelPo} disabled={cancelling} className="btn-doc-danger text-sm">
            {cancelling ? 'Cancelling…' : 'Cancel PO'}
          </button>
        )}
        {isOpen && (
          <button
            type="button"
            onClick={handleClosePo}
            disabled={closing || !allLinesReceived}
            className="btn-doc-primary text-sm"
            title={!allLinesReceived ? 'All lines must be received before closing' : undefined}
          >
            {closing ? 'Closing…' : 'Close PO'}
          </button>
        )}
      </DocumentToolbar>

      <ErrorBanner message={error} />

      {isOpen && !allLinesReceived && po.lines.length > 0 && (
        <p className="text-text-muted text-sm">All lines must be received before closing this PO.</p>
      )}

      <FormSection title="Details" variant="glass">
        <DocumentFieldGrid>
          <DocumentFieldSpan span={4}>
            <label className="block text-sm font-medium text-text-muted mb-1">Customer order</label>
            <p className="text-text font-mono text-sm">
              {po.order_document_number ? `#${po.order_document_number}` : `ID ${po.order_id}`}
            </p>
          </DocumentFieldSpan>
          <DocumentFieldSpan span={4}>
            <label className="block text-sm font-medium text-text-muted mb-1">Created</label>
            <p className="text-text text-sm">{formatDate(po.created_at)}</p>
          </DocumentFieldSpan>
          {(po.customer_address || po.customer_email || po.customer_phone) && (
            <DocumentFieldSpan span={12}>
              <div className="pt-2 border-t border-border space-y-2">
                {po.customer_address && (
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Address</label>
                    <p className="text-sm text-text whitespace-pre-wrap">{po.customer_address}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {po.customer_email && (
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Email</label>
                      <p className="text-sm text-text">{po.customer_email}</p>
                    </div>
                  )}
                  {po.customer_phone && (
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Phone</label>
                      <p className="text-sm text-text">{po.customer_phone}</p>
                    </div>
                  )}
                </div>
              </div>
            </DocumentFieldSpan>
          )}
        </DocumentFieldGrid>
      </FormSection>

      <FormSection title="Line items" variant="glass">
        {po.lines.length === 0 ? (
          <p className="text-text-muted text-sm py-2">No lines on this PO.</p>
        ) : (
          <LineItemEditor
            table={
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-1.5 px-2 font-medium text-text-muted">Item / Description</th>
                    <th className="text-right py-1.5 px-2 font-medium text-text-muted w-14">Qty</th>
                    <th className="text-right py-1.5 px-2 font-medium text-text-muted w-20">Unit cost</th>
                    <th className="text-right py-1.5 px-2 font-medium text-text-muted w-20">Extended</th>
                    <th className="text-left py-1.5 px-2 font-medium text-text-muted w-24">Status</th>
                    {isOpen && <th className="text-left py-1.5 px-2 font-medium text-text-muted min-w-[9rem]">Actions</th>}
                  </tr>
                </thead>
                <tbody className="text-text">
                  {po.lines.map((line) => {
                    const qty = Number(line.quantity);
                    const cost = Number(line.unit_cost);
                    const extended = qty * cost;
                    const isOrdered = line.ordered_at != null;
                    const isReceived = line.received_at != null;
                    const isEditing = lineEditId === line.id;
                    const isPatching = linePatchingId === line.id;
                    const showNotesField =
                      (lineOrderedVia === 'Other' || lineOrderedVia === 'Online') && isEditing;

                    const statusLabel = isReceived ? 'Received' : isOrdered ? 'Ordered' : 'Pending';
                    const statusClass = isReceived
                      ? 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30'
                      : isOrdered
                        ? 'bg-primary/15 text-primary border-primary/30'
                        : 'bg-surface-elevated text-text-muted border-border';

                    return (
                      <tr key={line.id} className="border-t border-border">
                        <td className="py-1.5 px-2 align-top min-w-[10rem]">
                          <div className="font-medium text-sm leading-snug">
                            {line.description || line.item_name || '—'}
                          </div>
                          {line.sku && (
                            <div className="text-xs text-text-muted font-mono mt-0.5">{line.sku}</div>
                          )}
                          {isOrdered && (
                            <div className="text-xs text-text-muted mt-1 space-y-0.5">
                              <div>Ordered {formatDate(line.ordered_at)}</div>
                              {line.ordered_via && <div>via {line.ordered_via}</div>}
                              {line.ordered_via_notes && (
                                <div className="truncate max-w-[14rem]" title={line.ordered_via_notes}>
                                  {line.ordered_via_notes}
                                </div>
                              )}
                              {isReceived && line.received_at && (
                                <div>Received {formatDate(line.received_at)}</div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono align-top">{qty}</td>
                        <td className="py-1.5 px-2 text-right font-mono align-top">{cost.toFixed(2)}</td>
                        <td className="py-1.5 px-2 text-right font-mono align-top">{extended.toFixed(2)}</td>
                        <td className="py-1.5 px-2 align-top">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusClass}`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        {isOpen && (
                          <td className="py-1.5 px-2 align-top">
                            {isEditing ? (
                              <div className="flex flex-col gap-1.5 max-w-[12rem]">
                                <select
                                  value={lineOrderedVia}
                                  onChange={(e) => setLineOrderedVia(e.target.value)}
                                  className="input-field w-full text-xs"
                                  aria-label="How ordered"
                                >
                                  <option value="">How ordered</option>
                                  {ORDERED_VIA_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                                {showNotesField && (
                                  <input
                                    type="text"
                                    value={lineOrderedViaNotes}
                                    onChange={(e) => setLineOrderedViaNotes(e.target.value)}
                                    placeholder="URL or notes"
                                    className="input-field w-full text-xs"
                                  />
                                )}
                                <div className="flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleMarkLineOrdered(line.id, lineOrderedVia, lineOrderedViaNotes)
                                    }
                                    disabled={isPatching}
                                    className="btn-doc-primary text-xs px-2.5 py-1.5 min-h-[32px] flex-1"
                                  >
                                    {isPatching ? '…' : 'Save'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLineEditId(null);
                                      setLineOrderedVia('');
                                      setLineOrderedViaNotes('');
                                    }}
                                    className="btn-doc-action text-xs px-2.5 py-1.5 min-h-[32px]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1.5 items-stretch">
                                {!isOrdered && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLineEditId(line.id);
                                      setLineOrderedVia(line.ordered_via || '');
                                      setLineOrderedViaNotes(line.ordered_via_notes || '');
                                    }}
                                    className="btn-doc-action text-xs px-2.5 py-1.5 min-h-[32px] w-full"
                                  >
                                    Mark ordered
                                  </button>
                                )}
                                {isOrdered && !isReceived && (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkLineReceived(line.id)}
                                    disabled={markingReceivedId === line.id}
                                    className="btn-doc-primary text-xs px-2.5 py-1.5 min-h-[32px] w-full"
                                  >
                                    {markingReceivedId === line.id ? '…' : 'Mark received'}
                                  </button>
                                )}
                                {isReceived && (
                                  <span className="text-xs text-text-muted px-1">Done</span>
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
            }
          />
        )}
        <DocumentTotalsPanel
          rows={[{ label: 'PO total', value: poTotal.toFixed(2), emphasis: true }]}
        />
      </FormSection>
    </DocumentPageShell>
  );
};

export default PurchaseOrderDetailPage;
