import * as authService from "../services/auth.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

/**
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return sendError(res, "name, email and password are required", 400);
    }

    if (password.length < 6) {
      return sendError(res, "Password must be at least 6 characters", 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, "Invalid email address", 400);
    }

    const result = await authService.register({ name, email, password });
    return sendSuccess(res, result, "Registration successful", 201);
  } catch (error) {
    if (error.message.includes("already exists")) {
      return sendError(res, error.message, 409);
    }
    return sendError(res, "Registration failed", 500, error.message);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, "email and password are required", 400);
    }

    const result = await authService.login({ email, password });
    return sendSuccess(res, result, "Login successful");
  } catch (error) {
    return sendError(res, "Invalid email or password", 401);
  }
};

/**
 * GET /api/auth/profile
 */
export const getProfile = async (req, res) => {
  try {
    const user = await authService.getProfile(req.user.id);
    return sendSuccess(res, user, "Profile fetched");
  } catch (error) {
    return sendError(res, "Failed to fetch profile", 500, error.message);
  }
};

/**
 * PUT /api/auth/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    return sendSuccess(res, user, "Profile updated");
  } catch (error) {
    return sendError(res, "Failed to update profile", 500, error.message);
  }
};

/**
 * GET /api/auth/users (admin only)
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await authService.getAllUsers();
    return sendSuccess(res, users, "Users fetched");
  } catch (error) {
    return sendError(res, "Failed to fetch users", 500, error.message);
  }
};
