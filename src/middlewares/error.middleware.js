/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res, next) => {
  console.log(`⚠️  404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Global error handler
 */
export const errorHandler = (err, req, res, next) => {
  const ts = new Date().toISOString();
  console.error(`\n❌ [${ts}] UNHANDLED ERROR on ${req.method} ${req.originalUrl}`);
  console.error(`   Message: ${err.message}`);
  console.error(`   Stack: ${(err.stack || "").split("\n").slice(0, 5).join("\n   ")}`);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};
