import express from "express";
import * as productController from "../controllers/product.controller.js";
import { adminAuth } from "../middlewares/admin.middleware.js";

const router = express.Router();

// ─── Admin Routes (require x-admin-api-key header) ───
// NOTE: /admin/* routes MUST come before /:id to avoid route conflict
router.get("/admin/all", adminAuth, productController.getProductsAdmin);   // All products (inc. inactive)

// ─── Public Routes ───
router.get("/", productController.getProducts);                   // List active products
router.get("/:id", productController.getProduct);                 // Get single product
router.post("/", adminAuth, productController.createProduct);              // Create product
router.put("/:id", adminAuth, productController.updateProduct);            // Update product
router.delete("/:id", adminAuth, productController.deleteProduct);         // Soft delete
router.delete("/:id/permanent", adminAuth, productController.hardDeleteProduct); // Hard delete

export default router;
