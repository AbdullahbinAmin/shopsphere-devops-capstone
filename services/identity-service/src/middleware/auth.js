/**
 * Identity Service — Auth Middleware
 * JWT verification middleware for protecting routes within this service.
 */

const authService = require('../services/authService');
const { AuthenticationError, AuthorizationError } = require('../../shared/errors');

/**
 * Verifies the Bearer JWT token in the Authorization header.
 * Attaches decoded user info to req.user.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AuthenticationError('Authorization header with Bearer token is required'));
  }

  const token = authHeader.substring(7);
  try {
    const user = authService.validateAccessToken(token);
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Restricts access to specified roles.
 * Must be used after authenticate().
 * @param {...string} roles
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError());
    }
    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError(`Requires one of these roles: ${roles.join(', ')}`));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
