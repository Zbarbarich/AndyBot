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

// Configure CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost",
      "http://127.0.0.1",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
  })
);

app.use(express.json());
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
