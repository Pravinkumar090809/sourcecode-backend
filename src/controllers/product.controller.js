import * as productService from "../services/product.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

/**
 * GET /api/products — List all active products (public)
 */
export const getProducts = async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    return sendSuccess(res, products, "Products fetched successfully");
  } catch (error) {
    return sendError(res, "Failed to fetch products", 500, error.message);
  }
};

/**
 * GET /api/products/:id — Get single product (public)
 */
export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    return sendSuccess(res, product, "Product fetched successfully");
  } catch (error) {
    return sendError(res, "Product not found", 404, error.message);
  }
};

/**
 * GET /api/products/admin/all — List ALL products including inactive (admin)
 */
export const getProductsAdmin = async (req, res) => {
  try {
    const products = await productService.getAllProductsAdmin();
    return sendSuccess(res, products, "All products fetched (admin)");
  } catch (error) {
    return sendError(res, "Failed to fetch products", 500, error.message);
  }
};

/**
 * POST /api/products — Create product (admin)
 */
export const createProduct = async (req, res) => {
  try {
    const { title, description, price, zip_path, tags, thumbnail_url } = req.body;

    if (!title || !price) {
      return sendError(res, "title and price are required", 400);
    }

    if (Number(price) <= 0) {
      return sendError(res, "price must be greater than 0", 400);
    }

    const product = await productService.createProduct({ title, description, price, zip_path, tags, thumbnail_url });
    return sendSuccess(res, product, "Product created successfully", 201);
  } catch (error) {
    return sendError(res, "Failed to create product", 500, error.message);
  }
};

/**
 * PUT /api/products/:id — Update product (admin)
 */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (Object.keys(updates).length === 0) {
      return sendError(res, "No fields to update", 400);
    }

    const product = await productService.updateProduct(id, updates);
    return sendSuccess(res, product, "Product updated successfully");
  } catch (error) {
    return sendError(res, "Failed to update product", 500, error.message);
  }
};

/**
 * DELETE /api/products/:id — Soft delete product (admin)
 */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productService.deleteProduct(id);
    return sendSuccess(res, product, "Product deactivated successfully");
  } catch (error) {
    return sendError(res, "Failed to delete product", 500, error.message);
  }
};

/**
 * DELETE /api/products/:id/permanent — Hard delete product (admin)
 */
export const hardDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await productService.hardDeleteProduct(id);
    return sendSuccess(res, null, "Product permanently deleted");
  } catch (error) {
    return sendError(res, "Failed to delete product", 500, error.message);
  }
};
