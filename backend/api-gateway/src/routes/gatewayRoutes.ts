import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { verifyToken, AuthRequest } from '../middleware/authMiddleware';

const router = express.Router();

// Add logging middleware
router.use((req: Request, res: Response, next: NextFunction) => {
  console.log("Gateway received request:", req.method, req.path);
  next();
});

// Proxy configuration for Auth Service
const authProxy = createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '/api/auth',
  },
  onProxyReq: (proxyReq, req: Request, res: Response) => {
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

// App service proxy: require JWT and forward user context
const appProxy = createProxyMiddleware({
  target: process.env.APP_SERVICE_URL || 'http://localhost:3002',
  changeOrigin: true,
  pathRewrite: {
    '^/api/app': '/api/app',
  },
  onProxyReq: (proxyReq, req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    if (authReq.user) {
      proxyReq.setHeader('x-user-context', JSON.stringify(authReq.user));
    }
    if (req.body && req.body instanceof Buffer) {
      proxyReq.write(req.body);
    } else if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader("Content-Type", "application/json");
      proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err: Error, req: Request, res: Response) => {
    console.error("App Proxy error:", err);
    res.status(500).json({ error: "Proxy error", details: err.message });
  },
});

router.use("/api/auth", authProxy);
router.use("/api/app", verifyToken, appProxy);

export default router;
