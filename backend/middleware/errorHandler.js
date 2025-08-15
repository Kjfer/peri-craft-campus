const errorHandler = (err, req, res, next) => {
  console.error('Error Stack:', err.stack);

  // Default error
  let error = { ...err };
  error.message = err.message;

  // Supabase errors
  if (err.code === 'PGRST116') {
    error.message = 'Resource not found';
    error.statusCode = 404;
  }

  // Duplicate key error
  if (err.code === '23505') {
    error.message = 'Duplicate resource';
    error.statusCode = 400;
  }

  // Foreign key constraint error
  if (err.code === '23503') {
    error.message = 'Referenced resource not found';
    error.statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.statusCode = 401;
  }

  // Validation errors (Joi)
  if (err.name === 'ValidationError') {
    const message = err.details.map(detail => detail.message).join(', ');
    error.message = message;
    error.statusCode = 400;
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    error.message = 'File too large';
    error.statusCode = 400;
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error.message = 'Too many files';
    error.statusCode = 400;
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error.message = 'Unexpected file field';
    error.statusCode = 400;
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
