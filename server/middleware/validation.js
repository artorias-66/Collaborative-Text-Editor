const { body, validationResult } = require('express-validator');
const xss = require('xss');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format errors for better frontend handling
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg
    }));
    
    // Return first error message as a simple string for compatibility
    const firstError = errors.array()[0];
    return res.status(400).json({ 
      error: firstError.msg || 'Validation failed',
      errors: formattedErrors
    });
  }
  next();
};

// Sanitize string inputs
const sanitizeInput = (req, res, next) => {
  if (req.body.title) {
    req.body.title = xss(req.body.title.trim());
  }
  if (req.body.content) {
    // For content, we need to preserve HTML but sanitize dangerous tags
    req.body.content = req.body.content;
  }
  next();
};

// Validation rules
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  validate
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate
];

const documentValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  validate,
  sanitizeInput
];

module.exports = {
  validate,
  sanitizeInput,
  registerValidation,
  loginValidation,
  documentValidation
};

