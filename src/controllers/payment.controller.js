import * as paymentService from "../services/payment.service.js";
import * as orderService from "../services/order.service.js";
import * as productService from "../services/product.service.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/payments/create — Initiate payment for a product
 *
 * Body: { product_id, buyer_email, buyer_name?, buyer_phone? }
 * 
 * Flow:
 * 1. Validate product exists
 * 2. Create DB order (PENDING)
 * 3. Create Cashfree order
 * 4. Update DB order with cashfree_order_id
 * 5. Return payment session link
 */
export const createPayment = async (req, res) => {
  try {
    const { product_id, buyer_email, buyer_name, buyer_phone } = req.body;

    if (!product_id || !buyer_email) {
      return sendError(res, "product_id and buyer_email are required", 400);
    }

    // 1. Validate product
    const product = await productService.getProductById(product_id);
    if (!product || !product.is_active) {
      return sendError(res, "Product not found or inactive", 404);
    }

    // 2. Generate unique order ID for Cashfree
    const cashfreeOrderId = `CF_${Date.now()}_${uuidv4().slice(0, 8)}`;

    // 3. Create order in DB
    const order = await orderService.createOrder({
      product_id,
      buyer_email,
      cashfree_order_id: cashfreeOrderId,
    });

    // 4. Create Cashfree order
    const cashfreeOrder = await paymentService.createCashfreeOrder({
      orderId: cashfreeOrderId,
      amount: product.price,
      customerEmail: buyer_email,
      customerPhone: buyer_phone,
      customerName: buyer_name,
    });

    return sendSuccess(
      res,
      {
        order_id: order.id,
        cashfree_order_id: cashfreeOrderId,
        payment_session_id: cashfreeOrder.payment_session_id,
        payment_link: cashfreeOrder.payment_link || null,
        order_status: cashfreeOrder.order_status,
      },
      "Payment initiated successfully",
      201
    );
  } catch (error) {
    return sendError(res, "Failed to create payment", 500, error.message);
  }
};

/**
 * GET /api/payments/verify/:cashfreeOrderId — Verify payment status
 */
export const verifyPayment = async (req, res) => {
  try {
    const { cashfreeOrderId } = req.params;

    // Verify with Cashfree
    const cashfreeStatus = await paymentService.verifyCashfreePayment(cashfreeOrderId);

    // Map status
    let paymentStatus = "PENDING";
    if (cashfreeStatus.order_status === "PAID") {
      paymentStatus = "PAID";
    } else if (["EXPIRED", "CANCELLED", "ERROR"].includes(cashfreeStatus.order_status)) {
      paymentStatus = "FAILED";
    }

    // Update our DB
    const order = await orderService.updateOrderStatusByCashfreeId(cashfreeOrderId, paymentStatus);

    return sendSuccess(res, {
      order_id: order.id,
      cashfree_order_id: cashfreeOrderId,
      payment_status: paymentStatus,
      cashfree_status: cashfreeStatus.order_status,
    }, "Payment status verified");
  } catch (error) {
    return sendError(res, "Failed to verify payment", 500, error.message);
  }
};

/**
 * POST /api/payments/webhook — Cashfree webhook handler
 * 
 * Cashfree sends payment status updates here
 */
export const handleWebhook = async (req, res) => {
  try {
    // Verify signature if present
    const signature = req.headers["x-cashfree-signature"];
    const timestamp = req.headers["x-cashfree-timestamp"];

    if (signature && timestamp) {
      const rawBody = JSON.stringify(req.body);
      const isValid = paymentService.verifyWebhookSignature(rawBody, timestamp, signature);
      if (!isValid) {
        console.warn("⚠️ Invalid webhook signature");
        return sendError(res, "Invalid signature", 401);
      }
    }

    // Process the webhook
    const result = await paymentService.processWebhook(req.body);
    console.log(`✅ Webhook processed: ${result.cashfree_order_id} → ${result.payment_status}`);

    // Cashfree expects 200 OK
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Webhook error:", error.message);
    // Still return 200 so Cashfree doesn't retry
    return res.status(200).json({ success: false, error: error.message });
  }
};
