// API Gateway Service
// Acts as a reverse proxy and authentication layer for microservices
// Routes requests to appropriate services based on URL path
// Handles CORS and basic middleware setup
// Protects app routes with JWT verification
// Public routes (/api/auth/*) remain accessible without authentication

require("dotenv").config();
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import gatewayRoutes from "./routes/gatewayRoutes";

const app = express();
const PORT = process.env.PORT || 3000;

// Verify environment variables are loaded
console.log("Auth Service URL:", process.env.AUTH_SERVICE_URL);

// Configure CORS: dev origins + production origin from env (e.g. https://yourdomain.com)
const corsOrigins: string[] = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost",
  "http://127.0.0.1",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];
const corsOriginEnv = process.env.CORS_ORIGIN;
if (corsOriginEnv) {
  corsOrigins.push(...corsOriginEnv.split(",").map((s) => s.trim()).filter(Boolean));
}
app.use(
  cors({
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
  })
);

// Allow larger payloads for ticket image/attachment uploads (base64 in JSON)
app.use(express.json({ limit: "10mb" }));
app.use("/", gatewayRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Global error:", err);
  res
    .status(500)
    .json({ error: "Internal Server Error", details: err.message });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on http://localhost:${PORT}`);
});
