const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Database errors
  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  // Validation errors
  if (err.status === 400) {
    return res.status(400).json({ error: err.message });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: err.status || 500
  });
};

module.exports = errorHandler;
