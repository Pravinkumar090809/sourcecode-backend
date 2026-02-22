import express from "express";
import * as paymentController from "../controllers/payment.controller.js";

const router = express.Router();

// ─── Public Routes ───
router.post("/create", paymentController.createPayment);                // Initiate payment
router.get("/verify/:cashfreeOrderId", paymentController.verifyPayment); // Verify payment
router.post("/webhook", paymentController.handleWebhook);               // Cashfree webhook

export default router;
