import * as paymentService from "../services/payment.service.js";
import * as orderService from "../services/order.service.js";
import * as productService from "../services/product.service.js";
import * as storageService from "../services/storage.service.js";
import { getCouponByCode, incrementCouponUse, getSettings, logActivity } from "../services/admin.service.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/payments/create — Initiate payment for a product
 *
 * Body: { product_id, buyer_email, buyer_name?, buyer_phone? }
 *
 * This endpoint is public; authentication is NOT required.  Order records
 * no longer track `user_id` to avoid foreign-key errors when customers
 * sign in through a different auth system or remain anonymous.
 */
export const createPayment = async (req, res) => {
  try {
    const { product_id, buyer_email, coupon_code } = req.body;

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

    // compute discount if coupon provided
    let discount = 0;
    let coupon = null;
    if (coupon_code) {
      coupon = await getCouponByCode(coupon_code.trim().toUpperCase());
      if (!coupon) return sendError(res, "Coupon not found", 404);
      if (!coupon.active) return sendError(res, "Coupon inactive", 400);
      if (coupon.expiry && new Date(coupon.expiry) < new Date()) return sendError(res, "Coupon expired", 400);
      if (coupon.max_uses && coupon.uses >= coupon.max_uses) return sendError(res, "Coupon use limit reached", 400);
      if (coupon.type === "percent") discount = Math.round((product.price * (coupon.discount || 0)) / 100);
      else discount = coupon.discount || 0;
      if (discount > product.price) discount = product.price;
    }

    // Generate unique public reference for manual QR payment
    const cashfreeOrderId = `QR_${Date.now()}_${uuidv4().slice(0, 8)}`;

    // Create order in DB
    console.log('creating order with coupon', coupon_code, 'discount', discount);
    const order = await orderService.createOrder({
      product_id,
      buyer_email,
      cashfree_order_id: cashfreeOrderId,
      coupon_code: coupon ? coupon.code : null,
      discount_amount: discount,
    });

    if (coupon) {
      await incrementCouponUse(coupon.id);
    }

    const paymentSettings = await getSettings("payment_");
    const qrImagePath = paymentSettings.payment_qr_image_path || "";
    let qrCodeUrl = paymentSettings.payment_qr_code_url || "";
    if (!qrCodeUrl && qrImagePath) {
      qrCodeUrl = await storageService.getSignedFileUrl(qrImagePath, 24 * 60 * 60);
    }
    const upiId = paymentSettings.payment_upi_id || "";
    const paymentInstructions =
      paymentSettings.payment_instructions ||
      "QR scan करके payment करें और UTR number submit करें. Payment admin verify होने के बाद approve होगा.";

    const setupMissing = !qrCodeUrl && !upiId;

    const amountToPay = Math.max((product.price || 0) - discount, 0);

    await orderService.updateOrderPaymentMeta(order.id, {
      payment_method: "QR_MANUAL",
      paid_amount: amountToPay,
      qr_code_url: qrImagePath || qrCodeUrl || null,
      verification_status: "PENDING",
    });

    return sendSuccess(
      res,
      {
        order_id: order.id,
        cashfree_order_id: cashfreeOrderId,
        payment_session_id: null,
        payment_link: null,
        order_status: "PENDING",
        payment_status: "pending",
        verification_status: "pending",
        amount: amountToPay,
        product_name: product.name,
        qr_code_url: qrCodeUrl,
        upi_id: upiId,
        payment_instructions: paymentInstructions,
        setup_missing: setupMissing,
      },
      setupMissing
        ? "Payment initiated. QR/UPI setup pending by admin. Please contact support."
        : "QR payment initiated successfully",
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

    const order = await orderService.getOrderByRef(cashfreeOrderId);
    if (!order) {
      return sendError(res, "Order not found", 404);
    }

    const paymentSettings = await getSettings("payment_");
    const qrImagePath = paymentSettings.payment_qr_image_path || "";
    let resolvedQrUrl = order.qr_code_url || paymentSettings.payment_qr_code_url || "";
    if (resolvedQrUrl && !/^https?:\/\//i.test(resolvedQrUrl)) {
      resolvedQrUrl = await storageService.getSignedFileUrl(resolvedQrUrl, 24 * 60 * 60);
    }
    if (!resolvedQrUrl && qrImagePath) {
      resolvedQrUrl = await storageService.getSignedFileUrl(qrImagePath, 24 * 60 * 60);
    }

    return sendSuccess(res, {
      order_id: order.id,
      cashfree_order_id: cashfreeOrderId,
      payment_status: order.payment_status,
      verification_status: order.verification_status,
      cashfree_status: order.payment_status,
      order_amount: order.amount,
      paid_amount: order.paid_amount,
      utr_number: order.utr_number,
      transaction_id: order.transaction_id || null,
      payment_note: order.payment_note || null,
      rejection_reason: order.rejection_reason || null,
      qr_code_url: resolvedQrUrl,
      upi_id: paymentSettings.payment_upi_id || "",
      payment_instructions: paymentSettings.payment_instructions || "",
      product: order.products || order.product || null,
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

    const order = await orderService.getOrderByRef(orderId);

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
 * POST /api/payments/submit-proof — submit UTR + amount for manual verification
 */
export const submitManualProof = async (req, res) => {
  try {
    const { order_ref, utr_number, transaction_id, paid_amount, payment_note } = req.body;

    if (!order_ref || !utr_number || !transaction_id || paid_amount == null) {
      return sendError(res, "order_ref, utr_number, transaction_id and paid_amount are required", 400);
    }

    const amount = Number(paid_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return sendError(res, "paid_amount must be a valid positive number", 400);
    }

    const utr = String(utr_number).trim();
    const txn = String(transaction_id).trim();
    if (!/^[a-zA-Z0-9]{6,30}$/.test(utr)) {
      return sendError(res, "Invalid UTR number format", 400);
    }
    if (!/^[a-zA-Z0-9_-]{6,40}$/.test(txn)) {
      return sendError(res, "Invalid transaction_id format", 400);
    }

    const updated = await orderService.submitManualPaymentProof(order_ref, {
      utr_number: utr,
      transaction_id: txn,
      paid_amount: amount,
      payment_note: payment_note || null,
    });

    return sendSuccess(
      res,
      updated,
      "Payment details submitted successfully. Admin verification pending."
    );
  } catch (error) {
    console.error("❌ Submit payment proof error:", error.message);
    return sendError(res, "Failed to submit payment proof", 500, error.message);
  }
};

/**
 * PATCH /api/payments/admin/review/:orderId — approve or reject manual payment
 */
export const reviewManualPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, admin_note, rejection_reason, approved_amount } = req.body;

    if (!orderId || !action) {
      return sendError(res, "orderId and action are required", 400);
    }

    const updated = await orderService.reviewManualPayment(orderId, {
      action,
      admin_note,
      rejection_reason,
      approved_amount,
    });

    await logActivity(
      "Payment Reviewed",
      "Admin",
      `Order ${orderId} ${String(action).toLowerCase()}`,
      "payment"
    );

    return sendSuccess(res, updated, `Payment ${String(action).toLowerCase()} successfully`);
  } catch (error) {
    console.error("❌ Review manual payment error:", error.message);
    return sendError(res, "Failed to review payment", 500, error.message);
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