import { Dispatch, SetStateAction } from 'react';

export const TICKET_STATUSES = ['Open', 'Pending Closure Review', 'Closed'] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface TicketFormState {
  subject: string;
  customer_id: string | number | null;
  category: string;
  description: string;
  email: string;
  priority: number;
  status: TicketStatus;
}

interface Customer {
  id: number;
  name: string;
  email: string | null;
}

interface TicketFormFieldsProps {
  form: TicketFormState;
  setForm: Dispatch<SetStateAction<TicketFormState>>;
  customers: Customer[];
  onCustomerChange: (customerId: string) => void;
}

export const TicketFormFields = ({ form, setForm, customers, onCustomerChange }: TicketFormFieldsProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-text-muted mb-1">Subject *</label>
      <input
        type="text"
        value={form.subject}
        onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
        className="input-field"
        required
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-text-muted mb-1">Customer (N/A if none)</label>
      <select
        value={form.customer_id === null ? '' : String(form.customer_id)}
        onChange={(e) => onCustomerChange(e.target.value)}
        className="input-field"
      >
        <option value="">— N/A —</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} {c.email ? `(${c.email})` : ''}
          </option>
        ))}
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium text-text-muted mb-1">Email (contact for this ticket)</label>
      <input
        type="email"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        className="input-field"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-text-muted mb-1">Category</label>
      <input
        type="text"
        value={form.category}
        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        className="input-field"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-text-muted mb-1">Priority (1–5)</label>
      <input
        type="number"
        min={1}
        max={5}
        value={form.priority}
        onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) || 3 }))}
        className="input-field w-full"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-text-muted mb-1">Status</label>
      <select
        value={form.status}
        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TicketStatus }))}
        className="input-field"
      >
        {TICKET_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-text-muted mb-1">Description</label>
      <textarea
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        className="input-field min-h-[8rem]"
        rows={6}
      />
    </div>
  </div>
);

export default TicketFormFields;
