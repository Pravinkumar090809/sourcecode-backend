import express from "express";
import multer from "multer";
import { adminAuth } from "../middlewares/admin.middleware.js";
import * as storageService from "../services/storage.service.js";
import * as orderService from "../services/order.service.js";
import * as productService from "../services/product.service.js";
import * as adminService from "../services/admin.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

const router = express.Router();

// Multer config — store in memory, max 50MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/zip" || file.originalname.endsWith(".zip")) {
      cb(null, true);
    } else {
      cb(new Error("Only ZIP files are allowed"), false);
    }
  },
});

// ─── Admin Routes ───

/**
 * POST /api/admin/upload — Upload ZIP file
 */
router.post("/upload", adminAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, "No file uploaded", 400);
    }

    const result = await storageService.uploadZipFile(req.file.buffer, req.file.originalname);
    await adminService.logActivity("File Uploaded", "Admin", `Uploaded ${req.file.originalname}`, "file");
    return sendSuccess(res, { zip_path: result.path }, "File uploaded successfully", 201);
  } catch (error) {
    return sendError(res, "Upload failed", 500, error.message);
  }
});

/**
 * GET /api/admin/files — List all uploaded files
 */
router.get("/files", adminAuth, async (req, res) => {
  try {
    const files = await storageService.listFiles();
    return sendSuccess(res, files, "Files listed successfully");
  } catch (error) {
    return sendError(res, "Failed to list files", 500, error.message);
  }
});

/**
 * DELETE /api/admin/files/:path — Delete a file
 */
router.delete("/files/*", adminAuth, async (req, res) => {
  try {
    const filePath = req.params[0]; // everything after /files/
    await storageService.deleteFile(filePath);
    await adminService.logActivity("File Deleted", "Admin", `Deleted ${filePath}`, "file");
    return sendSuccess(res, null, "File deleted successfully");
  } catch (error) {
    return sendError(res, "Failed to delete file", 500, error.message);
  }
});

/**
 * GET /api/admin/dashboard — Admin dashboard stats
 */
router.get("/dashboard", adminAuth, async (req, res) => {
  try {
    const [products, stats] = await Promise.all([
      productService.getAllProductsAdmin(),
      orderService.getOrderStats(),
    ]);

    return sendSuccess(res, {
      total_products: products.length,
      active_products: products.filter((p) => p.is_active).length,
      ...stats,
    }, "Dashboard data fetched");
  } catch (error) {
    return sendError(res, "Failed to fetch dashboard", 500, error.message);
  }
});

// ═══════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════

router.get("/reviews", adminAuth, async (req, res) => {
  try {
    const reviews = await adminService.getReviews();
    return sendSuccess(res, reviews, "Reviews fetched");
  } catch (error) {
    return sendError(res, "Failed to fetch reviews", 500, error.message);
  }
});

router.delete("/reviews/:id", adminAuth, async (req, res) => {
  try {
    await adminService.deleteReview(req.params.id);
    await adminService.logActivity("Review Deleted", "Admin", `Deleted review ${req.params.id}`, "review");
    return sendSuccess(res, null, "Review deleted");
  } catch (error) {
    return sendError(res, "Failed to delete review", 500, error.message);
  }
});

// ═══════════════════════════════════════════
// COUPONS
// ═══════════════════════════════════════════

router.get("/coupons", adminAuth, async (req, res) => {
  try {
    const coupons = await adminService.getCoupons();
    return sendSuccess(res, coupons, "Coupons fetched");
  } catch (error) {
    return sendError(res, "Failed to fetch coupons", 500, error.message);
  }
});

router.post("/coupons", adminAuth, async (req, res) => {
  try {
    const coupon = await adminService.createCoupon(req.body);
    await adminService.logActivity("Coupon Created", "Admin", `Created coupon ${req.body.code}`, "coupon");
    return sendSuccess(res, coupon, "Coupon created", 201);
  } catch (error) {
    return sendError(res, "Failed to create coupon", 500, error.message);
  }
});

router.delete("/coupons/:id", adminAuth, async (req, res) => {
  try {
    await adminService.deleteCoupon(req.params.id);
    await adminService.logActivity("Coupon Deleted", "Admin", `Deleted coupon ${req.params.id}`, "coupon");
    return sendSuccess(res, null, "Coupon deleted");
  } catch (error) {
    return sendError(res, "Failed to delete coupon", 500, error.message);
  }
});

router.patch("/coupons/:id/toggle", adminAuth, async (req, res) => {
  try {
    const coupon = await adminService.toggleCoupon(req.params.id, req.body.active);
    return sendSuccess(res, coupon, "Coupon updated");
  } catch (error) {
    return sendError(res, "Failed to toggle coupon", 500, error.message);
  }
});

// ═══════════════════════════════════════════
// REFUNDS
// ═══════════════════════════════════════════

