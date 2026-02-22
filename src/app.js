import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import orderRoutes from "./routes/order.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import adminRoutes from "./routes/admin.routes.js";

import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { requestLogger } from "./middlewares/logger.middleware.js";

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

// ─── Middlewares ───
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ─── Health ───
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ─── Root ───
app.get("/", (req, res) => {
  res.json({
    message: "🔥 Source Code Selling Platform API",
    admin: "/api/admin",
  });
});

// ─── Routes ───
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

console.log("✅ Admin routes mounted");

// ─── Errors ───
app.use(notFoundHandler);
app.use(errorHandler);

export default app;