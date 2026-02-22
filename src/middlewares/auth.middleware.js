import { sendError } from "../utils/response.js";
import * as authService from "../services/auth.service.js";

/**
 * JWT auth middleware — protects routes for logged-in users
 */
export const userAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, "Access denied. No token provided.", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return sendError(res, "Invalid or expired token", 401);
  }
};

/**
 * Admin role middleware — must be used AFTER userAuth
 */
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return sendError(res, "Admin access required", 403);
  }
  next();
};

export default userAuth;
