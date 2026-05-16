/**
 * Code Analyzer Utility
 * 
 * Provides intelligent code analysis for documentation generation
 * and task automation without requiring external AI APIs
 */

/**
 * Detect programming language from code
 */
function detectLanguage(code, fileName = '') {
  // Check file extension first
  if (fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const extMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'rs': 'rust',
      'rb': 'ruby',
      'php': 'php'
    };
    if (extMap[ext]) return extMap[ext];
  }

  // Detect from code patterns
  if (code.includes('def ') && code.includes(':')) return 'python';
  if (code.includes('function') || code.includes('=>') || code.includes('const ')) return 'javascript';
  if (code.includes('public class') || code.includes('private ')) return 'java';
  if (code.includes('func ') && code.includes('package ')) return 'go';
  if (code.includes('fn ') && code.includes('let ')) return 'rust';
  
  return 'javascript'; // default
}

/**
 * Extract functions from code
 */
function extractFunctions(code, language) {
  const functions = [];
  
  if (language === 'javascript' || language === 'typescript') {
    // Match function declarations
    const funcRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))/g;
    let match;
    while ((match = funcRegex.exec(code)) !== null) {
      const name = match[1] || match[2];
      functions.push({
        name,
        type: 'function',
        line: code.substring(0, match.index).split('\n').length
      });
    }
    
    // Match class methods
    const methodRegex = /(\w+)\s*\([^)]*\)\s*{/g;
    while ((match = methodRegex.exec(code)) !== null) {
      if (!functions.find(f => f.name === match[1])) {
        functions.push({
          name: match[1],
          type: 'method',
          line: code.substring(0, match.index).split('\n').length
        });
      }
    }
  } else if (language === 'python') {
    // Match Python functions
    const funcRegex = /def\s+(\w+)\s*\([^)]*\):/g;
    let match;
    while ((match = funcRegex.exec(code)) !== null) {
      functions.push({
        name: match[1],
        type: 'function',
        line: code.substring(0, match.index).split('\n').length
      });
    }
  }
  
  return functions;
}

/**
 * Extract function parameters
 */
function extractParameters(code, functionName) {
  const patterns = [
    new RegExp(`function\\s+${functionName}\\s*\\(([^)]*)\\)`, 'i'),
    new RegExp(`const\\s+${functionName}\\s*=\\s*\\(([^)]*)\\)\\s*=>`, 'i'),
    new RegExp(`${functionName}\\s*\\(([^)]*)\\)\\s*{`, 'i'),
    new RegExp(`def\\s+${functionName}\\s*\\(([^)]*)\\):`, 'i')
  ];
  
  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match && match[1]) {
      return match[1].split(',').map(p => p.trim()).filter(p => p);
    }
  }
  
  return [];
}

/**
 * Generate JSDoc comment for a function
 */
function generateJSDoc(functionName, params, code) {
  const lines = [`/**`, ` * ${functionName} - Auto-generated documentation`];
  
  // Add description based on function name
  const description = generateDescription(functionName);
  if (description) {
    lines.push(` * ${description}`);
    lines.push(` *`);
  }
  
  // Add parameters
  params.forEach(param => {
    const paramName = param.split('=')[0].trim();
    const type = inferType(param, code);
    lines.push(` * @param {${type}} ${paramName} - Description of ${paramName}`);
  });
  
  // Add return type
  const returnType = inferReturnType(functionName, code);
  lines.push(` * @returns {${returnType}} Description of return value`);
  
  // Add example
  lines.push(` * @example`);
  lines.push(` * ${functionName}(${params.map((p, i) => `param${i + 1}`).join(', ')})`);
  
  lines.push(` */`);
  
  return lines.join('\n');
}

/**
 * Generate description from function name
 */
function generateDescription(functionName) {
  // Convert camelCase to words
  const words = functionName.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
  
  if (functionName.startsWith('get')) return `Retrieves ${words.replace('get ', '')}`;
  if (functionName.startsWith('set')) return `Sets ${words.replace('set ', '')}`;
  if (functionName.startsWith('calculate')) return `Calculates ${words.replace('calculate ', '')}`;
  if (functionName.startsWith('fetch')) return `Fetches ${words.replace('fetch ', '')}`;
  if (functionName.startsWith('create')) return `Creates ${words.replace('create ', '')}`;
  if (functionName.startsWith('update')) return `Updates ${words.replace('update ', '')}`;
  if (functionName.startsWith('delete')) return `Deletes ${words.replace('delete ', '')}`;
  if (functionName.startsWith('is') || functionName.startsWith('has')) return `Checks if ${words}`;
  
  return `Performs ${words} operation`;
}

/**
 * Infer parameter type
 */
function inferType(param, code) {
  const paramName = param.split('=')[0].trim();
  
  // Check for default values
  if (param.includes('= []')) return 'Array';
  if (param.includes('= {}')) return 'Object';
  if (param.includes('= ""') || param.includes("= ''")) return 'string';
  if (param.includes('= 0') || param.includes('= 1')) return 'number';
  if (param.includes('= true') || param.includes('= false')) return 'boolean';
  
  // Check usage in code
  if (code.includes(`${paramName}.length`)) return 'Array|string';
  if (code.includes(`${paramName}.map`) || code.includes(`${paramName}.filter`)) return 'Array';
  if (code.includes(`${paramName}.toString()`)) return 'any';
  if (code.includes(`${paramName} +`) || code.includes(`${paramName} -`)) return 'number';
  
  return 'any';
}

