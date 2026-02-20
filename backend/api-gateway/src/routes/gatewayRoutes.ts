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

  const [customers, tickets, orders, invoices, items] = await Promise.all([
    fetchJson(customerUrl),
    fetchJson(ticketUrl),
    fetchJson(orderUrl),
    fetchJson(invoiceUrl),
    fetchJson(itemUrl),
  ]);

  res.json({ customers, tickets, orders, invoices, items });
}

router.use("/api/auth", authProxy);
router.get("/api/app/search", verifyToken, (req: Request, res: Response, next: NextFunction) => {
  searchAggregate(req as AuthRequest, res).catch(next);
});
router.use("/api/app", verifyToken, pdfProxy, invoiceProxy, orderProxy, ticketProxy, customerProxy);

export default router;
