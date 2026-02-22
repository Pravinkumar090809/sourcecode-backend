import express from "express";
import cors from "cors";

import productRoutes from "./routes/product.routes.js";
import orderRoutes from "./routes/order.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { requestLogger } from "./middlewares/logger.middleware.js";

const app = express();

// ─── CORS — allow frontend origins ───
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, Postman, webhooks)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // Also allow any *.vercel.app or *.onrender.com
      if (/\.(vercel\.app|onrender\.com)$/.test(origin)) return cb(null, true);
      cb(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

// ─── Global Middleware ───
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ─── Health Check ───
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || "development",
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

// ─── Error Handling ───
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
