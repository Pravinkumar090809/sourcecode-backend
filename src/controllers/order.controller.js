import * as orderService from "../services/order.service.js";
import * as storageService from "../services/storage.service.js";
import * as productService from "../services/product.service.js";
import * as adminService from "../services/admin.service.js"; // ✅ ADD THIS
import { getCouponByCode, incrementCouponUse } from "../services/admin.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

/**
 * POST /api/orders — Create a new order (public)
 */
export const createOrder = async (req, res) => {
  try {
    let { product_id, buyer_email, coupon_code } = req.body;

    if (!product_id || !buyer_email) {
      return sendError(res, "product_id and buyer_email are required", 400);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyer_email)) {
      return sendError(res, "Invalid email address", 400);
    }

    let discount = 0;
    let coupon = null;
    if (coupon_code) {
      coupon_code = coupon_code.trim().toUpperCase();
      coupon = await getCouponByCode(coupon_code);
      if (!coupon) return sendError(res, "Coupon not found", 404);
      if (!coupon.active) return sendError(res, "Coupon is inactive", 400);
      if (coupon.expiry && new Date(coupon.expiry) < new Date()) return sendError(res, "Coupon expired", 400);
      if (coupon.max_uses && coupon.uses >= coupon.max_uses) return sendError(res, "Coupon use limit reached", 400);

      // product price lookup
      const product = await productService.getProductById(product_id);
      const price = product?.price || 0;
      if (coupon.type === "percent") discount = Math.round((price * (coupon.discount || 0)) / 100);
      else discount = coupon.discount || 0;
      // clamp
      if (discount > price) discount = price;
    }

    const order = await orderService.createOrder({
      product_id,
      buyer_email,
      user_id: req.user && req.user.id,
      coupon_code: coupon ? coupon.code : null,
      discount_amount: discount,
    });

    if (coupon) {
      try {
        await incrementCouponUse(coupon.id);
      } catch (e) {
        console.warn("Failed to increment coupon use:", e.message);
      }
    }

    return sendSuccess(res, order, "Order created successfully", 201);
  } catch (error) {
    console.error("💥 createOrder error:", error.message);
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
    console.error("💥 getOrder error:", error.message);
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
    console.error("💥 getOrdersByEmail error:", error.message);
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
    console.error("💥 getAllOrders error:", error.message);
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
    console.error("💥 getOrderStats error:", error.message);
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

    // fetch paid order for this user/product (pass email for fallback if user_id col missing)
    const order = await orderService.getPaidOrderForUserProduct(userId, productId, req.user.email);
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

    const DOWNLOAD_EXPIRY_SECONDS = 600; // 10 minutes
    const downloadUrl = await storageService.getSignedDownloadUrl(product.zip_path, DOWNLOAD_EXPIRY_SECONDS);

    // increment and log
    await orderService.incrementDownloads(order.id);
    await adminService.logDownload({ // ✅ NOW THIS WILL WORK
      user_email: req.user.email || "",
      user_name: req.user.name || "",
      product_id: productId,
      product_title: product.title || "",
      file_name: product.zip_path,
      ip_address: req.ip || req.connection.remoteAddress || "",
    });

    return sendSuccess(res, {
      download_url: downloadUrl,
      expires_in: DOWNLOAD_EXPIRY_SECONDS,
      expires_at: new Date(Date.now() + DOWNLOAD_EXPIRY_SECONDS * 1000).toISOString(),
      downloads_used: (used + 1),
      max_downloads: max,
      warning: `This download link expires in ${DOWNLOAD_EXPIRY_SECONDS / 60} minutes. Download immediately.`,
    }, "Download URL generated");
  } catch (error) {
    console.error("💥 download error:", error.message);
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("not found") || msg.includes("no such file")) {
      return sendError(res, "File not found in storage", 404, error.message);
    }
    return sendError(res, "Failed to generate download link", 500, error.message);
  }
};

/**
 * GET /api/orders/:id/download — Download ZIP for paid order
 */
export const downloadOrder = async (req, res) => {
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

    // ensure the order belongs to the logged-in user (skip check if user_id col missing)
    if (order.user_id && order.user_id !== userId) {
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

    const DOWNLOAD_EXPIRY_SECONDS = 600; // 10 minutes
    const downloadUrl = await storageService.getSignedDownloadUrl(order.products.zip_path, DOWNLOAD_EXPIRY_SECONDS);
    
    // increment counter and log
    await orderService.incrementDownloads(order.id);
    await adminService.logDownload({ // ✅ NOW THIS WILL WORK
      user_email: req.user.email || "",
      user_name: req.user.name || "",
      product_id: order.product_id,
      product_title: order.products?.title || "",
      file_name: order.products?.zip_path || "",
      ip_address: req.ip || req.connection.remoteAddress || "",
    });

    return sendSuccess(res, {
      download_url: downloadUrl,
      expires_in: DOWNLOAD_EXPIRY_SECONDS,
      expires_at: new Date(Date.now() + DOWNLOAD_EXPIRY_SECONDS * 1000).toISOString(),
      downloads_used: (used + 1),
      max_downloads: max,
      warning: `This download link expires in ${DOWNLOAD_EXPIRY_SECONDS / 60} minutes. Download immediately.`,
    }, "Download URL generated");
  } catch (error) {
    console.error("💥 download error:", error.message);
    const msg = String(error.message || "").toLowerCase();
    if (msg.includes("not found") || msg.includes("no such file")) {
      return sendError(res, "File not found in storage", 404, error.message);
    }
    return sendError(res, "Failed to generate download link", 500, error.message);
  }
};