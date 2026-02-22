import express from "express";
import * as authController from "../controllers/auth.controller.js";
import { userAuth, requireAdmin } from "../middlewares/auth.middleware.js";
import { adminAuth } from "../middlewares/admin.middleware.js";

const router = express.Router();

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);

// Protected routes (logged-in user)
router.get("/profile", userAuth, authController.getProfile);
router.put("/profile", userAuth, authController.updateProfile);

// Admin routes
router.get("/users", adminAuth, authController.getAllUsers);

export default router;
