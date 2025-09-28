// backend/middleware/errorHandler.mjs

/**
 * Express error handling middleware.
 * Catches thrown errors and sends JSON response with status + message.
 */
export default function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err);

  // If the error has an explicit status, use it
  const status = err.status || 500;
  const message =
    err.message || 'Internal server error, please try again later.';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}
