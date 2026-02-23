import * as orderService from "../services/order.service.js";
import * as storageService from "../services/storage.service.js";
import * as productService from "../services/product.service.js";
import * as adminService from "../services/admin.service.js";
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

    const order = await orderService.createOrder({ product_id, buyer_email, user_id: req.user && req.user.id });
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
    // ensure user is only accessing their own orders
    if (req.user && req.user.email && req.user.email !== email) {
      return sendError(res, "Forbidden", 403);
    }

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
 * GET /api/download?productId=<id>
 * used by frontend to request download from Supabase for a specific product
 */
export const downloadByProduct = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return sendError(res, "Access denied. No token provided.", 401);
    }

    const { productId } = req.query;
    if (!productId) {
      return sendError(res, "productId query parameter is required", 400);
    }

    // verify product exists and active
    const product = await productService.getProductById(productId);
    if (!product) {
      return sendError(res, "Product not found", 404);
    }

    // fetch paid order for this user/product
    const order = await orderService.getPaidOrderForUserProduct(userId, productId);
    if (!order) {
      return sendError(res, "No paid order found for this product", 403);
    }

    const max = order.max_downloads || 1;
    const used = order.downloads_used || 0;
    if (used >= max) {
      return sendError(res, "Download limit exceeded", 403);
    }

    if (!product.zip_path) {
      return sendError(res, "No downloadable file for this product", 404);
    }

    const downloadUrl = await storageService.getSignedDownloadUrl(product.zip_path);

    // increment and log
    await orderService.incrementDownloads(order.id);
    await adminService.logDownload({
      user_email: req.user.email || "",
      user_name: req.user.name || "",
      product_id: productId,
      product_title: product.title || "",
      file_name: product.zip_path,
      ip_address: req.ip || req.connection.remoteAddress || "",
    });

    return sendSuccess(res, { download_url: downloadUrl }, "Download URL generated");
  } catch (error) {
    return sendError(res, "Failed to generate download link", 500, error.message);
  }
};

/**
 * GET /api/orders/:id/download — Download ZIP for paid order
 */
export const downloadOrder = async (req, res) => {
  // existing route still supported but now enforces user context and counters
  try {
    const { id } = req.params;
    const userId = req.user && req.user.id;

    if (!userId) {
      return sendError(res, "Authentication required", 401);
    }

    const order = await orderService.getOrderById(id);
    if (!order) {
      return sendError(res, "Order not found", 404);
    }

    // ensure the order belongs to the logged in user
    if (order.user_id !== userId) {
      return sendError(res, "This order does not belong to you", 403);
    }

    if ((order.payment_status || "").toLowerCase() !== "paid") {
      return sendError(res, "Payment not completed. Cannot download.", 403);
    }

    const max = order.max_downloads || 1;
    const used = order.downloads_used || 0;
    if (used >= max) {
      return sendError(res, "Download limit exceeded", 403);
    }

    if (!order.products?.zip_path) {
      return sendError(res, "No downloadable file for this product", 404);
    }

    const downloadUrl = await storageService.getSignedDownloadUrl(order.products.zip_path);
    // increment counter and log
    await orderService.incrementDownloads(order.id);
    await adminService.logDownload({
      user_email: req.user.email || "",
      user_name: req.user.name || "",
      product_id: order.product_id,
      product_title: order.products?.title || "",
      file_name: order.products?.zip_path || "",
      ip_address: req.ip || req.connection.remoteAddress || "",
    });

    return sendSuccess(res, { download_url: downloadUrl }, "Download URL generated");
  } catch (error) {
    return sendError(res, "Failed to generate download link", 500, error.message);
  }
};
