import { Link } from 'react-router-dom';

export interface InvoicedOnEntry {
  invoice_id?: number;
  sub_order_number: string;
  invoice_number: string;
  quantity: number;
}

interface LineInvoiceNotationProps {
  invoicedOn?: InvoicedOnEntry[];
  orderQuantity: number;
  quantityBilled?: number;
}

const LineInvoiceNotation = ({ invoicedOn, orderQuantity, quantityBilled }: LineInvoiceNotationProps) => {
  const billed = Number(quantityBilled ?? 0);
  const remaining = Math.max(0, Number(orderQuantity) - billed);

  if (!invoicedOn?.length && billed <= 0) return null;

  return (
    <div className="mt-1.5 space-y-1">
      {billed > 0 && (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
          {billed} of {orderQuantity} invoiced
          {remaining > 0 ? ` · ${remaining} remaining` : ' · fully invoiced'}
        </p>
      )}
      {invoicedOn?.map((inv, i) => (
        <p key={`${inv.invoice_number}-${i}`} className="text-xs text-text-muted">
          <span className="text-primary/90">Invoiced {inv.quantity}</span>
          {' on '}
          {inv.invoice_id != null ? (
            <Link to={`/invoices/${inv.invoice_id}`} className="link-primary text-xs">
              Invoice #{inv.invoice_number}
            </Link>
          ) : (
            <span className="font-mono">Invoice #{inv.invoice_number}</span>
          )}
          {inv.sub_order_number ? (
            <span className="text-text-muted"> ({inv.sub_order_number})</span>
          ) : null}
        </p>
      ))}
    </div>
  );
};

export default LineInvoiceNotation;
