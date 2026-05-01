import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BackArrow } from '../components/BackArrow';
import { ErrorBanner } from '../components/ErrorBanner';
import { TicketSelector } from '../components/TicketSelector';
import { authFetch } from '../api/client';
import { apiBase } from '../api/config';
import { formatDate } from '../utils/formatDate';

const ORDERS_API = `${apiBase}/api/app/orders`;
const QUOTES_API = `${apiBase}/api/app/quotes`;
const CUSTOMERS_API = `${apiBase}/api/app/customers`;
const ITEMS_API = `${apiBase}/api/app/items`;

interface Customer {
  id: number;
  name: string;
}

interface Item {
  id: number;
  sku: string;
  name: string;
  unit_price: number;
  taxable: boolean;
  stock?: number;
  our_cost?: number;
}

type BillingStatus = 'pending' | 'billable' | 'invoiced';
const UNIT_OPTIONS = ['EA', 'DZ', 'ST', 'HR'] as const;

interface InvoicedOnRow {
  sub_order_number: string;
  invoice_number: string;
  quantity: number;
}

interface OnPurchaseOrderRow {
  purchase_order_id: number;
  po_number: string;
  purchase_order_status: string;
}

interface LineRow {
  id?: number;
  item_id: number | null;
  item_sku?: string;
  item_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  unit_of_measure?: string;
  sort_order: number;
  billing_status: BillingStatus;
  quantity_billed?: number;
  invoiced_on?: InvoicedOnRow[];
  /** Non-cancelled POs that include this line (order UI only). */
  on_purchase_orders?: OnPurchaseOrderRow[];
  include_in_po?: boolean;
  po_unit_cost?: number;
}

interface OrderDetail {
  id: number;
  document_number: string;
  type: string;
  customer_id: number;
  customer_name?: string;
  ticket_id: number | null;
  status: string;
  order_date: string | null;
  notes: string | null;
  customer_po_number?: string | null;
  original_quote_id?: number | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  shipping_amount: number;
  total: number;
  lines: Array<{
    id: number;
    item_id: number | null;
    description: string | null;
    quantity: number;
    unit_price: number;
    unit_of_measure?: string | null;
    item_unit_of_measure?: string | null;
    sort_order: number;
    billing_status: string;
    quantity_billed?: number;
    invoiced_on?: InvoicedOnRow[];
    on_purchase_orders?: OnPurchaseOrderRow[];
    item_sku?: string;
    item_name?: string;
  }>;
}

