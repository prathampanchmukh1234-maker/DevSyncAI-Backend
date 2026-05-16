/**
 * Authentication Routes
 * 
 * Handles user authentication with JWT tokens:
 * - POST /api/auth/signup - Register new user
 * - POST /api/auth/login - Login with email/password
 * - POST /api/auth/refresh - Refresh JWT token
 * - POST /api/auth/logout - Logout user
 * - GET /api/auth/me - Get current user info
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Initialize Supabase client with service key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * POST /api/auth/signup
 * Register a new user with email and password
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0]
        }
      }
    });

    if (error) {
      return res.status(400).json({
        error: 'Signup Failed',
        message: error.message
      });
    }

    // Return user and session info
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name
      },
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        expires_at: data.session?.expires_at
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create user'
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password, returns JWT tokens
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required'
      });
    }

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: error.message
      });
    }

    // Return user and session info
    res.json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to authenticate'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Refresh token is required'
      });
    }

    // Refresh session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({
        error: 'Refresh Failed',
        message: error.message
      });
    }

    res.json({
      message: 'Token refreshed successfully',
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in
      }
    });

  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to refresh token'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and invalidate session
 */
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      // Sign out from Supabase
      await supabase.auth.admin.signOut(token);
    }

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to logout'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.metadata?.name
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user info'
    });
  }
});

module.exports = router;

// Made with Bob