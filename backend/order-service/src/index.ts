require("dotenv").config();
import express from "express";
import cors from "cors";
import { userContext } from "./middleware/userContext";
import itemRoutes from "./routes/itemRoutes";
import quoteRoutes from "./routes/quoteRoutes";
import orderRoutes from "./routes/orderRoutes";
import purchaseOrderRoutes from "./routes/purchaseOrderRoutes";

const app = express();
const PORT = process.env.PORT || 3005;

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
      "http://localhost:3005",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "x-user-context"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(userContext);

app.use("/api/app/items", itemRoutes);
app.use("/api/app/quotes", quoteRoutes);
app.use("/api/app/orders", orderRoutes);
app.use("/api/app/purchase-orders", purchaseOrderRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "order-service" });
});

app.listen(PORT, () => {
  console.log(`Order service running on http://localhost:${PORT}`);
});
