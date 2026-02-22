import * as orderService from "../services/order.service.js";
import * as storageService from "../services/storage.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

/**
 * POST /api/orders — Create a new order (public)
 */
export const createOrder = async (req, res) => {
  try {
    const { product_id, buyer_email } = req.body;

    if (!product_id || !buyer_email) {
      return sendError(res, "product_id and buyer_email are required", 400);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyer_email)) {
      return sendError(res, "Invalid email address", 400);
    }

    const order = await orderService.createOrder({ product_id, buyer_email });
    return sendSuccess(res, order, "Order created successfully", 201);
  } catch (error) {
    return sendError(res, "Failed to create order", 500, error.message);
  }
};

/**
 * GET /api/orders/:id — Get order by ID
 */
export const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);
    return sendSuccess(res, order, "Order fetched successfully");
  } catch (error) {
    return sendError(res, "Order not found", 404, error.message);
  }
};

/**
 * GET /api/orders/email/:email — Get orders by buyer email
 */
export const getOrdersByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const orders = await orderService.getOrdersByEmail(email);
    return sendSuccess(res, orders, "Orders fetched successfully");
  } catch (error) {
    return sendError(res, "Failed to fetch orders", 500, error.message);
  }
};

/**
 * GET /api/orders/admin/all — Get all orders (admin)
 */
export const getAllOrders = async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    return sendSuccess(res, orders, "All orders fetched");
  } catch (error) {
    return sendError(res, "Failed to fetch orders", 500, error.message);
  }
};

/**
 * GET /api/orders/admin/stats — Order stats (admin)
 */
export const getOrderStats = async (req, res) => {
  try {
    const stats = await orderService.getOrderStats();
    return sendSuccess(res, stats, "Order stats fetched");
  } catch (error) {
    return sendError(res, "Failed to fetch stats", 500, error.message);
  }
};

/**
 * GET /api/orders/:id/download — Download ZIP for paid order
 */
export const downloadOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.query;

    if (!email) {
      return sendError(res, "email query parameter is required", 400);
    }

    const order = await orderService.getOrderById(id);

    if (!order) {
      return sendError(res, "Order not found", 404);
    }

    if (order.buyer_email !== email) {
      return sendError(res, "Email does not match this order", 403);
    }

    if ((order.payment_status || "").toLowerCase() !== "paid") {
      return sendError(res, "Payment not completed. Cannot download.", 403);
    }

    if (!order.products?.zip_path) {
      return sendError(res, "No downloadable file for this product", 404);
    }

    const downloadUrl = await storageService.getSignedDownloadUrl(order.products.zip_path);
    return sendSuccess(res, { download_url: downloadUrl }, "Download URL generated");
  } catch (error) {
    return sendError(res, "Failed to generate download link", 500, error.message);
  }
};
