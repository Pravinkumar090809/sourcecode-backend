import express from "express";
import * as orderController from "../controllers/order.controller.js";
import { adminAuth } from "../middlewares/admin.middleware.js";

const router = express.Router();

// ─── Admin Routes (must come before /:id to avoid route conflict) ───
router.get("/admin/all", adminAuth, orderController.getAllOrders);         // All orders
router.get("/admin/stats", adminAuth, orderController.getOrderStats);     // Stats

// ─── Public Routes ───
router.post("/", orderController.createOrder);                    // Create order
router.get("/email/:email", orderController.getOrdersByEmail);    // Get orders by email
router.get("/:id", orderController.getOrder);                     // Get order by ID
router.get("/:id/download", orderController.downloadOrder);       // Download (paid only)

export default router;
