require("dotenv").config();
import express from "express";
import cors from "cors";
import { userContext } from "./middleware/userContext";
import invoiceRoutes from "./routes/invoiceRoutes";
import orderInvoiceRoutes from "./routes/orderInvoiceRoutes";

const app = express();
const PORT = process.env.PORT || 3006;

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
      "http://localhost:3006",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "x-user-context"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(userContext);

app.use("/api/app/invoices", invoiceRoutes);
app.use("/api/app/orders", orderInvoiceRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "invoice-service" });
});

app.listen(PORT, () => {
  console.log(`Invoice service running on http://localhost:${PORT}`);
});
