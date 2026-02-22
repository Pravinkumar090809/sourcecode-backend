import { sendError } from "../utils/response.js";

/**
 * Admin authentication middleware
 * Checks for x-admin-api-key header
 */
export const adminAuth = (req, res, next) => {
  const apiKey = req.headers["x-admin-api-key"];

  if (!apiKey) {
    return sendError(res, "Missing admin API key", 401);
  }

  if (apiKey !== process.env.ADMIN_API_KEY) {
    return sendError(res, "Invalid admin API key", 403);
  }

  next();
};

export default adminAuth;
