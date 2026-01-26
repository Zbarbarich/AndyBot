import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

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

router.use("/api/auth", authProxy);

export default router;
