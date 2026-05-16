/**
 * Bob Report Export Routes
 * 
 * Generates the IBM Bob Report required for hackathon submission.
 * This report packages all Bob session data into downloadable formats:
 * - JSON: Machine-readable format with complete session history
 * - PDF: Human-readable summary report (future enhancement)
 * 
 * The report demonstrates how IBM Bob was used throughout the project
 * and provides evidence of AI-powered productivity gains.
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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate comprehensive Bob report data
 */
async function generateReportData(userId) {
  // Get all sessions
  const { data: sessions, error: sessionsError } = await supabase
    .from('bob_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  
  if (sessionsError) {
    throw sessionsError;
  }
  
  // Get metrics
  const { data: metrics, error: metricsError } = await supabase
    .from('metrics')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (metricsError && metricsError.code !== 'PGRST116') {
    throw metricsError;
  }
  
  // Calculate additional statistics
  const stats = {
    totalSessions: sessions.length,
    totalLines: 0,
    totalTests: 0,
    totalTasks: 0,
    featureUsage: {
      onboarder: 0,
      docgen: 0,
      automator: 0
    },
    averageLinesPerSession: 0,
    averageTestsPerSession: 0,
    firstSessionDate: sessions[0]?.created_at || null,
    lastSessionDate: sessions[sessions.length - 1]?.created_at || null
  };
  
  sessions.forEach(session => {
    stats.totalLines += session.lines_generated || 0;
    stats.totalTests += session.tests_generated || 0;
    if (session.feature === 'automator') {
      stats.totalTasks++;
    }
    stats.featureUsage[session.feature]++;
  });
  
  if (sessions.length > 0) {
    stats.averageLinesPerSession = Math.round(stats.totalLines / sessions.length);
    stats.averageTestsPerSession = Math.round(stats.totalTests / sessions.length);
  }
  
  // Format sessions for export
  const formattedSessions = sessions.map(session => {
    let bobResponse;
    try {
      bobResponse = JSON.parse(session.bob_response);
    } catch (e) {
      bobResponse = session.bob_response;
    }
    
    return {
      sessionId: session.id,
      feature: session.feature,
      timestamp: session.created_at,
      input: {
        summary: session.input_summary,
        prompt: session.bob_prompt
      },
      output: {
        summary: session.output_summary,
        response: bobResponse
      },
      metrics: {
        linesGenerated: session.lines_generated,
        testsGenerated: session.tests_generated
      }
    };
  });
  
  return {
    report: {
      title: 'DevSync AI - IBM Bob Usage Report',
      generatedAt: new Date().toISOString(),
      userId: userId,
      projectName: 'DevSync AI',
      description: 'AI-powered developer productivity platform built with IBM Bob',
      hackathonSubmission: true
    },
    summary: {
      overview: `This report documents the use of IBM Bob AI throughout the DevSync AI project. Bob was integrated as the core intelligence engine, powering three main features: Code Onboarder, Documentation Generator, and Task Automator.`,
      totalSessions: stats.totalSessions,
      totalLinesGenerated: stats.totalLines,
      totalTestsGenerated: stats.totalTests,
      totalTasksAutomated: stats.totalTasks,
      averageLinesPerSession: stats.averageLinesPerSession,
      averageTestsPerSession: stats.averageTestsPerSession,
      projectDuration: {
        firstSession: stats.firstSessionDate,
        lastSession: stats.lastSessionDate
      }
    },
    featureBreakdown: {
      codeOnboarder: {
        sessions: stats.featureUsage.onboarder,
        description: 'Bob analyzed codebases and generated onboarding documentation',
        impact: 'Reduced onboarding time for new developers by providing instant codebase summaries'
      },
      documentationGenerator: {
        sessions: stats.featureUsage.docgen,
        description: 'Bob generated JSDoc comments, README content, and unit tests',
        impact: 'Automated documentation and test creation, improving code quality'
      },
      taskAutomator: {
        sessions: stats.featureUsage.automator,
        description: 'Bob performed code transformations and repetitive tasks',
        impact: 'Eliminated manual refactoring work and reduced development time'
      }
    },
    sessions: formattedSessions,
    metrics: metrics || {
      total_sessions: stats.totalSessions,
      total_lines: stats.totalLines,
      total_tests: stats.totalTests,
      total_tasks: stats.totalTasks
    },
    technicalDetails: {
      integration: 'IBM Bob API via Express.js proxy',
      database: 'Supabase PostgreSQL',
      frontend: 'React 18 + Vite',
      backend: 'Node.js + Express',
      deployment: 'Vercel (frontend) + Railway/Render (backend)'
    },
    conclusion: `IBM Bob was successfully integrated as the core AI engine of DevSync AI, demonstrating practical applications of AI in developer productivity. The platform processed ${stats.totalSessions} sessions, generated ${stats.totalLines} lines of documentation/code, and created ${stats.totalTests} unit tests, showcasing Bob's versatility and effectiveness.`
  };
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * GET /api/export/report
 * 
 * Generate and download IBM Bob Report in JSON format
 * This is the primary export for hackathon submission
 */
router.get('/report', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Generate report data
    const reportData = await generateReportData(userId);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="bob-report.json"');
    
    // Send report
    res.json(reportData);
    
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate Bob report',
      details: error.message
    });
  }
});

