/**
 * Bob Sessions Routes
 * 
 * Handles retrieval of Bob session history and aggregated metrics
 * for the Sprint Dashboard and activity feeds.
 * 
 * These routes query the Supabase database to provide:
 * 1. Recent Bob activity feed
 * 2. Aggregated productivity metrics
 * 3. Individual session details
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * GET /api/sessions
 * 
 * Retrieve user's Bob session history
 * Supports pagination and filtering by feature type
 * 
 * Query params:
 * - limit: number (default: 10)
 * - offset: number (default: 0)
 * - feature: 'onboarder' | 'docgen' | 'automator' (optional)
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, offset = 0, feature } = req.query;
    
    // Build query
    let query = supabase
      .from('bob_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Apply feature filter if provided
    if (feature) {
      query = query.eq('feature', feature);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    // Format response for frontend
    const sessions = data.map(session => ({
      id: session.id,
      feature: session.feature,
      inputSummary: session.input_summary,
      outputSummary: session.output_summary,
      linesGenerated: session.lines_generated,
      testsGenerated: session.tests_generated,
      createdAt: session.created_at,
      // Don't send full prompt/response in list view for performance
    }));
    
    res.json({
      success: true,
      data: sessions,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: count
      }
    });
    
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve sessions',
      details: error.message
    });
  }
});

/**
 * GET /api/sessions/:id
 * 
 * Retrieve a specific Bob session with full details
 * Includes the complete Bob prompt and response
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('bob_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Session not found'
        });
      }
      throw error;
    }
    
    // Parse Bob response from JSON
    let bobResponse = data.bob_response;
    try {
      bobResponse = JSON.parse(bobResponse);
    } catch (e) {
      // If not JSON, keep as string
    }
    
    res.json({
      success: true,
      data: {
        id: data.id,
        feature: data.feature,
        inputSummary: data.input_summary,
        outputSummary: data.output_summary,
        linesGenerated: data.lines_generated,
        testsGenerated: data.tests_generated,
        bobPrompt: data.bob_prompt,
        bobResponse: bobResponse,
        createdAt: data.created_at
      }
    });
    
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve session',
      details: error.message
    });
  }
});

/**
 * GET /api/sessions/metrics
 * 
 * Retrieve aggregated productivity metrics for dashboard
 * This is the primary endpoint for the Sprint Dashboard feature
 * 
 * Returns:
 * - Total Bob sessions run
 * - Total lines of documentation generated
 * - Total tests generated
 * - Total tasks automated
 * - Recent activity feed (last 5 sessions)
 */
router.get('/metrics/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get aggregated metrics from metrics table
    const { data: metricsData, error: metricsError } = await supabase
      .from('metrics')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (metricsError && metricsError.code !== 'PGRST116') {
      throw metricsError;
    }
    
    // Get recent activity (last 5 sessions)
    const { data: recentSessions, error: sessionsError } = await supabase
      .from('bob_sessions')
      .select('id, feature, input_summary, output_summary, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (sessionsError) {
      throw sessionsError;
    }
    
    // Get feature breakdown
    const { data: featureBreakdown, error: breakdownError } = await supabase
      .from('bob_sessions')
      .select('feature')
      .eq('user_id', userId);
    
    if (breakdownError) {
      throw breakdownError;
    }
    
    // Calculate feature usage counts
    const featureCounts = {
      onboarder: 0,
      docgen: 0,
      automator: 0
    };
    
    featureBreakdown.forEach(session => {
      if (featureCounts.hasOwnProperty(session.feature)) {
        featureCounts[session.feature]++;
      }
    });
    
    // Format response
    res.json({
      success: true,
      data: {
        metrics: {
          totalSessions: metricsData?.total_sessions || 0,
          totalLines: metricsData?.total_lines || 0,
          totalTests: metricsData?.total_tests || 0,
          totalTasks: metricsData?.total_tasks || 0,
          lastUpdated: metricsData?.updated_at || null
        },
        featureBreakdown: featureCounts,
        recentActivity: recentSessions.map(session => ({
          id: session.id,
          feature: session.feature,
          description: session.input_summary,
          result: session.output_summary,
          timestamp: session.created_at
        }))
      }
    });
    
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve metrics',
      details: error.message
    });
  }
});

/**
 * GET /api/sessions/stats/daily
 * 
 * Get daily usage statistics for the last 7 days
 * Useful for charts and trend visualization
 */
router.get('/stats/daily', async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Query sessions in date range
    const { data, error } = await supabase
      .from('bob_sessions')
      .select('created_at, feature, lines_generated, tests_generated')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    // Group by day
    const dailyStats = {};
    
    data.forEach(session => {
      const date = new Date(session.created_at).toISOString().split('T')[0];
      
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          sessions: 0,
          lines: 0,
          tests: 0,
          features: { onboarder: 0, docgen: 0, automator: 0 }
        };
      }
      
      dailyStats[date].sessions++;
      dailyStats[date].lines += session.lines_generated || 0;
      dailyStats[date].tests += session.tests_generated || 0;
      dailyStats[date].features[session.feature]++;
    });
    
    // Convert to array and fill missing days with zeros
    const statsArray = [];
    for (let i = 0; i < parseInt(days); i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      statsArray.unshift(dailyStats[dateStr] || {
        date: dateStr,
        sessions: 0,
        lines: 0,
        tests: 0,
        features: { onboarder: 0, docgen: 0, automator: 0 }
      });
    }
    
    res.json({
      success: true,
      data: statsArray
    });
    
  } catch (error) {
    console.error('Get daily stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve daily statistics',
      details: error.message
    });
  }
});

module.exports = router;

// Made with Bob
