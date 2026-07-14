require("dotenv").config();
import express from "express";
import cors from "cors";
import { userContext } from "./middleware/userContext";
import customerRoutes from "./routes/customerRoutes";

const app = express();
const PORT = process.env.PORT || 3003;

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
      "http://localhost:3003",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "x-user-context"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(userContext);

app.use("/api/app/customers", customerRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "customer-service" });
});

app.listen(PORT, () => {
  console.log(`Customer service running on http://localhost:${PORT}`);
});