/**
 * GET /api/export/report/summary
 * 
 * Get report summary without full session details
 * Useful for preview before downloading full report
 */
router.get('/report/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Generate full report
    const reportData = await generateReportData(userId);
    
    // Return only summary sections
    res.json({
      success: true,
      data: {
        report: reportData.report,
        summary: reportData.summary,
        featureBreakdown: reportData.featureBreakdown,
        technicalDetails: reportData.technicalDetails,
        sessionCount: reportData.sessions.length
      }
    });
    
  } catch (error) {
    console.error('Export summary error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate report summary',
      details: error.message
    });
  }
});

/**
 * GET /api/export/report/pdf
 * 
 * Generate PDF version of Bob Report
 * Future enhancement - requires PDF generation library
 */
router.get('/report/pdf', async (req, res) => {
  try {
    // TODO: Implement PDF generation using libraries like:
    // - pdfkit
    // - puppeteer
    // - jsPDF
    
    res.status(501).json({
      error: 'Not Implemented',
      message: 'PDF export is not yet implemented',
      suggestion: 'Use /api/export/report for JSON format'
    });
    
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate PDF report',
      details: error.message
    });
  }
});

/**
 * POST /api/export/report/custom
 * 
 * Generate custom report with specific date range or filters
 * 
 * Request body:
 * {
 *   startDate: string (ISO date),
 *   endDate: string (ISO date),
 *   features: string[] (optional),
 *   includePrompts: boolean (optional)
 * }
 */
router.post('/report/custom', async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, features, includePrompts = true } = req.body;
    
    // Build query with filters
    let query = supabase
      .from('bob_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    if (features && features.length > 0) {
      query = query.in('feature', features);
    }
    
    const { data: sessions, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // Format sessions
    const formattedSessions = sessions.map(session => {
      let bobResponse;
      try {
        bobResponse = JSON.parse(session.bob_response);
      } catch (e) {
        bobResponse = session.bob_response;
      }
      
      const sessionData = {
        sessionId: session.id,
        feature: session.feature,
        timestamp: session.created_at,
        input: {
          summary: session.input_summary
        },
        output: {
          summary: session.output_summary,
          response: bobResponse
        },
        metrics: {
          linesGenerated: session.lines_generated,
          testsGenerated: session.tests_generated
        }
      };
      
      // Include prompts only if requested
      if (includePrompts) {
        sessionData.input.prompt = session.bob_prompt;
      }
      
      return sessionData;
    });
    
    // Calculate filtered stats
    const stats = {
      totalSessions: sessions.length,
      totalLines: sessions.reduce((sum, s) => sum + (s.lines_generated || 0), 0),
      totalTests: sessions.reduce((sum, s) => sum + (s.tests_generated || 0), 0),
      dateRange: {
        start: startDate || sessions[0]?.created_at,
        end: endDate || sessions[sessions.length - 1]?.created_at
      }
    };
    
    res.json({
      success: true,
      report: {
        title: 'DevSync AI - Custom Bob Report',
        generatedAt: new Date().toISOString(),
        filters: { startDate, endDate, features }
      },
      summary: stats,
      sessions: formattedSessions
    });
    
  } catch (error) {
    console.error('Custom export error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate custom report',
      details: error.message
    });
  }
});

module.exports = router;

// Made with Bob