const emptyLine = (): LineRow => ({
  item_id: null,
  description: '',
  quantity: 1,
  unit_price: 0,
  unit_of_measure: 'EA',
  sort_order: 0,
  billing_status: 'pending',
  include_in_po: false,
  po_unit_cost: undefined,
});

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [creatingPO, setCreatingPO] = useState(false);
  const [poModalOpen, setPoModalOpen] = useState(false);
  /** Line ids selected for Create PO (when modal is open). */
  const [poSelectedLineIds, setPoSelectedLineIds] = useState<Set<number>>(new Set());
  const [deposits, setDeposits] = useState<Array<{ id: number; amount: number; payment_method: string | null; paid_at: string; reference: string | null; applied_to_invoice_id: number | null; applied_to_invoice_number?: string | null }>>([]);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositForm, setDepositForm] = useState({ amount: '', payment_method: 'check' as 'cash' | 'check', paid_at: new Date().toISOString().slice(0, 10), reference: '' });
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [orderInvoices, setOrderInvoices] = useState<Array<{ id: number; invoice_number: string; sub_order_number: string }>>([]);
  const [selectedSubOrderView, setSelectedSubOrderView] = useState<'current' | number>('current');
  const [subOrderInvoice, setSubOrderInvoice] = useState<{
    invoice_number: string;
    sub_order_number: string;
    lines: Array<{ description: string | null; quantity: number; unit_price: number; unit_of_measure?: string | null }>;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    shipping_amount: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    docType: 'order' as 'quote' | 'order' | 'return',
    customer_id: '',
    ticket_id: '',
    status: 'open',
    valid_until: '',
    order_date: '',
    notes: '',
    customer_po_number: '',
    tax_rate: '0.08',
    shipping_amount: '0',
  });
  const [createPurchaseOrder, setCreatePurchaseOrder] = useState(false);
  const [lines, setLines] = useState<LineRow[]>([]);
  /** Per-line quantity as string for input (allows empty during edit); synced on blur. */
  const [quantityDisplay, setQuantityDisplay] = useState<string[]>([]);
  /** Per-line unit price as string (allows clearing while typing); synced on blur. */
  const [unitPriceDisplay, setUnitPriceDisplay] = useState<string[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const fetchCustomers = useCallback(async () => {
    const res = await authFetch(CUSTOMERS_API);
    if (!res.ok) return;
    const data = await res.json();
    setCustomers(data);
  }, []);

  const fetchItems = useCallback(async () => {
    const res = await authFetch(ITEMS_API);
    if (!res.ok) return;
    const data = await res.json();
    setItems(data);
  }, []);

  const fetchOrder = useCallback(async (orderId: number) => {
    const res = await authFetch(`${ORDERS_API}/${orderId}`);
    if (!res.ok) return null;
    return res.json();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      await fetchCustomers();
      await fetchItems();
      if (isNew) {
        setIsReadOnly(false);
        setForm({
          docType: 'order',
          customer_id: '',
          ticket_id: '',
          status: 'open',
          valid_until: '',
          order_date: new Date().toISOString().slice(0, 10),
          notes: '',
          customer_po_number: '',
          tax_rate: '0.08',
          shipping_amount: '0',
        });
        setCreatePurchaseOrder(false);
        setLines([emptyLine()]);
        setQuantityDisplay(['1']);
        setUnitPriceDisplay(['']);
        setOrder(null);
        setLoading(false);
        return;
      }
      const orderId = parseInt(id!, 10);
      if (isNaN(orderId)) {
        setError('Invalid order id');
        setLoading(false);
        return;
      }
      const data = await fetchOrder(orderId);
      if (cancelled) return;
      if (!data) {
        setError('Order not found');
        setLoading(false);
        return;
      }
      setOrder(data);
      setForm({
        docType: (data.type === 'quote' || data.type === 'return' ? data.type : 'order') as 'quote' | 'order' | 'return',
        customer_id: String(data.customer_id),
        ticket_id: data.ticket_id != null ? String(data.ticket_id) : '',
        status: data.status || 'open',
        valid_until: data.valid_until ?? '',
        order_date: data.order_date ?? new Date().toISOString().slice(0, 10),
        notes: data.notes ?? '',
        customer_po_number: data.customer_po_number ?? '',
        tax_rate: String(Number(data.tax_rate)),
        shipping_amount: String(Number(data.shipping_amount)),
      });
      const newLines: LineRow[] =
        data.lines && data.lines.length > 0
          ? data.lines.map((l: LineRow & { item_sku?: string; item_name?: string; unit_of_measure?: string | null; item_unit_of_measure?: string | null; quantity_billed?: number; invoiced_on?: InvoicedOnRow[]; on_purchase_orders?: OnPurchaseOrderRow[] }, i: number) => ({
              id: l.id,
              item_id: l.item_id ?? null,
              item_sku: l.item_sku,
              item_name: l.item_name,
              description: l.description ?? '',
              quantity: Number(l.quantity),
              unit_price: Number(l.unit_price),
              unit_of_measure: l.unit_of_measure ?? l.item_unit_of_measure ?? 'EA',
              sort_order: l.sort_order ?? i,
              billing_status: (l.billing_status || 'pending') as BillingStatus,
              quantity_billed: l.quantity_billed != null ? Number(l.quantity_billed) : undefined,
              invoiced_on: l.invoiced_on ?? undefined,
              on_purchase_orders: l.on_purchase_orders ?? undefined,
              include_in_po: false,
              po_unit_cost: undefined,
            }))
          : [emptyLine()];
      setLines(newLines);
      setQuantityDisplay(newLines.map((l) => String(l.quantity)));
      setUnitPriceDisplay(newLines.map((l) => (Number.isFinite(l.unit_price) ? String(l.unit_price) : '')));
      setSelectedSubOrderView('current');
      setSubOrderInvoice(null);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, isNew, fetchOrder, fetchCustomers, fetchItems]);

  const fetchDeposits = useCallback(async (orderId: number) => {
    const res = await authFetch(`${ORDERS_API}/${orderId}/deposits`);
    if (!res.ok) return;
    const data = await res.json();
    setDeposits(data);
  }, []);

  useEffect(() => {
    if (!order?.id || order.type !== 'order') return;
    fetchDeposits(order.id);
  }, [order?.id, order?.type, fetchDeposits]);

  const fetchOrderInvoices = useCallback(async (orderId: number) => {
    const res = await authFetch(`${ORDERS_API}/${orderId}/invoices`);
    if (!res.ok) return;
    const data = await res.json();
    setOrderInvoices(data);
  }, []);

  useEffect(() => {
    if (!order?.id || order.type !== 'order') return;
    fetchOrderInvoices(order.id);
  }, [order?.id, order?.type, fetchOrderInvoices]);

  useEffect(() => {
    if (selectedSubOrderView === 'current' || typeof selectedSubOrderView !== 'number') {
      setSubOrderInvoice(null);
      return;
    }
    authFetch(`${apiBase}/api/app/invoices/${selectedSubOrderView}`)
      .then((res) => res.ok ? res.json() : null)
      .then((inv: {
        invoice_number: string;
        lines: Array<{ description: string | null; quantity: number; unit_price: number; unit_of_measure?: string | null }>;
        subtotal?: number;
        tax_rate?: number;
        tax_amount?: number;
        shipping_amount?: number;
        total?: number;
      } | null) => {
        if (!inv) return;
        const sub = orderInvoices.find((i) => i.id === selectedSubOrderView);
        setSubOrderInvoice({
          invoice_number: inv.invoice_number,
          sub_order_number: sub?.sub_order_number ?? '',
          lines: inv.lines ?? [],
          subtotal: Number(inv.subtotal ?? 0),
          tax_rate: Number(inv.tax_rate ?? 0),
          tax_amount: Number(inv.tax_amount ?? 0),
          shipping_amount: Number(inv.shipping_amount ?? 0),
          total: Number(inv.total ?? 0),
        });
      })
      .catch(() => setSubOrderInvoice(null));
  }, [selectedSubOrderView, orderInvoices]);

  const recalcTotals = useCallback(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
    const taxRate = parseFloat(form.tax_rate) || 0;
    const shipping = parseFloat(form.shipping_amount) || 0;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount + shipping;
    return { subtotal, tax_amount: taxAmount, total };
  }, [lines, form.tax_rate, form.shipping_amount]);

  const performSubmit = async () => {
    setError('');
    if (!isNew && order && order.type === 'order') {
      for (const l of lines) {
        const billed = Number(l.quantity_billed ?? 0);
        if (l.id != null && billed > 0 && Number(l.quantity) < billed) {
          setError(`A line has quantity below what is already invoiced (${billed}). Increase quantity or adjust billing first.`);
          return;
        }
        if (l.id != null && billed > 0) {
          const orig = order.lines.find((o) => o.id === l.id);
          const origQty = orig != null ? Number(orig.quantity) : l.quantity;
          if (Number(l.quantity) > origQty) {
            setError(
              'Cannot increase quantity on a line that has been invoiced. Add a new line for additional goods.',
            );
            return;
          }
        }
      }
    }
    setSaving(true);
    try {
      const body = {
        customer_id: parseInt(form.customer_id, 10),
        ticket_id: form.ticket_id ? parseInt(form.ticket_id, 10) : null,
        status: form.status,
        order_date: form.order_date || null,
        notes: form.notes || null,
        customer_po_number: form.customer_po_number || null,
        tax_rate: parseFloat(form.tax_rate) || 0,
        shipping_amount: parseFloat(form.shipping_amount) || 0,
        lines: lines.map((l, i) => ({
          ...(order?.type === 'order' && l.id != null ? { id: l.id } : {}),
          item_id: l.item_id || null,
          description: l.description || null,
          quantity: l.quantity,
          unit_price: l.unit_price,
          unit_of_measure: l.unit_of_measure || 'EA',
          sort_order: i,
          include_in_po: createPurchaseOrder ? l.include_in_po : undefined,
          po_unit_cost: createPurchaseOrder && l.include_in_po ? (l.po_unit_cost ?? 0) : undefined,
        })),
      };
      if (isNew) {
        if (form.docType === 'quote') {
          const quoteBody = { ...body, valid_until: form.valid_until || null };
          const res = await authFetch(QUOTES_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quoteBody),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Failed to create quote');
          navigate(`/orders/${data.id}`);
        } else {
          const res = await authFetch(ORDERS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...body,
              type: form.docType,
              create_purchase_order: createPurchaseOrder,
              lines: lines.map((l, i) => ({
                item_id: l.item_id || null,
                description: l.description || null,
                quantity: l.quantity,
                unit_price: l.unit_price,
                unit_of_measure: l.unit_of_measure || 'EA',
                sort_order: i,
                include_in_po: l.include_in_po,
                po_unit_cost: l.po_unit_cost,
              })),
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Failed to create document');
          navigate(`/orders/${data.id}`);
        }
        return;
      }
      const isQuote = order!.type === 'quote';
      const updateUrl = isQuote ? `${QUOTES_API}/${order!.id}` : `${ORDERS_API}/${order!.id}`;
      const updateBody = isQuote ? { ...body, valid_until: form.valid_until || null } : body;
      const res = await authFetch(updateUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update document');
      setOrder({ ...order!, ...data });
      if (data.lines && data.lines.length > 0) {
        const newLines: LineRow[] = data.lines.map((l: LineRow & { item_sku?: string; item_name?: string; unit_of_measure?: string | null; item_unit_of_measure?: string | null; quantity_billed?: number; invoiced_on?: InvoicedOnRow[]; on_purchase_orders?: OnPurchaseOrderRow[] }, i: number) => ({
          id: l.id,
          item_id: l.item_id ?? null,
          item_sku: l.item_sku,
          item_name: l.item_name,
          description: l.description ?? '',
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          unit_of_measure: l.unit_of_measure ?? l.item_unit_of_measure ?? 'EA',
          sort_order: l.sort_order ?? i,
          billing_status: (l.billing_status || 'pending') as BillingStatus,
          quantity_billed: l.quantity_billed != null ? Number(l.quantity_billed) : undefined,
          invoiced_on: l.invoiced_on ?? undefined,
          on_purchase_orders: l.on_purchase_orders ?? undefined,
          include_in_po: false,
          po_unit_cost: undefined,
        }));
        setLines(newLines);
        setQuantityDisplay(newLines.map((l) => String(l.quantity)));
        setUnitPriceDisplay(newLines.map((l) => (Number.isFinite(l.unit_price) ? String(l.unit_price) : '')));
      }
      setIsReadOnly(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) {
      setShowCreateConfirm(true);
      return;
    }
    if (order && !showSaveConfirm) {
      setShowSaveConfirm(true);
      return;
    }
    setShowCreateConfirm(false);
    setShowSaveConfirm(false);
    performSubmit();
  };

  const handleConfirmCreate = () => {
    setShowCreateConfirm(false);
    performSubmit();
  };

  const handleConfirmSave = () => {
    setShowSaveConfirm(false);
    performSubmit();
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = async () => {
    setShowCancelConfirm(false);
    if (isNew) {
      navigate('/orders');
      return;
    }
    if (!order) return;
    const data = await fetchOrder(order.id);
    if (!data) return;
    setOrder(data);
    setForm({
      docType: (data.type === 'quote' || data.type === 'return' ? data.type : 'order') as 'quote' | 'order' | 'return',
      customer_id: String(data.customer_id),
      ticket_id: data.ticket_id != null ? String(data.ticket_id) : '',
      status: data.status || 'open',
      valid_until: data.valid_until ?? '',
      order_date: data.order_date ?? new Date().toISOString().slice(0, 10),
      notes: data.notes ?? '',
      customer_po_number: data.customer_po_number ?? '',
      tax_rate: String(Number(data.tax_rate)),
      shipping_amount: String(Number(data.shipping_amount)),
    });
    const newLines: LineRow[] =
      data.lines && data.lines.length > 0
        ? data.lines.map((l: LineRow & { item_sku?: string; item_name?: string; unit_of_measure?: string | null; item_unit_of_measure?: string | null; quantity_billed?: number; invoiced_on?: InvoicedOnRow[]; on_purchase_orders?: OnPurchaseOrderRow[] }, i: number) => ({
            id: l.id,
            item_id: l.item_id ?? null,
            item_sku: l.item_sku,
            item_name: l.item_name,
            description: l.description ?? '',
            quantity: Number(l.quantity),
            unit_price: Number(l.unit_price),
            unit_of_measure: l.unit_of_measure ?? l.item_unit_of_measure ?? 'EA',
            sort_order: l.sort_order ?? i,
            billing_status: (l.billing_status || 'pending') as BillingStatus,
            quantity_billed: l.quantity_billed != null ? Number(l.quantity_billed) : undefined,
            invoiced_on: l.invoiced_on ?? undefined,
            on_purchase_orders: l.on_purchase_orders ?? undefined,
            include_in_po: false,
            po_unit_cost: undefined,
          }))
        : [emptyLine()];
    setLines(newLines);
    setQuantityDisplay(newLines.map((l) => String(l.quantity)));
    setUnitPriceDisplay(newLines.map((l) => (Number.isFinite(l.unit_price) ? String(l.unit_price) : '')));
    setIsReadOnly(true);
  };

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine()]);
    setQuantityDisplay((prev) => [...prev, '1']);
    setUnitPriceDisplay((prev) => [...prev, '']);
  };
  const removeLine = (index: number) => {
    const row = lines[index];
    if (row && Number(row.quantity_billed ?? 0) > 0) {
      setError('Cannot remove a line that has been invoiced.');
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
    setQuantityDisplay((prev) => prev.filter((_, i) => i !== index));
    setUnitPriceDisplay((prev) => prev.filter((_, i) => i !== index));
  };
  const updateLine = (index: number, field: keyof LineRow, value: number | string | boolean | null) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'item_id' && value != null) {
        const item = items.find((i) => i.id === Number(value));
        if (item) {
          next[index].unit_price = item.unit_price;
          next[index].description = item.name;
          if (next[index].po_unit_cost === undefined && item.our_cost != null) next[index].po_unit_cost = item.our_cost;
        }
      }
      return next;
    });
    if (field === 'item_id' && value != null) {
      const item = items.find((i) => i.id === Number(value));
      if (item) {
        setUnitPriceDisplay((prev) => {
          const next = [...prev];
          while (next.length <= index) next.push('');
          next[index] = String(item.unit_price);
          return next;
        });
      }
    }
  };

  const hasRemaining = (l: LineRow) => {
    const q = Number(l.quantity);
    const b = Number(l.quantity_billed ?? 0);
    return q - b > 0;
  };
  const displayedIndices = !isNew && order?.type === 'order' && selectedSubOrderView === 'current'
    ? lines.map((l, i) => ({ l, i })).filter(({ l }) => hasRemaining(l)).map(({ i }) => i)
    : lines.map((_, i) => i);
  const displayedLines = displayedIndices.map((i) => lines[i]);
  const isCurrentOrderRemainingView = !isNew && order?.type === 'order' && selectedSubOrderView === 'current';
  const totals = isCurrentOrderRemainingView
    ? (() => {
        const subtotal = lines.reduce((sum, l) => {
          const q = Number(l.quantity);
          const b = Number(l.quantity_billed ?? 0);
          const remaining = Math.max(0, q - b);
          return sum + remaining * Number(l.unit_price);
        }, 0);
        const taxRate = parseFloat(form.tax_rate) || 0;
        const shipping = parseFloat(form.shipping_amount) || 0;
        const taxAmount = subtotal * taxRate;
        return { subtotal, tax_amount: taxAmount, total: subtotal + taxAmount + shipping };
      })()
    : recalcTotals();
  const billableCount = displayedLines.filter((l) => l.billing_status === 'billable').length;
  const hasBillableLines = billableCount > 0;

  /** When viewing a sub order, show that invoice's totals; otherwise show order/remaining totals. */
  const displayTotals = subOrderInvoice
    ? {
        subtotal: subOrderInvoice.subtotal,
        tax_amount: subOrderInvoice.tax_amount,
        shipping_amount: subOrderInvoice.shipping_amount,
        total: subOrderInvoice.total,
      }
    : { ...totals, shipping_amount: parseFloat(form.shipping_amount || '0') };

  if (loading) {
    return (
      <div className="page-container">
          <p className="text-dark-text-muted py-8">Loading...</p>
        </div>
    );
  }

  const readOnly = !isNew && isReadOnly;

  const viewPdf = async () => {
    if (!order) return;
    try {
      const res = await authFetch(`${ORDERS_API}/${order.id}/pdf`);
      if (!res.ok) throw new Error('Failed to load PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load PDF');
    }
  };

  const downloadPdf = async () => {
    if (!order) return;
    try {
      const res = await authFetch(`${ORDERS_API}/${order.id}/pdf`);
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${order.document_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to download PDF');
    }
  };

  return (
    <div className="page-container">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <BackArrow to="/orders" label="Back to Orders" />
        {!isNew && order?.type === 'order' && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-dark-text font-medium">Order {order.document_number}</span>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-dark-text-muted">View:</span>
              <select
                value={selectedSubOrderView === 'current' ? 'current' : selectedSubOrderView}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedSubOrderView(v === 'current' ? 'current' : parseInt(v, 10));
                }}
                className="input-field py-1.5 px-2 text-sm min-h-0 min-w-[200px]"
              >
                <option value="current">Current order (remaining to bill)</option>
                {orderInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.sub_order_number} — Invoice #{inv.invoice_number}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {!isNew && order && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {readOnly ? (
              <button
                type="button"
                onClick={() => {
                  // Defer so this click’s mouseup cannot land on the Save button that replaces Edit (same slot).
                  setTimeout(() => setIsReadOnly(false), 0);
                }}
                className="link-primary"
              >
                Edit
              </button>
            ) : (
              <>
                <button type="submit" form="order-detail-form" disabled={saving} className="link-primary">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={handleCancelClick} className="link-primary">
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {showSaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-dark-surface border border-dark-border rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-dark-text mb-2">Save changes?</h3>
            <p className="text-dark-text-muted text-sm mb-4">Are you sure you want to save? This will update the order.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowSaveConfirm(false)} className="btn-text-action">Cancel</button>
              <button type="button" onClick={handleConfirmSave} className="btn-text-action" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {showCreateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-dark-surface border border-dark-border rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-dark-text mb-2">{form.docType === 'quote' ? 'Create quote?' : 'Create order?'}</h3>
            <p className="text-dark-text-muted text-sm mb-4">Are you sure you want to create this {form.docType === 'quote' ? 'quote' : 'order'}? This will save and open the new document.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCreateConfirm(false)} className="btn-text-action">Cancel</button>
              <button type="button" onClick={handleConfirmCreate} className="btn-text-action" disabled={saving}>{saving ? 'Saving…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-dark-surface border border-dark-border rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-dark-text mb-2">Discard changes?</h3>
            <p className="text-dark-text-muted text-sm mb-4">Are you sure you want to discard your changes? This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCancelConfirm(false)} className="btn-text-action">Keep editing</button>
              <button type="button" onClick={handleConfirmCancel} className="btn-text-action">Discard</button>
            </div>
          </div>
        </div>
      )}

      <ErrorBanner message={error} />

      <form id="order-detail-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & details: full width (busy component) */}
        <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border space-y-4">
          <h2 className="text-lg font-semibold text-dark-text">Customer &amp; details</h2>
            <div className="detail-grid gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Type</label>
                <select
                  value={form.docType}
                  onChange={(e) => setForm((f) => ({ ...f, docType: e.target.value as 'quote' | 'order' | 'return' }))}
                  className="input-field max-w-[140px]"
                  disabled={!isNew || readOnly}
                >
                  <option value="quote">Quote</option>
                  <option value="order">Order</option>
                  <option value="return">Return</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Customer *</label>
                <select
                  value={form.customer_id}
                  onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
                  className="input-field"
                  required
                  disabled={readOnly}
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <TicketSelector
                  value={form.ticket_id}
                  onChange={(v) => setForm((f) => ({ ...f, ticket_id: v }))}
                  customerId={form.customer_id}
                  disabled={readOnly}
                />
              </div>
              {form.docType === 'quote' && (
                <div>
                  <label className="block text-sm font-medium text-dark-text-muted mb-1">Valid until</label>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                    className="input-field"
                    disabled={readOnly}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Order date</label>
                <input
                  type="date"
                  value={form.order_date}
                  onChange={(e) => setForm((f) => ({ ...f, order_date: e.target.value }))}
                  className="input-field w-40"
                  disabled={readOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Customer PO</label>
                <input
                  type="text"
                  value={form.customer_po_number}
                  onChange={(e) => setForm((f) => ({ ...f, customer_po_number: e.target.value }))}
                  className="input-field"
                  placeholder="N/A"
                  disabled={readOnly}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text-muted mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="input-field min-h-[8rem]"
                rows={6}
                disabled={readOnly}
              />
            </div>
        </div>

        {/* Line items: full width (larger component on top) */}
        <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border">
            <h2 className="text-lg font-semibold text-dark-text mb-4">Line items</h2>
            {!isNew && order?.type === 'order' && typeof selectedSubOrderView === 'number' && subOrderInvoice && (
              <>
                <p className="text-sm text-dark-text-muted mb-3">
                  Invoiced from order {order.document_number} (sub order {subOrderInvoice.sub_order_number}) — Invoice #{subOrderInvoice.invoice_number}
                </p>
                <div className="table-scroll">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left py-1.5 px-2 font-medium text-dark-text-muted">Description</th>
                        <th className="text-right py-1.5 px-2 font-medium text-dark-text-muted w-16">Qty</th>
                        <th className="text-right py-1.5 px-2 font-medium text-dark-text-muted w-24">Unit price</th>
                        <th className="text-right py-1.5 px-2 font-medium text-dark-text-muted w-24">Extended</th>
                      </tr>
                    </thead>
                    <tbody className="text-dark-text">
                      {subOrderInvoice.lines.map((l, i) => (
                        <tr key={i} className="border-t border-dark-border">
                          <td className="py-1.5 px-2">{l.description ?? '—'}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{Number(l.quantity)}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{Number(l.unit_price).toFixed(2)}</td>
                          <td className="py-1.5 px-2 text-right font-mono">{(Number(l.quantity) * Number(l.unit_price)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {(!order || order.type !== 'order' || selectedSubOrderView === 'current' || typeof selectedSubOrderView !== 'number' || !subOrderInvoice) && (
            <>
            {isNew && form.docType === 'order' && (
              <label className="flex items-center gap-2 mb-4 text-dark-text">
                <input
                  type="checkbox"
                  checked={createPurchaseOrder}
                  onChange={(e) => setCreatePurchaseOrder(e.target.checked)}
                />
                Create purchase order
              </label>
            )}
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-1.5 px-2 font-medium text-dark-text-muted">SKU</th>
                    <th className="text-left py-1.5 px-2 font-medium text-dark-text-muted">Description</th>
                    <th className="text-right py-1.5 px-2 font-medium text-dark-text-muted w-16">Qty</th>
                    <th className="text-left py-1.5 px-2 font-medium text-dark-text-muted w-16">U/M</th>
                    <th className="text-right py-1.5 px-2 font-medium text-dark-text-muted w-24">Unit price</th>
                    <th className="text-right py-1.5 px-2 font-medium text-dark-text-muted w-24">Cost</th>
                    {isNew && createPurchaseOrder && <th className="py-1.5 px-2">In PO</th>}
                    {isNew && createPurchaseOrder && <th className="py-1.5 px-2">Our cost</th>}
                    <th className="w-20 py-1.5 px-2"></th>
                  </tr>
                </thead>
                <tbody className="text-dark-text">
                  {displayedLines.map((line, displayedIdx) => {
                    const idx = displayedIndices[displayedIdx];
                    const remainingQty = isCurrentOrderRemainingView
                      ? Math.max(0, Number(line.quantity) - Number(line.quantity_billed ?? 0))
                      : Number(line.quantity);
                    const extendedCost = isCurrentOrderRemainingView
                      ? remainingQty * Number(line.unit_price)
                      : line.quantity * line.unit_price;
                    return (
                    <tr key={idx} className="border-t border-dark-border">
                      <td className="py-1.5 px-2 font-mono whitespace-nowrap align-top">
                        <select
                          value={line.item_id ?? ''}
                          onChange={(e) =>
                            updateLine(idx, 'item_id', e.target.value ? parseInt(e.target.value, 10) : null)
                          }
                          className="input-field py-1.5 px-2 text-sm min-h-0 w-full max-w-[140px]"
                          disabled={readOnly}
                        >
                          <option value="">— Ad-hoc —</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.sku}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-2 align-top min-w-[120px]">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => updateLine(idx, 'description', e.target.value)}
                          className="input-field py-1.5 px-2 text-sm min-h-0 w-full"
                          placeholder="Description"
                          disabled={readOnly}
                        />
                        {line.invoiced_on?.length ? (
                          <div className="text-xs text-dark-text-muted mt-0.5 whitespace-nowrap">Invoiced on {line.invoiced_on.map((x) => x.sub_order_number).join(', ')}</div>
                        ) : null}
                        {line.on_purchase_orders?.length ? (
                          <div className="text-xs text-dark-text-muted mt-0.5 whitespace-nowrap">
                            On purchase order{' '}
                            {line.on_purchase_orders.map((po, pi) => (
                              <span key={po.purchase_order_id}>
                                {pi > 0 ? ', ' : ''}
                                <Link to={`/purchasing/${po.purchase_order_id}`} className="link-primary">
                                  {po.po_number}
                                </Link>
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-1.5 px-2 text-right align-top">
                        {readOnly && isCurrentOrderRemainingView ? (
                          <span className="font-mono">{remainingQty}</span>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            value={quantityDisplay[idx] ?? String(line.quantity)}
                            onChange={(e) => {
                              setQuantityDisplay((prev) => {
                                const next = [...prev];
                                while (next.length <= idx) next.push(String(lines[idx]?.quantity ?? 1));
                                next[idx] = e.target.value;
                                return next;
                              });
                            }}
                            onBlur={() => {
                              const raw = quantityDisplay[idx] ?? String(line.quantity);
                              const parsed = parseFloat(raw);
                              let num = Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
                              if (!isNew && order?.type === 'order' && line.id != null) {
                                const billed = Number(line.quantity_billed ?? 0);
                                if (billed > 0) {
                                  const orig = order.lines.find((o) => o.id === line.id);
                                  const origQty = orig != null ? Number(orig.quantity) : line.quantity;
                                  const min = billed;
                                  const max = origQty;
                                  if (num < min) num = min;
                                  if (num > max) num = max;
                                }
                              }
                              updateLine(idx, 'quantity', num);
                              setQuantityDisplay((prev) => {
                                const next = [...prev];
                                while (next.length <= idx) next.push(String(line.quantity));
                                next[idx] = String(num);
                                return next;
                              });
                            }}
                            className="input-field py-1.5 px-2 text-sm min-h-0 w-16 text-right"
                            disabled={readOnly}
                          />
                        )}
                      </td>
                      <td className="py-1.5 px-2 align-top">
                        <select
                          value={line.unit_of_measure ?? 'EA'}
                          onChange={(e) => updateLine(idx, 'unit_of_measure', e.target.value)}
                          className="input-field py-1.5 px-2 text-sm min-h-0 w-16"
                          disabled={readOnly}
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-2 text-right align-top">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={unitPriceDisplay[idx] ?? String(line.unit_price)}
                          onChange={(e) => {
                            setUnitPriceDisplay((prev) => {
                              const next = [...prev];
                              while (next.length <= idx) next.push(String(lines[idx]?.unit_price ?? ''));
                              next[idx] = e.target.value;
                              return next;
                            });
                          }}
                          onBlur={() => {
                            const raw = (unitPriceDisplay[idx] ?? String(line.unit_price)).trim();
                            const parsed = parseFloat(raw);
                            const num = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
                            updateLine(idx, 'unit_price', num);
                            setUnitPriceDisplay((prev) => {
                              const next = [...prev];
                              while (next.length <= idx) next.push(String(line.unit_price));
                              next[idx] = String(num);
                              return next;
                            });
                          }}
                          className="input-field py-1.5 px-2 text-sm min-h-0 w-24 text-right"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap align-top">{extendedCost.toFixed(2)}</td>
                      {isNew && createPurchaseOrder && (
                        <td className="py-1.5 px-2 align-top">
                          <input
                            type="checkbox"
                            checked={!!line.include_in_po}
                            onChange={(e) => updateLine(idx, 'include_in_po', e.target.checked)}
                          />
                        </td>
                      )}
                      {isNew && createPurchaseOrder && (
                        <td className="py-1.5 px-2 align-top">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.po_unit_cost ?? ''}
                            onChange={(e) => updateLine(idx, 'po_unit_cost', e.target.value === '' ? null : parseFloat(e.target.value) || 0)}
                            className="input-field py-1.5 px-2 text-sm min-h-0 w-20 text-right"
                            placeholder="0"
                          />
                        </td>
                      )}
                      <td className="py-1.5 px-2 align-top">
                        {!readOnly && Number(line.quantity_billed ?? 0) <= 0 && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-red-400 hover:underline text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
            {!readOnly && (
              <button type="button" onClick={addLine} className="btn-text-action mt-2">
                Add line
              </button>
            )}
            </>
            )}
          </div>

        {/* Summary + Totals: smaller components toward bottom, horizontal row on lg */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Summary */}
          <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border h-fit space-y-3">
            <h2 className="text-lg font-semibold text-dark-text">Summary</h2>
            {!isNew && order && (
              <>
                <dl className="space-y-1 text-sm text-dark-text">
                  <div>
                    <dt className="text-dark-text-muted text-xs">Document #</dt>
                    <dd className="font-mono font-medium">{order.document_number}</dd>
                  </div>
                  <div>
                    <dt className="text-dark-text-muted text-xs">Total</dt>
                    <dd className="font-semibold">{displayTotals.total.toFixed(2)}</dd>
                  </div>
                </dl>
                <p className="text-xs text-dark-text-muted border-t border-dark-border pt-2 mt-2">
                  Orders close when all items are invoiced. To cancel, set line prices to 0 and create a zero-balance invoice.
                </p>
                {order.type === 'order' && (
                  <div className="border-t border-dark-border pt-3 mt-3">
                    <h3 className="text-sm font-medium text-dark-text mb-2">Deposits</h3>
                    <p className="text-xs text-dark-text-muted mb-2">Deposit payments are recorded here and applied to the next invoice when you create it.</p>
                    {deposits.length === 0 ? (
                      <p className="text-xs text-dark-text-muted mb-2">No deposits yet.</p>
                    ) : (
                      <ul className="space-y-1.5 mb-2">
                        {deposits.map((d) => (
                          <li key={d.id} className="text-sm flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="font-mono">{Number(d.amount).toFixed(2)}</span>
                            <span className="text-dark-text-muted">{d.payment_method ?? 'deposit'}</span>
                            <span className="text-dark-text-muted">{formatDate(d.paid_at)}</span>
                            {d.reference && <span className="text-dark-text-muted">({d.reference})</span>}
                            <span className="text-dark-text-muted text-xs">
                              {d.applied_to_invoice_id != null
                                ? (d.applied_to_invoice_number ? `Applied to invoice #${d.applied_to_invoice_number}` : 'Applied to invoice')
                                : 'Will apply to next invoice'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button type="button" onClick={() => { setDepositModalOpen(true); setDepositError(''); setDepositForm({ amount: '', payment_method: 'check', paid_at: new Date().toISOString().slice(0, 10), reference: '' }); }} className="link-primary text-sm">
                      Add deposit
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                  <button type="button" onClick={viewPdf} className="link-primary">View PDF</button>
                  <button type="button" onClick={downloadPdf} className="link-primary">Download PDF</button>
                  {order.original_quote_id != null && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await authFetch(`${ORDERS_API}/${order.id}/quote-pdf`);
                          if (!res.ok) throw new Error('Failed to load quote PDF');
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          window.open(url, '_blank');
                          setTimeout(() => URL.revokeObjectURL(url), 60000);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Failed to load quote PDF');
                        }
                      }}
                      className="link-primary"
                    >
                      Quote PDF
                    </button>
                  )}
                  {order.type === 'quote' && (
                    <button
                      type="button"
                      onClick={async () => {
                        setError('');
                        try {
                          const res = await authFetch(`${QUOTES_API}/${order.id}/convert-to-order`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({}),
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) throw new Error(data.error || 'Failed to convert');
                          navigate(`/orders/${data.id}`);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Failed to convert to order');
                        }
                      }}
                      className="link-primary"
                    >
                      Convert to order
                    </button>
                  )}
                  {hasBillableLines && selectedSubOrderView === 'current' && (
                    <button
                      type="button"
                      disabled={creatingInvoice}
                      onClick={async () => {
                        setError('');
                        setCreatingInvoice(true);
                        try {
                          const res = await authFetch(`${ORDERS_API}/${order.id}/invoices`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({}),
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) throw new Error(data.error || 'Failed to create invoice');
                          navigate(`/invoices/${data.id}`);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Failed to create invoice');
                        } finally {
                          setCreatingInvoice(false);
                        }
                      }}
                      className="link-primary"
                    >
                      {creatingInvoice ? 'Creating…' : 'Create invoice'}
                    </button>
                  )}
                  {order.lines?.length > 0 && selectedSubOrderView === 'current' && (
                    <button
                      type="button"
                      disabled={creatingPO}
                      onClick={() => {
                        setError('');
                        const eligible = lines
                          .filter(
                            (l): l is LineRow & { id: number } =>
                              typeof l.id === 'number' && !(l.on_purchase_orders?.length)
                          )
                          .map((l) => l.id);
                        setPoSelectedLineIds(new Set(eligible));
                        setPoModalOpen(true);
                      }}
                      className="link-primary"
                    >
                      Create PO
                    </button>
                  )}
                </div>
              </>
            )}
            {isNew && (
              <>
                <p className="text-sm text-dark-text-muted">Totals update as you add lines.</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                  <button type="submit" disabled={saving} className="link-primary">{saving ? 'Saving…' : form.docType === 'quote' ? 'Create quote' : 'Create order'}</button>
                  <button type="button" onClick={handleCancelClick} className="link-primary">Cancel</button>
                </div>
              </>
            )}
          </div>

          {/* Totals */}
          <div className="p-4 sm:p-6 rounded-xl bg-dark-surface border border-dark-border">
            <h2 className="text-lg font-semibold text-dark-text mb-3">Totals</h2>
            {!subOrderInvoice && (
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex justify-between items-center py-0.5">
                <label className="text-sm text-dark-text-muted">Tax rate</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={form.tax_rate}
                  onChange={(e) => setForm((f) => ({ ...f, tax_rate: e.target.value }))}
                  className="input-field py-1.5 px-2 text-sm min-h-0 w-20 text-right"
                  disabled={readOnly}
                />
              </div>
              <div className="flex justify-between items-center py-0.5">
                <label className="text-sm text-dark-text-muted">Shipping</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.shipping_amount}
                  onChange={(e) => setForm((f) => ({ ...f, shipping_amount: e.target.value }))}
                  className="input-field py-1.5 px-2 text-sm min-h-0 w-20 text-right"
                  disabled={readOnly}
                />
              </div>
            </div>
            )}
            <div className="border-t border-dark-border pt-2 space-y-0.5 text-sm text-dark-text">
              <div className="flex justify-between py-0.5">Subtotal <span className="font-mono">{displayTotals.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between py-0.5">Tax <span className="font-mono">{displayTotals.tax_amount.toFixed(2)}</span></div>
              <div className="flex justify-between py-0.5">Shipping <span className="font-mono">{displayTotals.shipping_amount.toFixed(2)}</span></div>
              <div className="flex justify-between py-0.5 font-semibold pt-1">Total <span className="font-mono">{displayTotals.total.toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      </form>

      {/* Create PO: select lines modal */}
      {poModalOpen && order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setPoModalOpen(false)}>
          <div className="bg-dark-surface border border-dark-border rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-dark-border">
              <h3 className="text-lg font-semibold text-dark-text">Add to purchase order</h3>
              <p className="text-sm text-dark-text-muted mt-1">Select the lines you want to include on the PO.</p>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <ul className="space-y-2">
                {lines.map((line) => {
                  const lineId = line.id;
                  if (typeof lineId !== 'number') return null;
                  const onPo = line.on_purchase_orders?.length;
                  const label = line.item_sku && line.item_name ? `${line.item_sku} – ${line.item_name}` : (line.description || '—');
                  return (
                    <li key={lineId} className="flex items-start gap-3 py-2 border-b border-dark-border last:border-0">
                      <input
                        type="checkbox"
                        id={`po-line-${lineId}`}
                        disabled={!!onPo}
                        checked={poSelectedLineIds.has(lineId)}
                        onChange={(e) => {
                          setPoSelectedLineIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(lineId);
                            else next.delete(lineId);
                            return next;
                          });
                        }}
                        className="rounded border-dark-border mt-0.5 shrink-0"
                      />
                      <label
                        htmlFor={`po-line-${lineId}`}
                        className={`flex-1 text-sm ${onPo ? 'text-dark-text-muted cursor-not-allowed' : 'text-dark-text cursor-pointer'}`}
                      >
                        <span>{label} — {Number(line.quantity)} × {Number(line.unit_price).toFixed(2)}</span>
                        {onPo ? (
                          <span className="block text-xs mt-1 whitespace-nowrap">
                            Already on{' '}
                            {line.on_purchase_orders!.map((po, pi) => (
                              <span key={po.purchase_order_id}>
                                {pi > 0 ? ', ' : ''}
                                <Link to={`/purchasing/${po.purchase_order_id}`} className="link-primary" onClick={(e) => e.stopPropagation()}>
                                  {po.po_number}
                                </Link>
                              </span>
                            ))}
                            . Cancel that PO to include this line on a new one.
                          </span>
                        ) : null}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="p-4 border-t border-dark-border flex flex-wrap gap-2">
              <button
                type="button"
                disabled={creatingPO || poSelectedLineIds.size === 0}
                className="btn-text-action"
                onClick={async () => {
                  setError('');
                  setCreatingPO(true);
                  try {
                    const res = await authFetch(`${ORDERS_API}/${order.id}/purchase-orders`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ line_ids: Array.from(poSelectedLineIds) }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || 'Failed to create purchase order');
                    setPoModalOpen(false);
                    navigate(`/purchasing/${data.id}`);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to create purchase order');
                  } finally {
                    setCreatingPO(false);
                  }
                }}
              >
                {creatingPO ? 'Creating…' : 'Create PO'}
              </button>
              <button type="button" onClick={() => setPoModalOpen(false)} className="btn-text-action">
                Cancel
              </button>
            </div>
            {error && (
              <div className="px-4 pb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add deposit modal */}
      {depositModalOpen && order && order.type === 'order' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setDepositModalOpen(false)}>
          <div className="bg-dark-surface border border-dark-border rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-dark-text mb-2">Add deposit</h3>
            <p className="text-sm text-dark-text-muted mb-4">This payment will be applied to the next invoice created for this order.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Amount</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={depositForm.amount}
                  onChange={(e) => setDepositForm((f) => ({ ...f, amount: e.target.value }))}
                  className="input-field w-full"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Payment type</label>
                <select
                  value={depositForm.payment_method}
                  onChange={(e) => setDepositForm((f) => ({ ...f, payment_method: e.target.value as 'cash' | 'check' }))}
                  className="input-field w-full"
                >
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Date</label>
                <input
                  type="date"
                  value={depositForm.paid_at}
                  onChange={(e) => setDepositForm((f) => ({ ...f, paid_at: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Reference (optional)</label>
                <input
                  type="text"
                  value={depositForm.reference}
                  onChange={(e) => setDepositForm((f) => ({ ...f, reference: e.target.value }))}
                  className="input-field w-full"
                  placeholder="Check #, etc."
                />
              </div>
            </div>
            {depositError && <p className="text-red-400 text-sm mt-2">{depositError}</p>}
            <div className="flex flex-wrap gap-2 mt-6">
              <button
                type="button"
                disabled={submittingDeposit || !depositForm.amount || parseFloat(depositForm.amount) <= 0}
                className="btn-text-action"
                onClick={async () => {
                  setDepositError('');
                  setSubmittingDeposit(true);
                  try {
                    const res = await authFetch(`${ORDERS_API}/${order.id}/deposits`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        amount: parseFloat(depositForm.amount),
                        payment_method: depositForm.payment_method,
                        paid_at: depositForm.paid_at || new Date().toISOString().slice(0, 10),
                        reference: depositForm.reference.trim() || undefined,
                      }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || 'Failed to add deposit');
                    setDepositModalOpen(false);
                    fetchDeposits(order.id);
                  } catch (e) {
                    setDepositError(e instanceof Error ? e.message : 'Failed to add deposit');
                  } finally {
                    setSubmittingDeposit(false);
                  }
                }}
              >
                {submittingDeposit ? 'Adding…' : 'Add deposit'}
              </button>
              <button type="button" onClick={() => setDepositModalOpen(false)} className="btn-text-action">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;
