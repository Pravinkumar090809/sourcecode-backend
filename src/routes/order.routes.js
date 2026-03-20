import express from "express";
import * as orderController from "../controllers/order.controller.js";
import { adminAuth } from "../middlewares/admin.middleware.js";
import { userAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ─── Admin Routes (must come before /:id to avoid route conflict) ───
router.get("/admin/all", adminAuth, orderController.getAllOrders);         // All orders
router.get("/admin/stats", adminAuth, orderController.getOrderStats);     // Stats
router.patch("/admin/:id/payment-review", adminAuth, orderController.reviewOrderPayment); // Approve/Reject payment

// ─── Authenticated Routes (require logged-in user) ───
router.post("/", userAuth, orderController.createOrder);                    // Create order
router.get("/email/:email", userAuth, orderController.getOrdersByEmail);    // Get orders by email
router.get("/:id/download", userAuth, orderController.downloadOrder);       // Download (paid only)

// ─── Public Routes ───
router.get("/:id", orderController.getOrder);                               // Get order by ID (for payment verify)

export default router;
