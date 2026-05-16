/**
 * Authentication Middleware
 * 
 * Validates Supabase JWT tokens and attaches user information to requests.
 * All Bob API routes require authentication to ensure:
 * 1. Sessions are properly attributed to users
 * 2. Users can only access their own data
 * 3. Metrics are tracked per user
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Authentication middleware
 * 
 * Extracts JWT from Authorization header and validates it with Supabase.
 * Attaches user object to req.user for downstream route handlers.
 * 
 * Usage:
 * router.get('/protected', authMiddleware, (req, res) => {
 *   const userId = req.user.id;
 *   // ... handle request
 * });
 */
async function authMiddleware(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing authorization header',
        hint: 'Include "Authorization: Bearer <token>" header'
      });
    }
    
    // Parse Bearer token
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authorization header format',
        hint: 'Use format: "Authorization: Bearer <token>"'
      });
    }
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        details: error?.message
      });
    }
    
    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata
    };
    
    // Continue to next middleware/route handler
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
      details: error.message
    });
  }
}

/**
 * Optional authentication middleware
 * 
 * Attempts to authenticate but doesn't fail if no token is provided.
 * Useful for routes that have different behavior for authenticated vs anonymous users.
 */
async function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      req.user = null;
      return next();
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      req.user = null;
      return next();
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      req.user = null;
      return next();
    }
    
    req.user = {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata
    };
    
    next();
    
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    req.user = null;
    next();
  }
}

/**
 * Admin-only middleware
 * 
 * Requires authentication AND admin role.
 * Useful for administrative endpoints.
 */
async function adminMiddleware(req, res, next) {
  try {
    // First authenticate
    await authMiddleware(req, res, () => {});
    
    // Check if user has admin role
    const isAdmin = req.user?.metadata?.role === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }
    
    next();
    
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authorization check failed',
      details: error.message
    });
  }
}

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuthMiddleware;
module.exports.adminOnly = adminMiddleware;

// Made with Bob
