import * as paymentService from "../services/payment.service.js";
import * as orderService from "../services/order.service.js";
import * as productService from "../services/product.service.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/payments/create — Initiate payment for a product
 *
 * Body: { product_id, buyer_email, buyer_name?, buyer_phone? }
 */
export const createPayment = async (req, res) => {
  try {
    const { product_id, buyer_email, buyer_name, buyer_phone } = req.body;

    if (!product_id || !buyer_email) {
      return sendError(res, "product_id and buyer_email are required", 400);
    }

    // ensure product_id looks like a UUID to avoid db errors
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(product_id)) {
      return sendError(res, "Invalid product_id format", 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyer_email)) {
      return sendError(res, "Invalid email format", 400);
    }

    // Validate product
    const product = await productService.getProductById(product_id);
    if (!product || !product.is_active) {
      return sendError(res, "Product not found or inactive", 404);
    }

    // Generate unique order ID for Cashfree
    const cashfreeOrderId = `CF_${Date.now()}_${uuidv4().slice(0, 8)}`;

    // Create order in DB
    const order = await orderService.createOrder({
      product_id,
      buyer_email,
      cashfree_order_id: cashfreeOrderId,
      user_id: req.user && req.user.id,
    });

    // Create Cashfree order (provide urls based on request in case env vars not set)
    const backendBase = `${req.protocol}://${req.get("host")}`;
    const returnUrl = `${process.env.FRONTEND_URL || backendBase}/payment/processing?order_id=${cashfreeOrderId}`;
    const notifyUrl = `${backendBase}/api/payments/webhook`;

    console.log("🔧 URLs for cashfree:", { backendBase, returnUrl, notifyUrl, front: process.env.FRONTEND_URL, backEnv: process.env.BACKEND_URL });

    const cashfreeOrder = await paymentService.createCashfreeOrder({
      orderId: cashfreeOrderId,
      amount: product.price,
      customerEmail: buyer_email,
      customerPhone: buyer_phone,
      customerName: buyer_name,
      urls: { returnUrl, notifyUrl },
    });

    return sendSuccess(
      res,
      {
        order_id: order.id,
        cashfree_order_id: cashfreeOrderId,
        payment_session_id: cashfreeOrder.payment_session_id,
        payment_link: cashfreeOrder.payment_link,
        order_status: cashfreeOrder.order_status,
        amount: product.price,
        product_name: product.name,
      },
      "Payment initiated successfully",
      201
    );
  } catch (error) {
    console.error("❌ Create payment error:", error.message);
    return sendError(res, "Failed to create payment", 500, error.message);
  }
};

/**
 * GET /api/payments/verify/:cashfreeOrderId — Verify payment status
 */
export const verifyPayment = async (req, res) => {
  try {
    const { cashfreeOrderId } = req.params;

    if (!cashfreeOrderId) {
      return sendError(res, "cashfreeOrderId is required", 400);
    }

    // Verify with Cashfree
    const cashfreeStatus = await paymentService.verifyCashfreePayment(cashfreeOrderId);

    // Map status
    let paymentStatus = "PENDING";
    if (cashfreeStatus.order_status === "PAID") {
      paymentStatus = "PAID";
    } else if (["EXPIRED", "CANCELLED", "TERMINATED"].includes(cashfreeStatus.order_status)) {
      paymentStatus = "FAILED";
    }

    // Update our DB
    const order = await orderService.updateOrderStatusByCashfreeId(
      cashfreeOrderId,
      paymentStatus
    );

    return sendSuccess(res, {
      order_id: order.id,
      cashfree_order_id: cashfreeOrderId,
      payment_status: paymentStatus,
      cashfree_status: cashfreeStatus.order_status,
      order_amount: cashfreeStatus.order_amount,
      product: order.product,
    }, "Payment status verified");
  } catch (error) {
    console.error("❌ Verify payment error:", error.message);
    return sendError(res, "Failed to verify payment", 500, error.message);
  }
};

/**
 * POST /api/payments/webhook — Cashfree webhook handler
 */
export const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];

    // Verify signature if present
    if (signature && timestamp) {
      const rawBody = req.rawBody || JSON.stringify(req.body);
      const isValid = paymentService.verifyWebhookSignature(rawBody, timestamp, signature);
      
      if (!isValid) {
        console.warn("⚠️ Invalid webhook signature");
        return res.status(200).json({ success: false, message: "Invalid signature" });
      }
    }

    // Process the webhook
    const result = await paymentService.processWebhook(req.body);
    
    console.log(`✅ Webhook processed: ${result.cashfree_order_id} → ${result.payment_status}`);

    // Cashfree expects 200 OK
    return res.status(200).json({ 
      success: true,
      message: "Webhook processed successfully" 
    });
  } catch (error) {
    console.error("❌ Webhook error:", error.message);
    // Still return 200 so Cashfree doesn't retry
    return res.status(200).json({ 
      success: false, 
      error: error.message 
    });
  }
};

/**
 * GET /api/payments/order/:orderId — Get order details
 */
export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await orderService.getOrderById(orderId);

    if (!order) {
      return sendError(res, "Order not found", 404);
    }

    return sendSuccess(res, order, "Order fetched successfully");
  } catch (error) {
    console.error("❌ Get order error:", error.message);
    return sendError(res, "Failed to fetch order", 500, error.message);
  }
};

/**
 * GET /api/payments/orders/email/:email — Get orders by email
 */
export const getOrdersByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    const orders = await orderService.getOrdersByEmail(email);

    return sendSuccess(res, orders, "Orders fetched successfully");
  } catch (error) {
    console.error("❌ Get orders by email error:", error.message);
    return sendError(res, "Failed to fetch orders", 500, error.message);
  }
};