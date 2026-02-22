/**
 * Send success response
 */
export const sendSuccess = (res, data = null, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send error response
 */
export const sendError = (res, message = "Error occurred", statusCode = 500, details = null) => {
  const response = {
    success: false,
    message,
  };

  if (details && process.env.NODE_ENV !== "production") {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};