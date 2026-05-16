/**
 * DevSync AI Backend Server
 * 
 * This Express server acts as the middleware layer between the React frontend
 * and IBM Bob AI. It handles:
 * 1. Bob API proxy requests (routes/bob.js)
 * 2. Session persistence to Supabase (routes/sessions.js)
 * 3. Bob Report export generation (routes/export.js)
 * 4. Authentication via Supabase Auth
 * 
 * IBM Bob Integration:
 * - All Bob interactions are proxied through this server
 * - Each Bob response is logged to Supabase for metrics and reporting
 * - The server enriches Bob prompts with context and formatting
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const bobRoutes = require('./routes/bob');
const sessionsRoutes = require('./routes/sessions');
const exportRoutes = require('./routes/export');

// Import middleware
const authMiddleware = require('./middleware/auth');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================

// Security headers
app.use(helmet());

// CORS configuration - allow frontend origin
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Request logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10mb' })); // Large limit for code uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'DevSync AI Backend',
    timestamp: new Date().toISOString(),
    bobIntegration: 'active'
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * Authentication Routes
 * Handles user authentication with JWT
 * - POST /api/auth/signup - Register new user
 * - POST /api/auth/login - Login with email/password
 * - POST /api/auth/refresh - Refresh JWT token
 * - POST /api/auth/logout - Logout user
 * - GET /api/auth/me - Get current user info
 */
app.use('/api/auth', authRoutes);

/**
 * Bob API Routes
 * Handles all interactions with IBM Bob AI
 * - POST /api/bob/onboard - Code onboarding analysis
 * - POST /api/bob/document - Documentation generation
 * - POST /api/bob/automate - Task automation
 */
app.use('/api/bob', authMiddleware, bobRoutes);

/**
 * Sessions Routes
 * Manages Bob session history and retrieval
 * - GET /api/sessions - Get user's Bob sessions
 * - GET /api/sessions/:id - Get specific session
 * - GET /api/sessions/metrics - Get aggregated metrics
 */
app.use('/api/sessions', authMiddleware, sessionsRoutes);

/**
 * Export Routes
 * Generates IBM Bob Report for hackathon submission
 * - GET /api/export/report - Generate JSON report
 * - GET /api/export/report/pdf - Generate PDF report
 */
app.use('/api/export', authMiddleware, exportRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: [
      'GET /health',
      'POST /api/bob/onboard',
      'POST /api/bob/document',
      'POST /api/bob/automate',
      'GET /api/sessions',
      'GET /api/sessions/metrics',
      'GET /api/export/report'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle specific error types
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing authentication token'
    });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }
  
  // Generic error response
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    DevSync AI Backend                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 IBM Bob integration: ACTIVE`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`📊 Supabase: ${process.env.SUPABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('════════════════════════════════════════════════════════════');
  console.log('Available endpoints:');
  console.log('  GET  /health');
  console.log('  POST /api/auth/signup');
  console.log('  POST /api/auth/login');
  console.log('  POST /api/auth/refresh');
  console.log('  POST /api/auth/logout');
  console.log('  GET  /api/auth/me');
  console.log('  POST /api/bob/onboard');
  console.log('  POST /api/bob/document');
  console.log('  POST /api/bob/automate');
  console.log('  GET  /api/sessions');
  console.log('  GET  /api/sessions/metrics');
  console.log('  GET  /api/export/report');
  console.log('════════════════════════════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;

// Made with Bob
