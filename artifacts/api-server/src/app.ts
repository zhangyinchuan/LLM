import express from "express";
import cors from "cors";
import compression from "compression";
import proxyRouter from "./routes/proxy.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount proxy routes
app.use("/v1", proxyRouter);

// Start server
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/healthz`);
  console.log(`Models endpoint: http://localhost:${PORT}/v1/models`);
  console.log(`Chat completions: http://localhost:${PORT}/v1/chat/completions`);
});

export default app;
