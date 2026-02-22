import express from "express";
import * as paymentController from "../controllers/payment.controller.js";
import { userAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ─── Authenticated Routes ───
router.post("/create", userAuth, paymentController.createPayment);         // Initiate payment (logged-in only)

// ─── Public Routes ───
router.get("/verify/:cashfreeOrderId", paymentController.verifyPayment);   // Verify payment status
router.post("/webhook", paymentController.handleWebhook);                  // Cashfree webhook callback

export default router;
