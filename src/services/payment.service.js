import cashfreeConfig from "../config/cashfree.js";
import * as orderService from "./order.service.js";
import crypto from "crypto";

/**
 * Create a Cashfree payment order
 */
export const createCashfreeOrder = async ({ 
  orderId, 
  amount, 
  customerEmail, 
  customerPhone, 
  customerName,
  urls = {}, // { returnUrl, notifyUrl }
}) => {
  // compute return/notify urls with fallbacks
  const returnUrl = urls.returnUrl || `${process.env.FRONTEND_URL}/payment/processing?order_id=${orderId}`;
  const notifyUrl = urls.notifyUrl || `${process.env.BACKEND_URL || process.env.FRONTEND_URL}/api/payments/webhook`;

  const requestBody = {
    order_id: orderId,
    order_amount: parseFloat(amount),
    order_currency: "INR",
    customer_details: {
      customer_id: customerEmail.replace(/[^a-zA-Z0-9]/g, "_"),
      customer_email: customerEmail,
      customer_phone: customerPhone || "9999999999",
      customer_name: customerName || "Customer",
    },
    order_meta: {
      return_url: returnUrl,
      notify_url: notifyUrl,
    },
  };

  console.log("📤 Creating Cashfree order:", orderId);

  const response = await fetch(`${cashfreeConfig.apiUrl}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": cashfreeConfig.appId,
      "x-client-secret": cashfreeConfig.secretKey,
      "x-api-version": "2023-08-01",
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("❌ Cashfree Error:", data);
    throw new Error(data.message || `Cashfree API error: ${response.status}`);
  }

  console.log("✅ Cashfree order created:", data.order_id);

  return {
    payment_session_id: data.payment_session_id,
    order_status: data.order_status,
    payment_link: data.payment_link || null,
  };
};

/**
 * Verify Cashfree payment status
 */
export const verifyCashfreePayment = async (cashfreeOrderId) => {
  console.log("🔍 Verifying payment for order:", cashfreeOrderId);

  const response = await fetch(`${cashfreeConfig.apiUrl}/orders/${cashfreeOrderId}`, {
    method: "GET",
    headers: {
      "x-client-id": cashfreeConfig.appId,
      "x-client-secret": cashfreeConfig.secretKey,
      "x-api-version": "2023-08-01",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("❌ Cashfree Verify Error:", data);
    throw new Error(data.message || `Cashfree verification error: ${response.status}`);
  }

  console.log("✅ Payment verified:", data.order_status);

  return {
    order_status: data.order_status,
    order_amount: data.order_amount,
    payment_details: data.payments || [],
  };
};

/**
 * Verify Cashfree webhook signature
 */
export const verifyWebhookSignature = (rawBody, timestamp, signature) => {
  try {
    const signatureData = timestamp + rawBody;
    const expectedSignature = crypto
      .createHmac("sha256", cashfreeConfig.secretKey)
      .update(signatureData)
      .digest("base64");

    const isValid = expectedSignature === signature;
    console.log(isValid ? "✅ Webhook signature valid" : "❌ Webhook signature invalid");
    
    return isValid;
  } catch (error) {
    console.error("❌ Signature verification failed:", error.message);
    return false;
  }
};

/**
 * Process webhook event from Cashfree
 */
export const processWebhook = async (webhookData) => {
  const { order, payment } = webhookData.data || {};

  if (!order?.order_id) {
    throw new Error("Invalid webhook data — missing order_id");
  }

  const cashfreeOrderId = order.order_id;
  const orderStatus = order.order_status;

  console.log(`📨 Webhook received for order: ${cashfreeOrderId}, status: ${orderStatus}`);

  let paymentStatus = "PENDING";
  
  if (orderStatus === "PAID") {
    paymentStatus = "PAID";
  } else if (["EXPIRED", "CANCELLED", "TERMINATED"].includes(orderStatus)) {
    paymentStatus = "FAILED";
  } else if (orderStatus === "ACTIVE") {
    paymentStatus = "PENDING";
  }

  const updatedOrder = await orderService.updateOrderStatusByCashfreeId(
    cashfreeOrderId,
    paymentStatus
  );

  console.log(`✅ Order updated: ${cashfreeOrderId} → ${paymentStatus}`);

  return {
    cashfree_order_id: cashfreeOrderId,
    payment_status: paymentStatus,
    order: updatedOrder,
  };
};