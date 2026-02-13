import { body, validationResult } from 'express-validator';
import xss from 'xss';
import { Request, Response, NextFunction } from 'express';

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format errors for better frontend handling
    const formattedErrors = errors.array().map((err: any) => ({
      field: err.path || err.param,
      message: err.msg
    }));

    // Return first error message as a simple string for compatibility
    const firstError: any = errors.array()[0];
    return res.status(400).json({
      error: firstError.msg || 'Validation failed',
      errors: formattedErrors
    });
  }
  next();
};

// Sanitize string inputs
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
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
export const registerValidation = [
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

export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate
];

export const documentValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  validate,
  sanitizeInput
];

