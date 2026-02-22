# Changelog

Notable behavior and feature changes for A.N.D.Y. (Advanced Notation & Deployment Yard).

---

## Orders, Invoicing, Payment Reversal & Unit of Measure

### Order closing

- **Before:** An order could close as soon as all *billable* lines were fully invoiced. Lines still in `pending` were ignored, so the order sometimes closed while items remained to be billed.
- **After:** An order closes only when **every** line item is fully invoiced (`billing_status = 'invoiced'` and `quantity_billed >= quantity`). Users can keep adding lines to an order until all items are invoiced.
- **Implementation:** Invoice service uses `countOrderLinesNotFullyInvoiced` and calls `setOrderClosed` only when that count is 0.

### Payment reversal

- **Before:** Reversing a payment only deleted the payment and updated `amount_paid`. The order and its lines stayed closed/invoiced.
- **After:** Reversing a payment on an invoice:
  1. Deletes the payment and syncs `amount_paid`.
  2. For each line on that invoice, subtracts the invoiced quantity from the order line’s `quantity_billed` and sets `billing_status` back to `'billable'` when `quantity_billed` reaches 0.
  3. Sets the order status back to `'open'` if it was `'closed'`.
- **Implementation:** Invoice service adds `subtractOrderLineQuantityBilled`, `setOrderOpen`, and in `deletePayment` loads invoice lines, updates order lines, and reopens the order when appropriate.

### Payment history & negative balance

- **Totals:** Customer Payment History page has a totals section below the table: subtotals for invoice payments and deposits, and a grand total.
- **Negative balance:** Invoices can show a negative balance (credit) when payments plus applied deposits exceed the invoice total. `syncInvoiceAmountPaid` no longer caps `amount_paid` at `total`; it uses the raw sum of payments so overpayment remains as credit on the invoice.

### Unit of measure (LBR vs EA)

- **Before:** For items whose default U/M is LBR (e.g. weight), if the user selected EA (each) on an order line, the backend overwrote it with the item’s `unit_of_measure` (LBR).
- **After:** The client’s choice is respected. If the client sends a non-empty `unit_of_measure` (including `'EA'`), that value is used. The item’s U/M is used only when the client does not send a U/M (missing, null, or empty).
- **Implementation:** In order-service `quoteOrderController`, `createQuote`, `createOrder`, `updateQuote`, and `updateOrder` use “client sent explicit U/M → use it; else default from item or 'EA'” instead of “if EA then overwrite with item U/M”.

---

## Branding: 19th Chamber Integrated / A.N.D.Y.

### Names

- **Company:** 19th Chamber Integrated  
- **Product:** A.N.D.Y. – Advanced Notation & Deployment Yard  

### UI

- **Sidebar (expanded):** Top-left shows Bot icon + “A.N.D.Y.” on one line and “Advanced Notation & Deployment Yard” centered below. Entire block links to home. Collapse/expand chevron has transparent background and no border (`btn-sidebar-chevron` excluded from global button styles).
- **Sidebar (collapsed):** Bot icon only, centered in the bar; chevron remains on the right with transparent styling.
- **Home:** Landing page and first nav link are labeled “The Yard” (path `/`).
- **Page title fallback:** Unknown routes show “A.N.D.Y.” in the top bar.
- **Login:** Title is “A.N.D.Y.” with subtitle “Advanced Notation & Deployment Yard”.
- **Document title:** Browser tab/window title is “A.N.D.Y. – 19th Chamber Integrated”.

### Code / docs

- **README:** Project title and description use A.N.D.Y. and 19th Chamber Integrated.
- **package.json:** Root description updated to A.N.D.Y. (19th Chamber Integrated).
- **Global CSS:** `.btn-sidebar-chevron` is excluded from the common button border/outline rules so the sidebar expand/collapse arrows stay borderless and transparent.
