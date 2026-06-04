const logger = require('../utils/logger');

/**
 * Centralized Express error-handling middleware.
 *
 * - Returns structured JSON for all errors.
 * - Hides stack traces in production.
 * - Logs full error details server-side.
 *
 * Must be registered AFTER all routes:
 *   app.use(errorHandler);
 */
const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  logger.error('ERROR_HANDLER', `${req.method} ${req.originalUrl}`, err.message);

  if (!isProduction) {
    logger.error('ERROR_HANDLER', err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message: isProduction && statusCode === 500 ? 'Internal Server Error' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

module.exports = errorHandler;
