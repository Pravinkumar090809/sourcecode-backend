import express from "express";
import * as paymentController from "../controllers/payment.controller.js";
import { userAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/payments/create
 * @desc    Create a new payment order
 * @access  Public
 */
router.post("/create", userAuth, paymentController.createPayment);

/**
 * @route   GET /api/payments/verify/:cashfreeOrderId
 * @desc    Verify payment status
 * @access  Public
 */
router.get("/verify/:cashfreeOrderId", paymentController.verifyPayment);

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle Cashfree webhook
 * @access  Public (but signature verified)
 */
router.post("/webhook", paymentController.handleWebhook);

/**
 * @route   GET /api/payments/order/:orderId
 * @desc    Get order details by ID
 * @access  Public
 */
router.get("/order/:orderId", paymentController.getOrderDetails);

/**
 * @route   GET /api/payments/orders/email/:email
 * @desc    Get all orders by buyer email
 * @access  Public
 */
router.get("/orders/email/:email", paymentController.getOrdersByEmail);

export default router;