import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import FormSection from '../components/FormSection';
import StickyFormActions from '../components/StickyFormActions';
import AttachmentGallery from '../components/AttachmentGallery';
import DocumentPageShell from '../components/document/DocumentPageShell';
import DocumentHeader from '../components/document/DocumentHeader';
import DocumentToolbar from '../components/document/DocumentToolbar';
import DocumentStatusBadge from '../components/document/DocumentStatusBadge';
import { apiBase } from '../api/config';
import { formatDate } from '../utils/formatDate';

const TICKETS_API = `${apiBase}/api/app/tickets`;
const CUSTOMERS_API = `${apiBase}/api/app/customers`;

const MAX_IMAGES = 10;

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

  const isClosed = ticket?.status === 'Closed';

  if (loading) {
    return (
      <div className="page-container">
        <p className="text-text-muted py-8">Loading...</p>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <DocumentPageShell>
        <ErrorBanner message={error} />
        <button type="button" onClick={() => navigate('/tickets')} className="btn-doc-action mt-4">
          Back to Tickets
        </button>
      </DocumentPageShell>
    );
  }

  if (!ticket) return null;

  const statusVariant = isClosed ? 'muted' : 'warning';

  return (
    <DocumentPageShell>
      <DocumentHeader
        backTo="/tickets"
        backLabel="Back to Tickets"
        title={`Ticket #${ticket.id}`}
        subtitle={ticket.subject}
        status={
          <DocumentStatusBadge
            status={ticket.status}
            variant={statusVariant}
          />
        }
        actions={
          <StickyFormActions>
            <button
              type="button"
              onClick={() => navigate(`/tickets/${ticket.id}/edit`)}
              className="btn-primary"
            >
              Edit
            </button>
          </StickyFormActions>
        }
      />

      <DocumentToolbar>
        {!isClosed && (
          <button type="button" onClick={() => setShowCloseModal(true)} className="btn-doc-primary text-sm">
            Close ticket
          </button>
        )}
        <button type="button" onClick={handleDeleteTicket} className="btn-doc-danger text-sm">
          Delete
        </button>
      </DocumentToolbar>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <FormSection title="Description" variant="glass">
            <div className="text-text whitespace-pre-wrap text-sm sm:text-base min-h-[4rem]">
              {ticket.description || '—'}
            </div>
          </FormSection>

          <FormSection title="Attachments" variant="glass">
            <AttachmentGallery
              ticketId={ticket.id}
              images={ticket.images || []}
              apiBase={apiBase}
              maxImages={MAX_IMAGES}
              onImagesChange={(images) => setTicket((prev) => (prev ? { ...prev, images } : null))}
              onError={setError}
            />
          </FormSection>

          <FormSection title="Resolution updates" variant="glass">
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {(ticket.resolution_updates || []).length === 0 ? (
                <p className="text-text-muted text-sm">No resolution updates yet.</p>
              ) : (
                (ticket.resolution_updates || []).map((u, i) => (
                  <div
                    key={u.id}
                    className={`rounded-lg p-3 sm:p-4 border ${
                      i % 2 === 0 ? 'bg-bg/50 border-border' : 'bg-surface-elevated/50 border-border'
                    }`}
                  >
                    <p className="text-text text-sm whitespace-pre-wrap">{u.content}</p>
                    <p className="text-text-muted text-xs mt-2">{formatDate(u.created_at)}</p>
                  </div>
                ))
              )}
            </div>
            {!isClosed && (
              <form onSubmit={handleAddResolution} className="mt-4">
                <label className="block text-sm font-medium text-text-muted mb-2">Add resolution update</label>
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
                  className="btn-primary mt-3"
                >
                  {addingResolution ? 'Adding...' : 'Add update'}
                </button>
              </form>
            )}
          </FormSection>
        </div>

        <div className="space-y-4">
          <FormSection title="Ticket details" variant="glass" className="h-fit">
            <dl className="space-y-3 text-sm">
              <div className="kv-row border-0 py-0">
                <dt className="text-text-muted">Priority</dt>
                <dd>P{ticket.priority}</dd>
              </div>
              <div className="kv-row border-0 py-0">
                <dt className="text-text-muted">Created</dt>
                <dd>{formatDate(ticket.creation_date)}</dd>
              </div>
              <div className="kv-row border-0 py-0">
                <dt className="text-text-muted">Category</dt>
                <dd>{ticket.category ?? '—'}</dd>
              </div>
              <div className="kv-row border-0 py-0">
                <dt className="text-text-muted">Contact email</dt>
                <dd className="break-all">{ticket.email ?? '—'}</dd>
              </div>
            </dl>
          </FormSection>

          <FormSection title="Customer" variant="glass" className="h-fit lg:sticky lg:top-4">
            {customer ? (
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-text-muted text-xs">Name</dt>
                  <dd className="font-medium text-text">{customer.name}</dd>
                </div>
                {customer.physical_address && (
                  <div>
                    <dt className="text-text-muted text-xs">Address</dt>
                    <dd className="text-text">{customer.physical_address}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-text-muted text-xs">Email</dt>
                  <dd className="text-text break-all">{customer.email ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-text-muted text-xs">Phone</dt>
                  <dd className="text-text">{customer.phone ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-text-muted text-xs">Notifications</dt>
                  <dd className="text-text">
                    {[customer.email_notifications && 'Email', customer.text_notifications && 'Text'].filter(Boolean).join(' · ') || '—'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-text-muted text-sm">
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
          </FormSection>
        </div>
      </div>

      {showCloseModal && (
        <div className="modal-overlay safe-area-pb" role="dialog" aria-modal="true" aria-labelledby="close-ticket-title">
          <div className="modal-content">
            <h3 id="close-ticket-title" className="text-lg sm:text-xl font-semibold text-text mb-4">Close ticket</h3>
            <p className="text-text-muted text-sm mb-4">
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
    </DocumentPageShell>
  );
};

export default TicketDetailPage;
