import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";

const app = express();
const PORT = process.env.PORT || 3001;

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

// Add logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log("Auth service received request:", req.method, req.url);
  next();
});

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set in environment variables");
  process.exit(1);
}

// Start server - database connection is tested in db.ts
app.listen(PORT, () => {
  console.log(`Auth Service running on http://localhost:${PORT}`);
});
