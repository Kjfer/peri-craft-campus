const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: {
      auth: '/api/auth',
      users: '/api/users',
      courses: '/api/courses',
      lessons: '/api/lessons',
      enrollments: '/api/enrollments',
      certificates: '/api/certificates',
      payments: '/api/payments',
      subscriptions: '/api/subscriptions',
      admin: '/api/admin',
      upload: '/api/upload'
    }
  });
};

module.exports = notFound;
