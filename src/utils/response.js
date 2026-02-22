/**
 * Send success response
 */
export const sendSuccess = (res, data, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send error response
 */
export const sendError = (res, message = "Something went wrong", statusCode = 500, error = null) => {
  // Always log errors on server for Render debugging
  if (statusCode >= 500 || error) {
    console.error(`🔴 sendError [${statusCode}]: ${message}${error ? ` — ${error}` : ""}`);
  }

  const response = {
    success: false,
    message,
  };
  if (error && process.env.NODE_ENV !== "production") {
    response.error = error;
  }
  return res.status(statusCode).json(response);
};
