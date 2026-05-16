/**
 * GitHub Repository Analyzer
 * 
 * Fetches and analyzes real GitHub repositories
 * Provides actual file structure, languages, and content
 */

const axios = require('axios');

/**
 * Parse GitHub URL to extract owner and repo
 */
function parseGitHubUrl(url) {
  const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = url.match(regex);
  
  if (!match) {
    throw new Error('Invalid GitHub URL');
  }
  
  return {
    owner: match[1],
    repo: match[2].replace('.git', '')
  };
}

/**
 * Fetch repository information from GitHub API
 */
async function fetchRepoInfo(owner, repo) {
  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DevSync-AI'
      }
    });
    
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Repository not found');
    }
    throw new Error(`Failed to fetch repository: ${error.message}`);
  }
}

/**
 * Fetch repository file tree
 */
async function fetchRepoTree(owner, repo, branch = 'main') {
  try {
    // Try main branch first
    let response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'DevSync-AI'
        }
      }
    );
    
    return response.data.tree;
  } catch (error) {
    // If main fails, try master
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'DevSync-AI'
          }
        }
      );
      
      return response.data.tree;
    } catch (masterError) {
      throw new Error('Could not fetch repository tree');
    }
  }
}

/**
 * Fetch README content
 */
async function fetchReadme(owner, repo) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3.raw',
          'User-Agent': 'DevSync-AI'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    return null;
  }
}

/**
 * Fetch repository languages
 */
async function fetchLanguages(owner, repo) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/languages`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'DevSync-AI'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    return {};
  }
}

/**
 * Analyze file structure to identify key files and patterns
 */
function analyzeFileStructure(tree) {
  const analysis = {
    totalFiles: 0,
    directories: [],
    keyFiles: [],
    fileTypes: {},
    hasBackend: false,
    hasFrontend: false,
    hasTests: false,
    hasDocs: false,
    frameworks: []
  };
  
  const keyFilePatterns = {
    'package.json': 'Node.js project configuration',
    'requirements.txt': 'Python dependencies',
    'Cargo.toml': 'Rust project configuration',
    'go.mod': 'Go module definition',
    'pom.xml': 'Maven project configuration',
    'build.gradle': 'Gradle build configuration',
    'Dockerfile': 'Docker container configuration',
    'docker-compose.yml': 'Docker Compose configuration',
    '.env.example': 'Environment variables template',
    'README.md': 'Project documentation',
    'LICENSE': 'Project license',
    '.gitignore': 'Git ignore rules'
  };
  
  tree.forEach(item => {
    if (item.type === 'blob') {
      analysis.totalFiles++;
      
      // Get file extension
      const ext = item.path.split('.').pop();
      analysis.fileTypes[ext] = (analysis.fileTypes[ext] || 0) + 1;
      
      // Check for key files
      const fileName = item.path.split('/').pop();
      if (keyFilePatterns[fileName]) {
        analysis.keyFiles.push({
          path: item.path,
          purpose: keyFilePatterns[fileName]
        });
      }
      
      // Detect patterns
      if (item.path.includes('backend') || item.path.includes('server') || item.path.includes('api')) {
        analysis.hasBackend = true;
      }
      if (item.path.includes('frontend') || item.path.includes('client') || item.path.includes('ui')) {
        analysis.hasFrontend = true;
      }
      if (item.path.includes('test') || item.path.includes('spec') || item.path.includes('__tests__')) {
        analysis.hasTests = true;
      }
      if (item.path.includes('docs') || item.path.includes('documentation')) {
        analysis.hasDocs = true;
      }
    } else if (item.type === 'tree') {
      analysis.directories.push(item.path);
    }
  });
  
  // Detect frameworks
  if (analysis.fileTypes['jsx'] || analysis.fileTypes['tsx']) {
    analysis.frameworks.push('React');
  }
  if (analysis.fileTypes['vue']) {
    analysis.frameworks.push('Vue.js');
  }
  if (analysis.fileTypes['py']) {
    analysis.frameworks.push('Python');
  }
  if (analysis.fileTypes['go']) {
    analysis.frameworks.push('Go');
  }
  if (analysis.fileTypes['rs']) {
    analysis.frameworks.push('Rust');
  }
  
  return analysis;
}

/**
 * Generate comprehensive repository analysis
 */
async function analyzeRepository(repoUrl) {
  try {
    // Parse URL
    const { owner, repo } = parseGitHubUrl(repoUrl);
    
    // Fetch repository info first
    const repoInfo = await fetchRepoInfo(owner, repo);
    
    // Then fetch other data in parallel
    const [tree, readme, languages] = await Promise.all([
      fetchRepoTree(owner, repo, repoInfo.default_branch),
      fetchReadme(owner, repo),
      fetchLanguages(owner, repo)
    ]);
    
    // Analyze file structure
    const fileAnalysis = analyzeFileStructure(tree);
    
    // Generate summary
    const summary = `${repoInfo.description || 'No description provided'}. This repository has ${repoInfo.stargazers_count} stars and ${repoInfo.forks_count} forks. It contains ${fileAnalysis.totalFiles} files across ${fileAnalysis.directories.length} directories.`;
    
    // Generate getting started guide
    const gettingStarted = readme 
      ? `Based on the README:\n\n${readme.substring(0, 500)}...`
      : `1. Clone the repository: git clone ${repoInfo.clone_url}\n2. Navigate to the project directory\n3. Check README.md for specific setup instructions\n4. Install dependencies based on the project type\n5. Run the project`;
    
    // Get top languages
    const topLanguages = Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang, bytes]) => lang);
    
    // Generate architecture description
    const architecture = `
Project Structure:
- Total Files: ${fileAnalysis.totalFiles}
- Directories: ${fileAnalysis.directories.length}
- Primary Languages: ${topLanguages.join(', ')}
- Frameworks Detected: ${fileAnalysis.frameworks.join(', ') || 'None detected'}

Components:
${fileAnalysis.hasBackend ? '✓ Backend/API layer detected' : '✗ No backend detected'}
${fileAnalysis.hasFrontend ? '✓ Frontend/UI layer detected' : '✗ No frontend detected'}
${fileAnalysis.hasTests ? '✓ Test suite present' : '✗ No tests detected'}
${fileAnalysis.hasDocs ? '✓ Documentation present' : '✗ No docs detected'}

Repository Stats:
- Stars: ${repoInfo.stargazers_count}
- Forks: ${repoInfo.forks_count}
- Open Issues: ${repoInfo.open_issues_count}
- Last Updated: ${new Date(repoInfo.updated_at).toLocaleDateString()}
- License: ${repoInfo.license?.name || 'No license'}
    `.trim();
    
    return {
      summary,
      gettingStarted,
      keyFiles: fileAnalysis.keyFiles.slice(0, 10), // Top 10 key files
      architecture,
      metadata: {
        owner,
        repo,
        stars: repoInfo.stargazers_count,
        forks: repoInfo.forks_count,
        language: repoInfo.language,
        languages: topLanguages,
        totalFiles: fileAnalysis.totalFiles
      }
    };
    
  } catch (error) {
    throw new Error(`Repository analysis failed: ${error.message}`);
  }
}

module.exports = {
  analyzeRepository,
  parseGitHubUrl
};

// Made with Bob