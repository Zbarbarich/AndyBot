import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import heic2any from 'heic2any';
import { authFetch } from '../api/client';
import { BackArrow } from '../components/BackArrow';
import { apiBase } from '../api/config';
import { formatDate } from '../utils/formatDate';

const TICKETS_API = `${apiBase}/api/app/tickets`;
const CUSTOMERS_API = `${apiBase}/api/app/customers`;

/** True if mime type is image/* (including HEIC; we convert HEIC to JPEG for display). */
function isImageType(mimeType: string | null | undefined): boolean {
  return !!(mimeType && mimeType.toLowerCase().startsWith('image/'));
}

/** File type icon for non-image attachments (generic document silhouette). */
function FileTypeIcon({ mimeType, filename }: { mimeType?: string | null; filename?: string | null }) {
  const mt = (mimeType || '').toLowerCase();
  const ext = (filename || '').split('.').pop()?.toLowerCase();
  const isPdf = mt.includes('pdf') || ext === 'pdf';
  const isExcel = mt.includes('spreadsheet') || mt.includes('excel') || ext === 'xls' || ext === 'xlsx';
  const isWord = mt.includes('word') || mt.includes('document') || ext === 'doc' || ext === 'docx';
  const isHeic = mt.includes('heic') || mt.includes('heif') || ext === 'heic' || ext === 'heif';
  const label = isPdf ? 'PDF' : isExcel ? 'Excel' : isWord ? 'Word' : isHeic ? 'Photo (HEIC)' : 'File';
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-dark-text-muted bg-dark-bg/50 rounded-lg p-2">
      <svg className="w-10 h-12 shrink-0" viewBox="0 0 40 48" fill="currentColor" aria-hidden>
        {isPdf && (
          <path d="M8 4h12l12 12v28H8V4zm2 2v36h20V18h-10V6H10zm12 1.414L26.586 16H22V7.414z" />
        )}
        {!isPdf && (
          <path d="M8 4h12l12 12v28H8V4zm2 2v36h20V18h-10V6H10zm12 1.414L26.586 16H22V7.414z" />
        )}
      </svg>
      <span className="text-xs font-medium mt-1">{label}</span>
    </div>
  );
}

interface ResolutionUpdate {
  id: number;
  ticket_id: number;
  content: string;
  created_at: string;
}

interface TicketImage {
  id: number;
  ticket_id: number;
  position: number;
  created_at: string;
  mime_type?: string | null;
  original_filename?: string | null;
}

interface Ticket {
  id: number;
  creation_date: string;
  subject: string;
  customer_id: number | null;
  customer_name: string | null;
  customer_email: string | null;
  category: string | null;
  description: string | null;
  email: string | null;
  priority: number;
  status: string;
  created_at: string;
  updated_at: string;
  images?: TicketImage[];
  resolution_updates?: ResolutionUpdate[];
}

interface Customer {
  id: number;
  name: string;
  physical_address: string | null;
  email: string | null;
  phone: string | null;
  email_notifications: boolean;
  text_notifications: boolean;
}

const TicketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolutionInput, setResolutionInput] = useState('');
  const [addingResolution, setAddingResolution] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [finalResolution, setFinalResolution] = useState('');
  const [closing, setClosing] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [addingImage, setAddingImage] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);
  const [viewingImageId, setViewingImageId] = useState<number | null>(null);

  const MAX_IMAGES = 10;

  const fetchTicket = async () => {
    if (!id) return null;
    const res = await authFetch(`${TICKETS_API}/${id}`);
    if (!res.ok) return null;
    return res.json();
  };

  const fetchCustomer = async (customerId: number) => {
    const res = await authFetch(`${CUSTOMERS_API}/${customerId}`);
    if (!res.ok) return null;
    return res.json();
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) {
        setError('Invalid ticket id');
        setLoading(false);
        return;
      }
      const ticketId = parseInt(id, 10);
      if (isNaN(ticketId)) {
        setError('Invalid ticket id');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const t = await fetchTicket();
        if (cancelled) return;
        if (!t) {
          setError('Ticket not found');
          setLoading(false);
          return;
        }
        setTicket(t);
        if (t.customer_id) {
          const c = await fetchCustomer(t.customer_id);
          if (!cancelled) setCustomer(c || null);
        } else {
          setCustomer(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  const handleAddResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !resolutionInput.trim()) return;
    setAddingResolution(true);
    setError('');
    try {
      const res = await authFetch(`${TICKETS_API}/${ticket.id}/resolutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: resolutionInput.trim() }),
      });
      if (!res.ok) throw new Error('Failed to add resolution');
      const update = await res.json();
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              resolution_updates: [...(prev.resolution_updates || []), update],
            }
          : null
      );
      setResolutionInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add resolution');
    } finally {
      setAddingResolution(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!ticket) return;
    setClosing(true);
    setError('');
    try {
      const res = await authFetch(`${TICKETS_API}/${ticket.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ final_resolution: finalResolution.trim() }),
      });
      if (!res.ok) throw new Error('Failed to close ticket');
      const updated = await res.json();
      setTicket((prev) => (prev ? { ...prev, ...updated } : null));
      setShowCloseModal(false);
      setFinalResolution('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to close ticket');
    } finally {
      setClosing(false);
    }
  };

  const isClosed = ticket?.status === 'Closed';

  // Load image blobs and create object URLs for display (convert HEIC to JPEG in-browser so we can preview/open)
  const imageUrlsCreatedRef = useRef<string[]>([]);
  useEffect(() => {
    if (!ticket?.images?.length) {
      setImageUrls({});
      imageUrlsCreatedRef.current = [];
      return () => {};
    }
    let cancelled = false;
    ticket.images.forEach((img) => {
      authFetch(`${TICKETS_API}/${ticket.id}/images/${img.id}`)
        .then((res) => (res.ok ? res.blob() : null))
        .then(async (blob) => {
          if (cancelled || !blob) return;
          const mt = (blob.type || img.mime_type || '').toLowerCase();
          const isHeic = mt.includes('heic') || mt.includes('heif');
          let displayBlob = blob;
          if (isHeic) {
            try {
              const converted = await heic2any({ blob, toType: 'image/jpeg' });
              displayBlob = Array.isArray(converted) ? converted[0] : converted;
            } catch {
              // fallback: use original blob (will show as file icon)
            }
          }
          if (cancelled) return;
          const url = URL.createObjectURL(displayBlob);
          imageUrlsCreatedRef.current.push(url);
          setImageUrls((prev) => ({ ...prev, [img.id]: url }));
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
      imageUrlsCreatedRef.current.forEach(URL.revokeObjectURL);
      imageUrlsCreatedRef.current = [];
    };
  }, [ticket?.id, ticket?.images]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64 || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!ticket || !file) return;
    const count = (ticket.images?.length ?? 0);
    if (count >= MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} attachments per ticket`);
      return;
    }
    setAddingImage(true);
    setError('');
    try {
      const base64 = await fileToBase64(file);
      const res = await authFetch(`${TICKETS_API}/${ticket.id}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: base64,
          encoding: 'base64',
          mime_type: file.type || 'application/octet-stream',
          original_filename: file.name,
        }),
      });
      if (!res.ok) throw new Error('Failed to add attachment');
      const added = await res.json();
      setTicket((prev) =>
        prev
          ? { ...prev, images: [...(prev.images || []), added].sort((a, b) => a.position - b.position) }
          : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add attachment');
    } finally {
      setAddingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!ticket) return;
    setDeletingImageId(imageId);
    setError('');
    try {
      const res = await authFetch(`${TICKETS_API}/${ticket.id}/images/${imageId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete image');
      if (imageUrls[imageId]) {
        URL.revokeObjectURL(imageUrls[imageId]);
        setImageUrls((prev) => {
          const next = { ...prev };
          delete next[imageId];
          return next;
        });
      }
      setTicket((prev) =>
        prev ? { ...prev, images: (prev.images || []).filter((i) => i.id !== imageId) } : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image');
    } finally {
      setDeletingImageId(null);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <p className="text-dark-text-muted py-8">Loading...</p>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="page-container">
        <div className="p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">{error}</div>
        <BackArrow to="/tickets" label="Back to Tickets" className="mt-4" />
      </div>
    );
  }

  if (!ticket) return null;

  const handleViewAttachment = (imageId: number) => {
    const img = ticket?.images?.find((i) => i.id === imageId);
    if (img && isImageType(img.mime_type)) {
      setViewingImageId(imageId);
    } else {
      const url = imageUrls[imageId];
      if (url) window.open(url, '_blank');
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticket || !window.confirm('Delete this ticket?')) return;
    setError('');
    try {
      const res = await authFetch(`${TICKETS_API}/${ticket.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      navigate('/tickets');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const viewingImage = viewingImageId != null ? ticket.images?.find((i) => i.id === viewingImageId) : null;
  const viewingUrl = viewingImageId != null ? imageUrls[viewingImageId] : null;

  return (
    <div className="page-container">
      {/* In-app image viewer modal */}
      {viewingImageId != null && viewingImage && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4"
          onClick={() => setViewingImageId(null)}
          role="dialog"
          aria-modal="true"
          aria-label="View attachment"
        >
          <div className="flex flex-col items-center gap-3 max-h-full" onClick={(e) => e.stopPropagation()}>
            {viewingUrl ? (
              <img
                src={viewingUrl}
                alt={viewingImage.original_filename || 'Attachment'}
                className="max-h-[80vh] max-w-full object-contain rounded"
              />
            ) : (
              <span className="text-white">Loading…</span>
            )}
            <div className="flex gap-2 flex-wrap justify-center">
              {viewingUrl && (
                <a
                  href={viewingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-sm py-1.5 px-3"
                >
                  Open in new tab
                </a>
              )}
              <button type="button" onClick={() => setViewingImageId(null)} className="btn-primary text-sm py-1.5 px-3">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <BackArrow to="/tickets" label="Back to Tickets" />
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main: full-width description, attachments, resolution */}
        <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
          <div className="rounded-xl bg-dark-surface border border-dark-border p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-dark-text mb-2">Description</h2>
            <div className="text-dark-text whitespace-pre-wrap text-sm sm:text-base min-h-[120px]">
              {ticket.description || '—'}
            </div>
          </div>

          <div className="rounded-xl bg-dark-surface border border-dark-border p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-dark-text mb-3">Attachments</h2>
            {(ticket.images?.length ?? 0) === 0 ? (
              <p className="text-dark-text-muted text-sm py-2">No attachments.</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth" style={{ minHeight: 160 }}>
                {(ticket.images || []).map((img, idx) => {
                  const isImage = isImageType(img.mime_type);
                  const url = imageUrls[img.id];
                  return (
                    <div
                      key={img.id}
                      className="flex-shrink-0 w-[140px] snap-start rounded-lg border border-dark-border bg-dark-bg/30 overflow-hidden flex flex-col"
                    >
                      <button
                        type="button"
                        onClick={() => url && handleViewAttachment(img.id)}
                        disabled={!url}
                        className="flex-1 min-h-[100px] w-full flex items-center justify-center overflow-hidden p-1 text-left hover:bg-dark-surface-elevated/50 transition-colors"
                      >
                        {isImage ? (
                          url ? (
                            <img
                              src={url}
                              alt={img.original_filename || `Attachment ${idx + 1}`}
                              className="max-h-[120px] w-full object-contain"
                            />
                          ) : (
                            <span className="text-dark-text-muted text-sm">Loading…</span>
                          )
                        ) : (
                          <FileTypeIcon mimeType={img.mime_type} filename={img.original_filename} />
                        )}
                      </button>
                      <div className="p-1.5 border-t border-dark-border flex flex-col gap-0.5">
                        <span className="text-dark-text text-xs truncate" title={img.original_filename || undefined}>
                          {img.original_filename || `Attachment ${idx + 1}`}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => url && handleViewAttachment(img.id)}
                            disabled={!url}
                            className="btn-text-action text-xs py-0.5 px-1"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(img.id)}
                            disabled={deletingImageId === img.id}
                            className="text-red-400 hover:underline text-xs py-0.5 px-1"
                            aria-label="Delete attachment"
                          >
                            {deletingImageId === img.id ? '…' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {(ticket.images?.length ?? 0) < MAX_IMAGES && (
              <label className="mt-3 inline-flex items-center gap-2 text-primary hover:underline cursor-pointer text-sm">
                <input
                  type="file"
                  className="sr-only"
                  onChange={handleAddImage}
                  disabled={addingImage}
                />
                {addingImage ? 'Adding…' : '+ Add attachment'}
              </label>
            )}
          </div>

          <div className="rounded-xl bg-dark-surface border border-dark-border p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-dark-text mb-4">Resolution updates</h2>
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {(ticket.resolution_updates || []).length === 0 ? (
                <p className="text-dark-text-muted text-sm">No resolution updates yet.</p>
              ) : (
                (ticket.resolution_updates || []).map((u, i) => (
                  <div
                    key={u.id}
                    className={`rounded-lg p-3 sm:p-4 border ${
                      i % 2 === 0 ? 'bg-dark-bg/50 border-dark-border' : 'bg-dark-surface-elevated/50 border-dark-border'
                    }`}
                  >
                    <p className="text-dark-text text-sm whitespace-pre-wrap">{u.content}</p>
                    <p className="text-dark-text-muted text-xs mt-2">{formatDate(u.created_at)}</p>
                  </div>
                ))
              )}
            </div>
            {!isClosed && (
              <form onSubmit={handleAddResolution} className="mt-4">
                <label className="block text-sm font-medium text-dark-text-muted mb-2">Add resolution update</label>
                <textarea
                  value={resolutionInput}
                  onChange={(e) => setResolutionInput(e.target.value)}
                  className="input-field min-h-[8rem] w-full"
                  placeholder="Type an update..."
                  rows={5}
                />
                <button
                  type="submit"
                  disabled={addingResolution || !resolutionInput.trim()}
                  className="btn-primary mt-2"
                >
                  {addingResolution ? 'Adding...' : 'Add update'}
                </button>
              </form>
            )}
            {!isClosed && (
              <div className="mt-6 pt-4 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(true)}
                  className="btn-secondary text-red-400 border-red-700/50 hover:bg-red-900/20 text-sm"
                >
                  Close ticket
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Top right: Customer + Ticket info */}
        <div className="lg:col-span-1 space-y-4 order-1 lg:order-2">
          <div className="rounded-xl bg-dark-surface border border-dark-border p-4 sm:p-6 lg:sticky lg:top-4">
            <h2 className="text-lg font-semibold text-dark-text mb-4">Customer</h2>
              {customer ? (
                <dl className="space-y-2 text-sm text-dark-text">
                  <div>
                    <dt className="text-dark-text-muted">Name</dt>
                    <dd className="font-medium">{customer.name}</dd>
                  </div>
                  {customer.physical_address && (
                    <div>
                      <dt className="text-dark-text-muted">Address</dt>
                      <dd>{customer.physical_address}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-dark-text-muted">Email</dt>
                    <dd>{customer.email ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-dark-text-muted">Phone</dt>
                    <dd>{customer.phone ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-dark-text-muted">Email / Text notifications</dt>
                    <dd>{customer.email_notifications ? 'Email' : '—'} {customer.text_notifications ? 'Text' : ''}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-dark-text-muted">
                  {ticket.customer_name ? (
                    <>
                      {ticket.customer_name}
                      {ticket.customer_email && ` (${ticket.customer_email})`}
                    </>
                  ) : (
                    <>N/A — {ticket.email || 'No contact email'}</>
                  )}
                </p>
              )}
            </div>

            {/* Ticket details card with Edit/Delete */}
            <div className="rounded-xl bg-dark-surface border border-dark-border p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-dark-text mb-4">Ticket</h2>
              <dl className="space-y-2 text-sm text-dark-text">
                <div><dt className="text-dark-text-muted text-xs">ID</dt><dd className="font-mono">{ticket.id}</dd></div>
                <div><dt className="text-dark-text-muted text-xs">Status</dt><dd className="font-medium">{ticket.status}</dd></div>
                <div><dt className="text-dark-text-muted text-xs">Priority</dt><dd>{ticket.priority}</dd></div>
                <div><dt className="text-dark-text-muted text-xs">Created</dt><dd className="whitespace-nowrap">{formatDate(ticket.creation_date)}</dd></div>
                <div><dt className="text-dark-text-muted text-xs">Category</dt><dd>{ticket.category ?? '—'}</dd></div>
                <div><dt className="text-dark-text-muted text-xs">Subject</dt><dd className="font-medium">{ticket.subject}</dd></div>
              </dl>
              <div className="mt-4 pt-4 border-t border-dark-border flex flex-wrap gap-2">
                <button type="button" onClick={() => navigate(`/tickets/${ticket.id}/edit`)} className="btn-secondary text-sm py-1.5 px-3 min-h-[36px]">Edit</button>
                <button type="button" onClick={handleDeleteTicket} className="btn-secondary text-sm text-red-400 py-1.5 px-3 min-h-[36px]">Delete</button>
              </div>
            </div>
          </div>
        </div>

        {/* Close ticket modal */}
      {showCloseModal && (
        <div className="modal-overlay safe-area-pb" role="dialog" aria-modal="true" aria-labelledby="close-ticket-title">
          <div className="modal-content">
            <h3 id="close-ticket-title" className="text-lg sm:text-xl font-semibold text-dark-text mb-4">Close ticket</h3>
            <p className="text-dark-text-muted text-sm mb-4">
              Add a final resolution note. The ticket status will be set to Closed.
            </p>
            <textarea
              value={finalResolution}
              onChange={(e) => setFinalResolution(e.target.value)}
              className="input-field min-h-[8rem] w-full"
              placeholder="Final resolution..."
              rows={6}
            />
            <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6">
              <button
                type="button"
                onClick={() => { setShowCloseModal(false); setFinalResolution(''); }}
                disabled={closing}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCloseTicket}
                disabled={closing}
                className="btn-primary flex-1"
              >
                {closing ? 'Closing...' : 'Confirm closure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetailPage;
