/**
 * Request / Response logger for debugging on Render
 * Logs method, url, status, duration, IP, user-agent
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const ts = new Date().toISOString();

  // Log request
  console.log(
    `\n→ [${ts}] ${req.method} ${req.originalUrl}` +
      ` | IP: ${req.ip || req.headers["x-forwarded-for"] || "unknown"}` +
      ` | UA: ${(req.headers["user-agent"] || "").slice(0, 60)}`
  );

  if (req.method !== "GET" && req.body && Object.keys(req.body).length > 0) {
    // Redact sensitive fields
    const safe = { ...req.body };
    if (safe.password) safe.password = "***";
    if (safe.password_hash) safe.password_hash = "***";
    console.log("   Body:", JSON.stringify(safe).slice(0, 300));
  }

  // Capture response
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const icon = status < 400 ? "✅" : status < 500 ? "⚠️" : "❌";
    console.log(
      `← ${icon} ${status} ${req.method} ${req.originalUrl} [${duration}ms]` +
        (body?.message ? ` — ${body.message}` : "")
    );
    return originalJson(body);
  };

  next();
};

export default requestLogger;
