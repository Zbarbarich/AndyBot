import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../api/client';
import { ErrorBanner } from '../components/ErrorBanner';
import FormSection from '../components/FormSection';
import StickyFormActions from '../components/StickyFormActions';
import TicketFormFields, { TicketFormState } from '../components/TicketFormFields';
import DocumentPageShell from '../components/document/DocumentPageShell';
import DocumentHeader from '../components/document/DocumentHeader';
import { useToast } from '../context/ToastContext';
import { apiBase } from '../api/config';

const API_BASE = `${apiBase}/api/app/tickets`;
const CUSTOMERS_API = `${apiBase}/api/app/customers`;

interface Customer {
  id: number;
  name: string;
  email: string | null;
}

const TicketFormPage = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
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

  const onCustomerChange = (customerId: string) => {
    const id = customerId === '' ? '' : Number(customerId);
    setForm((f) => ({
      ...f,
      customer_id: id,
      email: id ? (customers.find((c) => c.id === Number(id))?.email ?? f.email) : f.email,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const customerId = form.customer_id === '' || form.customer_id == null ? null : Number(form.customer_id);
      const res = await authFetch(API_BASE, {
        method: 'POST',
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
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      success('Ticket created');
      navigate(`/tickets/${data.id}`, { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      setError(msg);
      toastError(msg);
    }
  };

  return (
    <DocumentPageShell>
      <DocumentHeader
        backTo="/tickets"
        backLabel="Back to Tickets"
        title="New Ticket"
        actions={
          <StickyFormActions>
            <button type="submit" form="ticket-create-form" className="btn-primary">Create</button>
            <button type="button" onClick={() => navigate('/tickets')} className="btn-secondary">Cancel</button>
          </StickyFormActions>
        }
      />

      <ErrorBanner message={error} />

      <form id="ticket-create-form" onSubmit={handleSubmit}>
        <FormSection title="Ticket details" variant="glass" description="Add attachments after saving on the ticket detail page.">
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

export default TicketFormPage;
