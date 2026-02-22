import cashfreeConfig from "../config/cashfree.js";
import * as orderService from "./order.service.js";
import crypto from "crypto";

/**
 * Create a Cashfree payment order
 */
export const createCashfreeOrder = async ({ orderId, amount, customerEmail, customerPhone, customerName, returnUrl }) => {
  const requestBody = {
    order_id: orderId,
    order_amount: amount,
    order_currency: "INR",
    customer_details: {
      customer_id: customerEmail.replace(/[^a-zA-Z0-9]/g, "_"),
      customer_email: customerEmail,
      customer_phone: customerPhone || "9999999999",
      customer_name: customerName || "Customer",
    },
    order_meta: {
      return_url: returnUrl || `${process.env.FRONTEND_URL}/payment/status?order_id={order_id}`,
    },
  };

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
    throw new Error(data.message || `Cashfree API error: ${response.status}`);
  }

  return data;
};

/**
 * Verify Cashfree payment status
 */
export const verifyCashfreePayment = async (cashfreeOrderId) => {
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
    throw new Error(data.message || `Cashfree verification error: ${response.status}`);
  }

  return data;
};

/**
 * Verify Cashfree webhook signature
 */
export const verifyWebhookSignature = (rawBody, timestamp, signature) => {
  const body = timestamp + rawBody;
  const expectedSignature = crypto
    .createHmac("sha256", cashfreeConfig.secretKey)
    .update(body)
    .digest("base64");

  return expectedSignature === signature;
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

  let paymentStatus = "PENDING";
  if (orderStatus === "PAID") {
    paymentStatus = "PAID";
  } else if (orderStatus === "EXPIRED" || orderStatus === "CANCELLED") {
    paymentStatus = "FAILED";
  }

  // Update order in database
  const updatedOrder = await orderService.updateOrderStatusByCashfreeId(
    cashfreeOrderId,
    paymentStatus
  );

  return {
    cashfree_order_id: cashfreeOrderId,
    payment_status: paymentStatus,
    order: updatedOrder,
  };
};