/**
 * Infer return type
 */
function inferReturnType(functionName, code) {
  if (code.includes('return true') || code.includes('return false')) return 'boolean';
  if (code.includes('return []')) return 'Array';
  if (code.includes('return {}')) return 'Object';
  if (code.includes('return ""') || code.includes("return ''")) return 'string';
  if (code.includes('return 0') || code.includes('return 1')) return 'number';
  if (code.includes('return null')) return 'null';
  if (code.includes('return undefined')) return 'undefined';
  if (code.includes('async ') || code.includes('await ')) return 'Promise';
  
  return 'any';
}

/**
 * Generate unit tests for a function
 */
function generateTests(functionName, params, language) {
  const tests = [];
  
  if (language === 'javascript' || language === 'typescript') {
    tests.push(`describe('${functionName}', () => {`);
    tests.push(`  test('should work with valid input', () => {`);
    tests.push(`    const result = ${functionName}(${params.map((p, i) => `testParam${i + 1}`).join(', ')});`);
    tests.push(`    expect(result).toBeDefined();`);
    tests.push(`  });`);
    tests.push(``);
    tests.push(`  test('should handle empty input', () => {`);
    tests.push(`    const result = ${functionName}(${params.map(() => 'null').join(', ')});`);
    tests.push(`    expect(result).toBeDefined();`);
    tests.push(`  });`);
    tests.push(``);
    tests.push(`  test('should handle edge cases', () => {`);
    tests.push(`    // Add edge case tests here`);
    tests.push(`    expect(true).toBe(true);`);
    tests.push(`  });`);
    tests.push(`});`);
  } else if (language === 'python') {
    tests.push(`def test_${functionName}():`);
    tests.push(`    """Test ${functionName} with valid input"""`);
    tests.push(`    result = ${functionName}(${params.map((p, i) => `test_param_${i + 1}`).join(', ')})`);
    tests.push(`    assert result is not None`);
    tests.push(``);
    tests.push(`def test_${functionName}_empty():`);
    tests.push(`    """Test ${functionName} with empty input"""`);
    tests.push(`    result = ${functionName}(${params.map(() => 'None').join(', ')})`);
    tests.push(`    assert result is not None`);
  }
  
  return tests.join('\n');
}

/**
 * Generate comprehensive documentation
 */
function generateDocumentation(code, fileName = '') {
  const language = detectLanguage(code, fileName);
  const functions = extractFunctions(code, language);
  
  const documentation = [];
  const tests = [];
  let testCount = 0;
  
  functions.forEach(func => {
    const params = extractParameters(code, func.name);
    const jsdoc = generateJSDoc(func.name, params, code);
    documentation.push(jsdoc);
    documentation.push(''); // Empty line
    
    const funcTests = generateTests(func.name, params, language);
    tests.push(funcTests);
    tests.push(''); // Empty line
    
    testCount += 3; // Each function gets 3 tests
  });
  
  // Generate README section
  const readme = generateReadme(functions, language);
  
  // Generate edge cases
  const edgeCases = generateEdgeCases(functions);
  
  return {
    documentation: documentation.join('\n') || '// No functions found to document',
    readme,
    tests: tests.join('\n') || '// No tests generated',
    edgeCases,
    metadata: {
      language,
      functionCount: functions.length,
      testCount
    }
  };
}

/**
 * Generate README section
 */
function generateReadme(functions, language) {
  const lines = [
    `## Code Documentation`,
    ``,
    `This ${language} code contains ${functions.length} function(s).`,
    ``,
    `### Functions`,
    ``
  ];
  
  functions.forEach(func => {
    lines.push(`- **${func.name}()** - ${generateDescription(func.name)}`);
  });
  
  lines.push(``);
  lines.push(`### Usage`);
  lines.push(``);
  lines.push(`\`\`\`${language}`);
  if (functions.length > 0) {
    lines.push(`// Example usage of ${functions[0].name}`);
    lines.push(`const result = ${functions[0].name}(param1, param2);`);
  }
  lines.push(`\`\`\``);
  
  return lines.join('\n');
}

/**
 * Generate edge cases
 */
function generateEdgeCases(functions) {
  const cases = [
    '- Null or undefined input parameters',
    '- Empty arrays or objects',
    '- Invalid data types',
    '- Boundary values (min/max)',
    '- Concurrent execution issues',
    '- Error handling and exceptions'
  ];
  
  if (functions.some(f => f.name.includes('async') || f.name.includes('fetch'))) {
    cases.push('- Network failures and timeouts');
    cases.push('- API rate limiting');
  }
  
  if (functions.some(f => f.name.includes('parse') || f.name.includes('convert'))) {
    cases.push('- Malformed input data');
    cases.push('- Character encoding issues');
  }
  
  return cases.join('\n');
}

module.exports = {
  detectLanguage,
  extractFunctions,
  generateDocumentation
};

// Made with Bob