const { logger } = require('../utils/logger');

// Custom error classes
class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

class BadRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BadRequestError';
    this.statusCode = 400;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

class InternalServerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InternalServerError';
    this.statusCode = 500;
  }
}

// Async error handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Log the error
  logger.error('Error occurred', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    },
    user: req.user ? req.user.wallet_address : 'anonymous'
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error = new ValidationError(err.message, err.details);
  } else if (err.name === 'JsonWebTokenError') {
    error = new UnauthorizedError('Invalid token');
  } else if (err.name === 'TokenExpiredError') {
    error = new UnauthorizedError('Token expired');
  } else if (err.code === '23505') { // PostgreSQL unique constraint violation
    error = new ConflictError('Resource already exists');
  } else if (err.code === '23503') { // PostgreSQL foreign key constraint violation
    error = new BadRequestError('Referenced resource does not exist');
  } else if (err.code === '42P01') { // PostgreSQL undefined table
    error = new InternalServerError('Database schema error');
  } else if (err.code === 'ECONNREFUSED') {
    error = new InternalServerError('Database connection failed');
  } else if (err.code === 'ENOTFOUND') {
    error = new InternalServerError('External service unavailable');
  } else if (!err.statusCode) {
    // Default error for unhandled errors
    error = new InternalServerError('Internal server error');
  }

  // Send error response
  const response = {
    code: error.statusCode || 500,
    message: error.message || 'Internal server error',
    timestamp: new Date().toISOString()
  };

  // Add validation details if available
  if (error.details && Array.isArray(error.details)) {
    response.details = error.details;
  }

  // Add request ID for tracking (if available)
  if (req.id) {
    response.requestId = req.id;
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && error.statusCode >= 500) {
    response.message = 'Internal server error';
    delete response.details;
  }

  res.status(error.statusCode || 500).json(response);
};

// 404 handler for unmatched routes
const notFoundHandler = (req, res) => {
  res.status(404).json({
    code: 404,
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};

// Request ID middleware for tracking
const requestIdMiddleware = (req, res, next) => {
  req.id = req.headers['x-request-id'] || 
           req.headers['x-correlation-id'] || 
           `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.setHeader('X-Request-ID', req.id);
  next();
};

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    }
  });
  
  // Gracefully shutdown the server
  process.exit(1);
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise
  });
  
  // Gracefully shutdown the server
  process.exit(1);
});

module.exports = {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
  InternalServerError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  requestIdMiddleware
}; 