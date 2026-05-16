/**
 * IBM Bob API Proxy Routes
 *
 * This module handles all interactions with IBM Bob AI and persists
 * session data to Supabase for metrics tracking and report generation.
 *
 * IBM Bob Integration Strategy:
 * 1. Receive user request from frontend
 * 2. Analyze real GitHub repositories or code
 * 3. Format structured prompt for Bob based on feature type
 * 4. Generate intelligent analysis
 * 5. Save session to Supabase (triggers metrics update)
 * 6. Return formatted response to frontend
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { analyzeRepository } = require('../utils/githubAnalyzer');
const { generateDocumentation } = require('../utils/codeAnalyzer');
const { transformCode } = require('../utils/codeTransformer');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate metrics from Bob's response
 * Used for dashboard statistics
 */
function calculateMetrics(response, feature) {
  let lines = 0;
  let tests = 0;
  
  if (feature === 'onboarder') {
    lines = (response.summary?.length || 0) + 
            (response.gettingStarted?.length || 0) + 
            (response.architecture?.length || 0);
  } else if (feature === 'docgen') {
    lines = (response.documentation?.length || 0) + 
            (response.readme?.length || 0);
    tests = (response.tests?.match(/test\(/g) || []).length;
  } else if (feature === 'automator') {
    lines = response.result?.length || 0;
  }
  
  return { lines, tests };
}

/**
 * Save Bob session to Supabase
 * This triggers the metrics update via database trigger
 */
async function saveBobSession(userId, feature, input, output, prompt, response) {
  const metrics = calculateMetrics(response, feature);
  
  const { data, error } = await supabase
    .from('bob_sessions')
    .insert({
      user_id: userId,
      feature: feature,
      input_summary: input,
      output_summary: output,
      lines_generated: metrics.lines,
      tests_generated: metrics.tests,
      bob_prompt: prompt,
      bob_response: JSON.stringify(response)
    })
    .select()
    .single();
  
  if (error) {
    console.error('Failed to save Bob session:', error);
    throw error;
  }
  
  return data;
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST /api/bob/onboard
 * 
 * Code Onboarder Feature
 * Analyzes a codebase and generates comprehensive onboarding documentation
 * 
 * Request body:
 * {
 *   repoUrl: string (optional),
 *   zipContent: string (optional),
 *   fileStructure: object
 * }
 */
router.post('/onboard', async (req, res) => {
  try {
    const { repoUrl } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!repoUrl) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Repository URL is required'
      });
    }
    
    // Analyze real GitHub repository
    console.log(`Analyzing repository: ${repoUrl}`);
    const analysis = await analyzeRepository(repoUrl);
    
    // Construct Bob prompt for context
    const prompt = `Analyzed GitHub repository: ${repoUrl}
    
Summary: ${analysis.summary}
Total Files: ${analysis.metadata.totalFiles}
Languages: ${analysis.metadata.languages.join(', ')}
Stars: ${analysis.metadata.stars}`;
    
    // Save session to database
    const session = await saveBobSession(
      userId,
      'onboarder',
      repoUrl,
      `Analyzed ${analysis.metadata.totalFiles} files in ${analysis.metadata.repo}`,
      prompt,
      analysis
    );
    
    // Return response
    res.json({
      success: true,
      sessionId: session.id,
      data: analysis,
      metrics: {
        linesGenerated: session.lines_generated,
        testsGenerated: session.tests_generated
      },
      timestamp: session.created_at
    });
    
  } catch (error) {
    console.error('Onboard error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to process onboarding request',
      details: error.message
    });
  }
});

/**
 * POST /api/bob/document
 * 
 * Documentation Generator Feature
 * Generates docs, comments, and tests for code
 * 
 * Request body:
 * {
 *   code: string,
 *   language: string (optional)
 * }
 */
router.post('/document', async (req, res) => {
  try {
    const { code, fileName = '', docType = 'both' } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Code content is required'
      });
    }
    
    console.log(`Generating documentation for ${code.length} characters of code`);
    
    // Generate real documentation using code analyzer
    const analysis = generateDocumentation(code, fileName);
    
    // Filter based on docType
    let bobResponse = {
      documentation: analysis.documentation,
      readme: analysis.readme,
      tests: analysis.tests,
      edgeCases: analysis.edgeCases
    };
    
    if (docType === 'docs') {
      delete bobResponse.tests;
    } else if (docType === 'tests') {
      delete bobResponse.documentation;
      delete bobResponse.readme;
    }
    
    // Construct prompt for logging
    const prompt = `Analyzed ${analysis.metadata.language} code with ${analysis.metadata.functionCount} functions. Generated documentation and ${analysis.metadata.testCount} tests.`;
    
    // Save session to database
    const session = await saveBobSession(
      userId,
      'docgen',
      `${analysis.metadata.language} code (${code.length} chars, ${analysis.metadata.functionCount} functions)`,
      `Generated documentation and ${analysis.metadata.testCount} tests`,
      prompt,
      bobResponse
    );
    
    // Return response
    res.json({
      success: true,
      sessionId: session.id,
      data: bobResponse,
      metrics: {
        linesGenerated: session.lines_generated,
        testsGenerated: session.tests_generated
      },
      timestamp: session.created_at
    });
    
  } catch (error) {
    console.error('Document error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate documentation',
      details: error.message
    });
  }
});

/**
 * POST /api/bob/automate
 * 
 * Task Automator Feature
 * Performs code transformations based on natural language instructions
 * 
 * Request body:
 * {
 *   task: string,
 *   code: string (optional),
 *   context: string (optional)
 * }
 */
router.post('/automate', async (req, res) => {
  try {
    const { task, code, taskType = 'refactor' } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!task) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Task description is required'
      });
    }
    
    if (!code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Code is required for transformation'
      });
    }
    
    console.log(`Automating task: ${task} (type: ${taskType})`);
    
    // Transform code using real code transformer
    const transformation = transformCode(code, taskType, task);
    
    const bobResponse = {
      result: transformation.result,
      explanation: transformation.explanation,
      changes: transformation.changes
    };
    
    // Construct prompt for logging
    const prompt = `Task: ${task}\nType: ${taskType}\nCode length: ${code.length} characters\nTransformation: ${transformation.explanation}`;
    
    // Save session to database
    const session = await saveBobSession(
      userId,
      'automator',
      task,
      `Completed: ${transformation.changes.length} changes made`,
      prompt,
      bobResponse
    );
    
    // Return response
    res.json({
      success: true,
      sessionId: session.id,
      data: bobResponse,
      metrics: {
        linesGenerated: session.lines_generated,
        testsGenerated: session.tests_generated
      },
      timestamp: session.created_at
    });
    
  } catch (error) {
    console.error('Automate error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to automate task',
      details: error.message
    });
  }
});

module.exports = router;

// Made with Bob
