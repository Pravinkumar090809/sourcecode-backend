import express from "express";
import multer from "multer";
import { adminAuth } from "../middlewares/admin.middleware.js";
import * as storageService from "../services/storage.service.js";
import * as orderService from "../services/order.service.js";
import * as productService from "../services/product.service.js";
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

export default router;
