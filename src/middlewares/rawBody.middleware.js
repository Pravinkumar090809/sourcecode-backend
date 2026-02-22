/**
 * Middleware to capture raw body for webhook signature verification
 */
export const rawBodyMiddleware = (req, res, next) => {
  if (req.originalUrl.includes('/webhook')) {
    let rawBody = '';
    
    req.on('data', (chunk) => {
      rawBody += chunk.toString();
    });

    req.on('end', () => {
      req.rawBody = rawBody;
      next();
    });
  } else {
    next();
  }
};