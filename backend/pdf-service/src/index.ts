require("dotenv").config();
import express from "express";
import cors from "cors";
import { userContext } from "./middleware/userContext";
import pdfRoutes from "./routes/pdfRoutes";

const app = express();
const PORT = process.env.PORT || 3007;

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
      "http://localhost:3007",
    ],
    methods: ["GET", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "x-user-context"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(userContext);

app.use("/api/app", pdfRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "pdf-service" });
});

app.listen(PORT, () => {
  console.log(`PDF service running on http://localhost:${PORT}`);
});
