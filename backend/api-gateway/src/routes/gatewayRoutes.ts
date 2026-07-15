import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { verifyToken, AuthRequest } from '../middleware/authMiddleware';

const router = express.Router();

router.use((req: Request, res: Response, next: NextFunction) => {
  console.log("Gateway received request:", req.method, req.path);
  next();
});

const authProxy = createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '/api/auth' },
  onProxyReq: (proxyReq, req: Request) => {
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader("Content-Type", "application/json");
      proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err: Error, req: Request, res: Response) => {
    console.error("Auth Proxy error:", err);
    res.status(500).json({ error: "Proxy error", details: err.message });
  },
});

const customerProxy = createProxyMiddleware(
  (pathname) => pathname.startsWith('/api/app/customers'),
  {
  target: process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3003',
  changeOrigin: true,
  pathRewrite: { '^/api/app': '/api/app' },
  onProxyReq: (proxyReq, req: Request) => {
    const authReq = req as AuthRequest;
    if (authReq.user) proxyReq.setHeader('x-user-context', JSON.stringify(authReq.user));
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader("Content-Type", "application/json");
      proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    } else if (req.body && req.body instanceof Buffer) proxyReq.write(req.body);
  },
  onError: (err: Error, req: Request, res: Response) => {
    console.error("Customer Proxy error:", err);
    res.status(500).json({ error: "Proxy error", details: err.message });
  },
},
);

const ticketProxy = createProxyMiddleware(
  (pathname) => pathname.startsWith('/api/app/tickets'),
  {
  target: process.env.TICKET_SERVICE_URL || 'http://localhost:3004',
  changeOrigin: true,
  pathRewrite: { '^/api/app': '/api/app' },
  onProxyReq: (proxyReq, req: Request) => {
    const authReq = req as AuthRequest;
    if (authReq.user) proxyReq.setHeader('x-user-context', JSON.stringify(authReq.user));
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader("Content-Type", "application/json");
      proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    } else if (req.body && req.body instanceof Buffer) proxyReq.write(req.body);
  },
  onError: (err: Error, req: Request, res: Response) => {
    console.error("Ticket Proxy error:", err);
    res.status(500).json({ error: "Proxy error", details: err.message });
  },
},
);

const orderProxy = createProxyMiddleware(
  (pathname) =>
    pathname.startsWith('/api/app/items') ||
    pathname.startsWith('/api/app/quotes') ||
    pathname.startsWith('/api/app/purchase-orders') ||
    (pathname.startsWith('/api/app/orders') && !/\/\d+\/invoices$/.test(pathname) && !/\/\d+\/pdf$/.test(pathname) && !/\/\d+\/quote-pdf$/.test(pathname)),
  {
  target: process.env.ORDER_SERVICE_URL || 'http://localhost:3005',
  changeOrigin: true,
  pathRewrite: { '^/api/app': '/api/app' },
  onProxyReq: (proxyReq, req: Request) => {
    const authReq = req as AuthRequest;
    if (authReq.user) proxyReq.setHeader('x-user-context', JSON.stringify(authReq.user));
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader("Content-Type", "application/json");
      proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    } else if (req.body && req.body instanceof Buffer) proxyReq.write(req.body);
  },
  onError: (err: Error, req: Request, res: Response) => {
    console.error("Order Proxy error:", err);
    res.status(500).json({ error: "Proxy error", details: err.message });
  },
},
);

const invoiceProxy = createProxyMiddleware(
  (pathname) =>
    (pathname.startsWith('/api/app/invoices') && !/\/invoices\/\d+\/pdf$/.test(pathname)) ||
    /^\/api\/app\/orders\/\d+\/invoices/.test(pathname),
  {
  target: process.env.INVOICE_SERVICE_URL || 'http://localhost:3006',
  changeOrigin: true,
  pathRewrite: { '^/api/app': '/api/app' },
  onProxyReq: (proxyReq, req: Request) => {
    const authReq = req as AuthRequest;
    if (authReq.user) proxyReq.setHeader('x-user-context', JSON.stringify(authReq.user));
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader("Content-Type", "application/json");
      proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    } else if (req.body && req.body instanceof Buffer) proxyReq.write(req.body);
  },
  onError: (err: Error, req: Request, res: Response) => {
    console.error("Invoice Proxy error:", err);
    res.status(500).json({ error: "Proxy error", details: err.message });
  },
},
);

