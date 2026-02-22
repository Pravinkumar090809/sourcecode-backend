import express from "express";
import cors from "cors";

import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { requestLogger } from "./middlewares/logger.middleware.js";

// ✅ ESM-safe absolute imports for routes
import authRoutes from new URL("./routes/auth.routes.js", import.meta.url);
import productRoutes from new URL("./routes/product.routes.js", import.meta.url);
import orderRoutes from new URL("./routes/order.routes.js", import.meta.url);
import paymentRoutes from new URL("./routes/payment.routes.js", import.meta.url);
import adminRoutes from new URL("./routes/admin.routes.js", import.meta.url);

const app = express();

// ─── CORS ───
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      if (/\.(vercel\.app|onrender\.com)$/.test(origin)) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

// ─── Global Middlewares ───
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ─── Health & Root ───
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "🔥 Source Code Selling Platform API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      auth: "/api/auth",
      products: "/api/products",
      orders: "/api/orders",
      payments: "/api/payments",
      admin: "/api/admin",
    },
  });
});

// ─── API Routes ───
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

console.log("✅ Admin routes mounted at /api/admin");

// ─── Error Handling ───
app.use(notFoundHandler);
app.use(errorHandler);

export default app;