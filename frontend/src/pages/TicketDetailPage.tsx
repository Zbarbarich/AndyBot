import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const TICKETS_API = 'http://localhost:3000/api/app/tickets';
const CUSTOMERS_API = 'http://localhost:3000/api/app/customers';

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

  const getToken = () => localStorage.getItem('token');

  const MAX_IMAGES = 5;

  const fetchTicket = async () => {
    if (!id) return null;
    const res = await fetch(`${TICKETS_API}/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) return null;
    return res.json();
  };

  const fetchCustomer = async (customerId: number) => {
    const res = await fetch(`${CUSTOMERS_API}/${customerId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
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
      const res = await fetch(`${TICKETS_API}/${ticket.id}/resolutions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
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
      const res = await fetch(`${TICKETS_API}/${ticket.id}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
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

  // Load image blobs and create object URLs for display
  const imageUrlsCreatedRef = useRef<string[]>([]);
  useEffect(() => {
    if (!ticket?.images?.length) {
      setImageUrls({});
      imageUrlsCreatedRef.current = [];
      return () => {};
    }
    const token = getToken();
    let cancelled = false;
    ticket.images.forEach((img) => {
      fetch(`${TICKETS_API}/${ticket.id}/images/${img.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (cancelled || !blob) return;
          const url = URL.createObjectURL(blob);
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
    if (!ticket || !file || !file.type.startsWith('image/')) return;
    const count = (ticket.images?.length ?? 0);
    if (count >= MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images per ticket`);
      return;
    }
    setAddingImage(true);
    setError('');
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch(`${TICKETS_API}/${ticket.id}/images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ data: base64, encoding: 'base64' }),
      });
      if (!res.ok) throw new Error('Failed to add image');
      const added = await res.json();
      setTicket((prev) =>
        prev
          ? { ...prev, images: [...(prev.images || []), added].sort((a, b) => a.position - b.position) }
          : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add image');
    } finally {
      setAddingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!ticket) return;
    setDeletingImageId(imageId);
    setError('');
    try {
      const res = await fetch(`${TICKETS_API}/${ticket.id}/images/${imageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
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
          <button type="button" onClick={() => navigate('/tickets')} className="btn-secondary mt-4 w-full sm:w-auto">Back to Tickets</button>
        </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="page-container">
        <button type="button" onClick={() => navigate('/tickets')} className="btn-secondary mb-6 w-full sm:w-auto">
          Back to Tickets
        </button>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm sm:text-base">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Customer details */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
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

            {/* Ticket details card */}
            <div className="rounded-xl bg-dark-surface border border-dark-border p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-dark-text mb-4">Ticket</h2>
              <dl className="compact-grid text-sm text-dark-text">
                <div className="short-field">
                  <dt className="text-dark-text-muted text-xs">ID</dt>
                  <dd className="font-mono">{ticket.id}</dd>
                </div>
                <div className="short-field">
                  <dt className="text-dark-text-muted text-xs">Status</dt>
                  <dd className="font-medium">{ticket.status}</dd>
                </div>
                <div className="short-field">
                  <dt className="text-dark-text-muted text-xs">Priority</dt>
                  <dd>{ticket.priority}</dd>
                </div>
                <div className="short-field">
                  <dt className="text-dark-text-muted text-xs">Created</dt>
                  <dd className="whitespace-nowrap">{new Date(ticket.creation_date).toLocaleString()}</dd>
                </div>
                <div className="short-field">
                  <dt className="text-dark-text-muted text-xs">Category</dt>
                  <dd>{ticket.category ?? '—'}</dd>
                </div>
                <div className="col-span-full sm:col-span-2 md:col-span-3 lg:col-span-6">
                  <dt className="text-dark-text-muted text-xs">Subject</dt>
                  <dd className="font-medium">{ticket.subject}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Description + Resolution updates */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="rounded-xl bg-dark-surface border border-dark-border p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-dark-text mb-2">Description</h2>
              <p className="text-dark-text whitespace-pre-wrap text-sm sm:text-base">{ticket.description || '—'}</p>
            </div>

            {/* Ticket images (blobs from PostgreSQL) */}
            <div className="rounded-xl bg-dark-surface border border-dark-border p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-dark-text mb-4">Photos ({ticket.images?.length ?? 0}/{MAX_IMAGES})</h2>
              <div className="flex flex-wrap gap-4">
                {(ticket.images || []).map((img) => (
                  <div key={img.id} className="relative group">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg border border-dark-border overflow-hidden bg-dark-bg flex items-center justify-center">
                      {imageUrls[img.id] ? (
                        <img
                          src={imageUrls[img.id]}
                          alt={`Ticket image ${img.position}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-dark-text-muted text-xs">Loading…</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      disabled={deletingImageId === img.id}
                      className="absolute top-1 right-1 rounded bg-red-600/90 text-white text-xs px-2 py-1 min-h-0 hover:bg-red-600 disabled:opacity-50"
                      aria-label="Delete photo"
                    >
                      {deletingImageId === img.id ? '…' : 'Delete'}
                    </button>
                  </div>
                ))}
                {(ticket.images?.length ?? 0) < MAX_IMAGES && (
                  <label className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg border border-dashed border-dark-border flex items-center justify-center cursor-pointer hover:bg-dark-surface-elevated/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleAddImage}
                      disabled={addingImage}
                    />
                    <span className="text-dark-text-muted text-sm text-center px-2">
                      {addingImage ? 'Adding…' : '+ Add photo'}
                    </span>
                  </label>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-dark-surface border border-dark-border p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-dark-text mb-4">Resolution updates</h2>
              <div className="space-y-3 max-h-[320px] sm:max-h-[400px] overflow-y-auto">
                {(ticket.resolution_updates || []).length === 0 ? (
                  <p className="text-dark-text-muted text-sm">No resolution updates yet.</p>
                ) : (
                  (ticket.resolution_updates || []).map((u, i) => (
                    <div
                      key={u.id}
                      className={`rounded-lg p-3 sm:p-4 border ${
                        i % 2 === 0
                          ? 'bg-dark-bg/50 border-dark-border ml-0 mr-2 sm:mr-4'
                          : 'bg-dark-surface-elevated/50 border-dark-border ml-2 sm:ml-4 mr-0'
                      }`}
                    >
                      <p className="text-dark-text text-sm whitespace-pre-wrap">{u.content}</p>
                      <p className="text-dark-text-muted text-xs mt-2">
                        {new Date(u.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {!isClosed && (
                <form onSubmit={handleAddResolution} className="mt-4">
                  <label className="block text-sm font-medium text-dark-text-muted mb-2">
                    Add resolution update
                  </label>
                  <textarea
                    value={resolutionInput}
                    onChange={(e) => setResolutionInput(e.target.value)}
                    className="input-field min-h-[80px]"
                    placeholder="Type an update..."
                    rows={3}
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
                    className="btn-secondary text-red-400 border-red-700/50 hover:bg-red-900/20"
                  >
                    Close ticket
                  </button>
                </div>
              )}
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
              className="input-field min-h-[100px] w-full"
              placeholder="Final resolution..."
              rows={4}
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
