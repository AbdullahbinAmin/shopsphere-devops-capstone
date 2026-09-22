/**
 * Identity Service — Input Validators
 * Joi validation schemas for all auth endpoints.
 */

const Joi = require('joi');

const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._#^])[A-Za-z\d@$!%*?&._#^]/)
  .required()
  .messages({
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password must be at most 128 characters',
  });

const registerSchema = Joi.object({
  email: Joi.string().email().max(255).required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: passwordSchema,
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: passwordSchema,
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'New passwords do not match',
  }),
});

const updateRoleSchema = Joi.object({
  role: Joi.string().valid('CUSTOMER', 'ADMIN', 'MODERATOR').required(),
});

/**
 * Validate request body against a Joi schema.
 * Returns middleware that calls next(error) on failure.
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
      const err = new Error('Validation failed');
      err.name = 'ValidationError';
      err.details = details;
      return next(err);
    }
    req.body = value;
    next();
  };
}

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateRoleSchema,
};
