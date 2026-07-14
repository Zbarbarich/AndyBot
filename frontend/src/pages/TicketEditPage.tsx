import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authFetch } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import FormSection from '../components/FormSection';
import StickyFormActions from '../components/StickyFormActions';
import TicketFormFields, { TICKET_STATUSES, TicketFormState } from '../components/TicketFormFields';
import DocumentPageShell from '../components/document/DocumentPageShell';
import DocumentHeader from '../components/document/DocumentHeader';
import { apiBase } from '../api/config';

const API_BASE = `${apiBase}/api/app/tickets`;
const CUSTOMERS_API = `${apiBase}/api/app/customers`;

interface Customer {
  id: number;
  name: string;
  email: string | null;
}

const TicketEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<TicketFormState>({
    subject: '',
    customer_id: '',
    category: '',
    description: '',
    email: '',
    priority: 3,
    status: 'Open',
  });

  useEffect(() => {
    authFetch(CUSTOMERS_API)
      .then((res) => res.ok ? res.json() : [])
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, []);

  useEffect(() => {
    if (!id) return;
    const ticketId = parseInt(id, 10);
    if (isNaN(ticketId)) {
      setError('Invalid ticket id');
      setLoading(false);
      return;
    }
    authFetch(`${API_BASE}/${ticketId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Ticket not found');
        return res.json();
      })
      .then((t: { subject: string; customer_id: number | null; category: string | null; description: string | null; email: string | null; priority: number; status: string }) => {
        setForm({
          subject: t.subject,
          customer_id: t.customer_id ?? '',
          category: t.category ?? '',
          description: t.description ?? '',
          email: t.email ?? '',
          priority: t.priority,
          status: (TICKET_STATUSES.includes(t.status as (typeof TICKET_STATUSES)[number]) ? t.status : 'Open') as TicketFormState['status'],
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  const onCustomerChange = (customerId: string) => {
    const numId = customerId === '' ? '' : Number(customerId);
    setForm((f) => ({
      ...f,
      customer_id: numId,
      email: numId ? (customers.find((c) => c.id === Number(numId))?.email ?? f.email) : f.email,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError('');
    try {
      const customerId = form.customer_id === '' || form.customer_id == null ? null : Number(form.customer_id);
      const res = await authFetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: form.subject.trim(),
          customer_id: customerId,
          category: form.category || null,
          description: form.description || null,
          email: form.email || null,
          priority: Math.min(5, Math.max(1, form.priority)),
          status: form.status,
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      navigate(`/tickets/${id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <p className="text-text-muted py-8">Loading...</p>
      </div>
    );
  }

  return (
    <DocumentPageShell>
      <DocumentHeader
        backTo={id ? `/tickets/${id}` : '/tickets'}
        backLabel="Back to Ticket"
        title="Edit Ticket"
        actions={
          <StickyFormActions>
            <button type="submit" form="ticket-edit-form" className="btn-primary">Save</button>
            <button type="button" onClick={() => navigate(id ? `/tickets/${id}` : '/tickets')} className="btn-secondary">Cancel</button>
          </StickyFormActions>
        }
      />

      <ErrorBanner message={error} />

      <form id="ticket-edit-form" onSubmit={handleSubmit}>
        <FormSection title="Ticket details" variant="glass">
          <TicketFormFields
            form={form}
            setForm={setForm}
            customers={customers}
            onCustomerChange={onCustomerChange}
          />
        </FormSection>
      </form>
    </DocumentPageShell>
  );
};

export default TicketEditPage;