router.get("/refunds", adminAuth, async (req, res) => {
  try {
    const refunds = await adminService.getRefunds();
    return sendSuccess(res, refunds, "Refunds fetched");
  } catch (error) {
    return sendError(res, "Failed to fetch refunds", 500, error.message);
  }
});

router.post("/refunds", adminAuth, async (req, res) => {
  try {
    const refund = await adminService.createRefund(req.body);
    await adminService.logActivity("Refund Created", "Admin", `Refund for order ${req.body.order_id}`, "payment");
    return sendSuccess(res, refund, "Refund created", 201);
  } catch (error) {
    return sendError(res, "Failed to create refund", 500, error.message);
  }
});

router.patch("/refunds/:id", adminAuth, async (req, res) => {
  try {
    const refund = await adminService.updateRefundStatus(req.params.id, req.body.status);
    await adminService.logActivity("Refund Updated", "Admin", `Refund ${req.params.id} → ${req.body.status}`, "payment");
    return sendSuccess(res, refund, "Refund updated");
  } catch (error) {
    return sendError(res, "Failed to update refund", 500, error.message);
  }
});

// ═══════════════════════════════════════════
// SUPPORT TICKETS
// ═══════════════════════════════════════════

router.get("/tickets", adminAuth, async (req, res) => {
  try {
    const tickets = await adminService.getTickets();
    return sendSuccess(res, tickets, "Tickets fetched");
  } catch (error) {
    return sendError(res, "Failed to fetch tickets", 500, error.message);
  }
});

router.patch("/tickets/:id/status", adminAuth, async (req, res) => {
  try {
    const ticket = await adminService.updateTicketStatus(req.params.id, req.body.status);
    await adminService.logActivity("Ticket Updated", "Admin", `Ticket ${req.params.id} → ${req.body.status}`, "support");
    return sendSuccess(res, ticket, "Ticket updated");
  } catch (error) {
    return sendError(res, "Failed to update ticket", 500, error.message);
  }
});

router.patch("/tickets/:id/reply", adminAuth, async (req, res) => {
  try {
    const ticket = await adminService.replyToTicket(req.params.id, req.body.reply);
    await adminService.logActivity("Ticket Replied", "Admin", `Replied to ticket ${req.params.id}`, "support");
    return sendSuccess(res, ticket, "Reply sent");
  } catch (error) {
    return sendError(res, "Failed to reply", 500, error.message);
  }
});

// ═══════════════════════════════════════════
// ACTIVITY LOGS
// ═══════════════════════════════════════════

router.get("/activity-logs", adminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await adminService.getActivityLogs(limit);
    return sendSuccess(res, logs, "Activity logs fetched");
  } catch (error) {
    return sendError(res, "Failed to fetch activity logs", 500, error.message);
  }
});

// ═══════════════════════════════════════════
// DOWNLOAD LOGS
// ═══════════════════════════════════════════

router.get("/download-logs", adminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await adminService.getDownloadLogs(limit);
    return sendSuccess(res, logs, "Download logs fetched");
  } catch (error) {
    return sendError(res, "Failed to fetch download logs", 500, error.message);
  }
});

// ═══════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════

router.get("/settings", adminAuth, async (req, res) => {
  try {
    const prefix = req.query.prefix || null;
    const settings = await adminService.getSettings(prefix);
    return sendSuccess(res, settings, "Settings fetched");
  } catch (error) {
    return sendError(res, "Failed to fetch settings", 500, error.message);
  }
});

router.put("/settings", adminAuth, async (req, res) => {
  try {
    await adminService.updateSettings(req.body);
    await adminService.logActivity("Settings Updated", "Admin", "Platform settings updated", "settings");
    return sendSuccess(res, null, "Settings updated");
  } catch (error) {
    return sendError(res, "Failed to update settings", 500, error.message);
  }
});

// ═══════════════════════════════════════════
// ADMIN PROFILE
// ═══════════════════════════════════════════

router.get("/profile", adminAuth, async (req, res) => {
  try {
    const profile = await adminService.getAdminProfile();
    return sendSuccess(res, profile, "Profile fetched");
  } catch (error) {
    return sendError(res, "Failed to fetch profile", 500, error.message);
  }
});

router.put("/profile", adminAuth, async (req, res) => {
  try {
    const profile = await adminService.updateAdminProfile(req.body);
    await adminService.logActivity("Profile Updated", "Admin", "Admin profile updated", "auth");
    return sendSuccess(res, profile, "Profile updated");
  } catch (error) {
    return sendError(res, "Failed to update profile", 500, error.message);
  }
});

router.post("/change-password", adminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return sendError(res, "Current and new password required", 400);
    }
    if (newPassword.length < 6) {
      return sendError(res, "Password must be at least 6 characters", 400);
    }
    await adminService.changeAdminPassword(currentPassword, newPassword);
    await adminService.logActivity("Password Changed", "Admin", "Admin password changed", "auth");
    return sendSuccess(res, null, "Password changed successfully");
  } catch (error) {
    return sendError(res, error.message || "Failed to change password", 400);
  }
});

export default router;