const pdfProxy = createProxyMiddleware(
  (pathname) =>
    /\/quotes\/\d+\/pdf$/.test(pathname) ||
    /\/orders\/\d+\/pdf$/.test(pathname) ||
    /\/orders\/\d+\/quote-pdf$/.test(pathname) ||
    /\/invoices\/\d+\/pdf$/.test(pathname) ||
    /\/purchase-orders\/\d+\/pdf$/.test(pathname),
  {
  target: process.env.PDF_SERVICE_URL || 'http://localhost:3007',
  changeOrigin: true,
  pathRewrite: { '^/api/app': '/api/app' },
  onProxyReq: (proxyReq, req: Request) => {
    const authReq = req as AuthRequest;
    if (authReq.user) proxyReq.setHeader('x-user-context', JSON.stringify(authReq.user));
  },
  onError: (err: Error, req: Request, res: Response) => {
    console.error("PDF Proxy error:", err);
    res.status(500).json({ error: "Proxy error", details: err.message });
  },
},
);

async function searchAggregate(req: AuthRequest, res: Response): Promise<void> {
  const q = String((req.query.q as string) || '').trim();
  const authHeader = req.headers.authorization || '';
  const customerUrl = (process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3003') + '/api/app/customers/search';
  const ticketUrl = (process.env.TICKET_SERVICE_URL || 'http://localhost:3004') + '/api/app/tickets/search';
  const orderUrl = (process.env.ORDER_SERVICE_URL || 'http://localhost:3005') + '/api/app/orders/search';
  const invoiceUrl = (process.env.INVOICE_SERVICE_URL || 'http://localhost:3006') + '/api/app/invoices/search';
  const itemUrl = (process.env.ORDER_SERVICE_URL || 'http://localhost:3005') + '/api/app/items/search';
  const purchaseOrderUrl = (process.env.ORDER_SERVICE_URL || 'http://localhost:3005') + '/api/app/purchase-orders/search';
  const opts = { headers: { Authorization: authHeader } };

  const fetchJson = async (url: string): Promise<unknown[]> => {
    try {
      const r = await fetch(`${url}?q=${encodeURIComponent(q)}`, opts);
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const [customers, tickets, orders, invoices, items, purchase_orders] = await Promise.all([
    fetchJson(customerUrl),
    fetchJson(ticketUrl),
    fetchJson(orderUrl),
    fetchJson(invoiceUrl),
    fetchJson(itemUrl),
    fetchJson(purchaseOrderUrl),
  ]);

  res.json({ customers, tickets, orders, invoices, items, purchase_orders });
}

interface OrderRow {
  id: number;
  document_number: string;
  type: string;
  customer_id: number;
  customer_name?: string;
  status: string;
  total: number;
  order_date?: string | null;
  created_at: string;
}

interface InvoiceRow {
  id: number;
  invoice_number: string;
  total: number;
  amount_paid?: number;
  paid_at?: string | null;
  invoice_date: string;
  balance_due?: number;
  customer_name?: string;
  order_document_number?: string;
}

interface TicketRow {
  id: number;
  status: string;
  subject: string;
  customer_name?: string | null;
  created_at?: string;
  updated_at?: string;
  update_count?: number;
  last_activity_at?: string;
}

interface PurchaseOrderRow {
  id: number;
  status: string;
  line_count?: number;
}

function trailingMonthKeys(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

function toMonthKey(dateStr: string): string | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const STALE_TICKET_MS = 14 * 24 * 60 * 60 * 1000;

async function dashboardSummary(req: AuthRequest, res: Response): Promise<void> {
  const authHeader = req.headers.authorization || '';
  const opts = { headers: { Authorization: authHeader } };
  const orderUrl = (process.env.ORDER_SERVICE_URL || 'http://localhost:3005') + '/api/app/orders';
  const quoteUrl = (process.env.ORDER_SERVICE_URL || 'http://localhost:3005') + '/api/app/quotes';
  const invoiceUrl = (process.env.INVOICE_SERVICE_URL || 'http://localhost:3006') + '/api/app/invoices';
  const ticketUrl = (process.env.TICKET_SERVICE_URL || 'http://localhost:3004') + '/api/app/tickets';
  const poUrl = (process.env.ORDER_SERVICE_URL || 'http://localhost:3005') + '/api/app/purchase-orders';

  const fetchJson = async <T>(url: string): Promise<T[]> => {
    try {
      const r = await fetch(url, opts);
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? (data as T[]) : [];
    } catch {
      return [];
    }
  };

  const [orders, quotes, invoices, tickets, purchaseOrders, heldDeposits] = await Promise.all([
    fetchJson<OrderRow>(orderUrl),
    fetchJson<OrderRow>(quoteUrl),
    fetchJson<InvoiceRow>(invoiceUrl),
    fetchJson<TicketRow>(ticketUrl),
    fetchJson<PurchaseOrderRow>(poUrl),
    (async () => {
      try {
        const r = await fetch((process.env.ORDER_SERVICE_URL || 'http://localhost:3005') + '/api/app/orders/deposits/held', opts);
        if (!r.ok) return { total: 0, deposits: [] as Array<{ amount: string; paid_at: string }> };
        return (await r.json()) as { total: number; deposits: Array<{ amount: string; paid_at: string }> };
      } catch {
        return { total: 0, deposits: [] as Array<{ amount: string; paid_at: string }> };
      }
    })(),
  ]);

  const openOrders = orders.filter((o) => o.type === 'order' && o.status !== 'closed').length;
  const openQuotes = quotes.filter((q) => q.status !== 'closed' && q.status !== 'converted').length;
  const openInvoicesList = invoices.filter((inv) => Number(inv.amount_paid ?? 0) < Number(inv.total));
  const openInvoices = openInvoicesList.length;
  const accountsReceivable = openInvoicesList.reduce(
    (sum, inv) => sum + Number(inv.balance_due ?? Number(inv.total) - Number(inv.amount_paid ?? 0)),
    0,
  );
  const openTickets = tickets.filter((t) => t.status !== 'Closed').length;
  const depositsHeld = Math.round(Number(heldDeposits.total || 0) * 100) / 100;

  const openPos = purchaseOrders.filter((po) => String(po.status).toLowerCase() !== 'closed' && String(po.status).toLowerCase() !== 'cancelled');
  const openPurchaseOrders = openPos.length;
  const openPurchaseOrderItems = openPos.reduce((sum, po) => sum + Number(po.line_count ?? 0), 0);

  const now = Date.now();
  const staleTickets = tickets.filter((t) => {
    if (t.status === 'Closed') return false;
    const updateCount = Number(t.update_count ?? 0);
    const last = new Date(t.last_activity_at || t.updated_at || t.created_at || 0).getTime();
    if (Number.isNaN(last)) return updateCount === 0;
    return updateCount === 0 || now - last > STALE_TICKET_MS;
  }).length;

  const monthKeys = trailingMonthKeys(12);
  const revenueMap = new Map(monthKeys.map((m) => [m, 0]));

  for (const inv of invoices) {
    const paid = Number(inv.amount_paid ?? 0);
    if (paid <= 0) continue;
    const dateStr = inv.paid_at || inv.invoice_date;
    const key = dateStr ? toMonthKey(dateStr) : null;
    if (key && revenueMap.has(key)) {
      revenueMap.set(key, (revenueMap.get(key) ?? 0) + paid);
    }
  }

  // Unapplied deposits count as cash/revenue in the month they were paid
  for (const d of heldDeposits.deposits || []) {
    const amt = Number(d.amount);
    if (amt <= 0) continue;
    const key = d.paid_at ? toMonthKey(d.paid_at) : null;
    if (key && revenueMap.has(key)) {
      revenueMap.set(key, (revenueMap.get(key) ?? 0) + amt);
    }
  }

  const revenueByMonth = monthKeys.map((month) => ({
    month,
    total: Math.round((revenueMap.get(month) ?? 0) * 100) / 100,
  }));

  const thisMonthKey = monthKeys[monthKeys.length - 1];
  const thisMonthRevenue = revenueByMonth.find((r) => r.month === thisMonthKey)?.total ?? 0;

  const recentOrders = orders
    .filter((o) => o.type === 'order')
    .slice(0, 5)
    .map((o) => ({
      id: o.id,
      document_number: o.document_number,
      customer_name: o.customer_name ?? '',
      status: o.status,
      total: Number(o.total),
      order_date: o.order_date,
    }));

  res.json({
    openOrders,
    openQuotes,
    openInvoices,
    accountsReceivable: Math.round(accountsReceivable * 100) / 100,
    depositsHeld,
    openTickets,
    openPurchaseOrders,
    openPurchaseOrderItems,
    staleTickets,
    thisMonthRevenue,
    revenueByMonth,
    recentOrders,
  });
}

router.use("/api/auth", authProxy);
router.get("/api/app/search", verifyToken, (req: Request, res: Response, next: NextFunction) => {
  searchAggregate(req as AuthRequest, res).catch(next);
});
router.get("/api/app/dashboard/summary", verifyToken, (req: Request, res: Response, next: NextFunction) => {
  dashboardSummary(req as AuthRequest, res).catch(next);
});
router.use("/api/app", verifyToken, pdfProxy, invoiceProxy, orderProxy, ticketProxy, customerProxy);

export default router;
