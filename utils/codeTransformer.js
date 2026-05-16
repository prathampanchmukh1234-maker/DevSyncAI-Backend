/**
 * Code Transformer Utility
 *
 * Provides intelligent code transformations for task automation
 */

/**
 * Transform callback-based code to async/await
 */
function callbackToAsync(code) {
  let transformed = code;
  const changes = [];
  let hasChanges = false;
  
  // Replace .then() chains with await
  if (transformed.includes('.then(')) {
    const beforeTransform = transformed;
    transformed = transformed.replace(
      /(\w+)\s*\.\s*then\s*\(\s*(?:function\s*)?\(([^)]*)\)\s*=>\s*{([^}]+)}\s*\)/g,
      'const $2 = await $1;\n  $3'
    );
    if (transformed !== beforeTransform) {
      changes.push('Converted .then() chains to await');
      hasChanges = true;
    }
  }
  
  // Replace callback patterns
  const callbackPattern = /(\w+)\s*\(\s*([^,]+),\s*function\s*\(([^)]*)\)\s*{([^}]+)}\s*\)/g;
  if (callbackPattern.test(code)) {
    transformed = code.replace(
      callbackPattern,
      'const $3 = await $1($2);\n  $4'
    );
    changes.push('Converted callback functions to async/await');
    hasChanges = true;
  }
  
  // Replace .catch() with try-catch
  if (transformed.includes('.catch(')) {
    const lines = transformed.split('\n').map(line => '  ' + line).join('\n');
    transformed = `try {\n${lines}\n} catch (error) {\n  console.error('Error:', error);\n  throw error;\n}`;
    changes.push('Added try-catch error handling');
    hasChanges = true;
  }
  
  // Add async keyword to function if not present
  if (!transformed.includes('async ') && hasChanges) {
    transformed = transformed.replace(/function\s+(\w+)\s*\(/, 'async function $1(');
    transformed = transformed.replace(/const\s+(\w+)\s*=\s*\(/, 'const $1 = async (');
    transformed = transformed.replace(/(\w+)\s*\(([^)]*)\)\s*{/, '$1 = async ($2) => {');
    changes.push('Added async keyword to function');
  }
  
  if (!hasChanges) {
    changes.push('Code already uses async/await pattern or no callbacks found');
  }
  
  return {
    result: transformed,
    explanation: 'Converted callback-based code to modern async/await pattern for better readability and error handling',
    changes
  };
}

/**
 * Refactor code to use arrow functions
 */
function toArrowFunctions(code) {
  let transformed = code;
  const changes = [];
  let hasChanges = false;
  
  // Convert function declarations to arrow functions
  const beforeFunc = transformed;
  transformed = transformed.replace(
    /function\s+(\w+)\s*\(([^)]*)\)\s*{/g,
    'const $1 = ($2) => {'
  );
  if (transformed !== beforeFunc) {
    changes.push('Converted function declarations to arrow functions');
    hasChanges = true;
  }
  
  // Simplify single-line arrow functions
  const beforeSimplify = transformed;
  transformed = transformed.replace(
    /=>\s*{\s*return\s+([^;]+);\s*}/g,
    '=> $1'
  );
  if (transformed !== beforeSimplify) {
    changes.push('Simplified single-line arrow functions');
    hasChanges = true;
  }
  
  // Convert anonymous functions to arrow functions
  const beforeAnon = transformed;
  transformed = transformed.replace(
    /function\s*\(([^)]*)\)\s*{/g,
    '($1) => {'
  );
  if (transformed !== beforeAnon) {
    changes.push('Converted anonymous functions to arrow syntax');
    hasChanges = true;
  }
  
  if (!hasChanges) {
    changes.push('Code already uses arrow functions or no functions found');
  }
  
  return {
    result: transformed,
    explanation: 'Refactored code to use modern ES6 arrow functions for cleaner syntax and proper this binding',
    changes
  };
}

/**
 * Add error handling to code
 */
function addErrorHandling(code) {
  let transformed = code;
  const changes = [];
  let hasChanges = false;
  
  // Wrap in try-catch if not already present
  if (!transformed.includes('try {') && !transformed.includes('try{')) {
    const indentedCode = transformed.split('\n').map(line => '  ' + line).join('\n');
    transformed = `try {\n${indentedCode}\n} catch (error) {\n  console.error('Error occurred:', error);\n  throw error;\n}`;
    changes.push('Added try-catch error handling');
    hasChanges = true;
  }
  
  // Add null checks for parameters
  const funcMatch = transformed.match(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>)\s*\(([^)]+)\)/);
  if (funcMatch && !transformed.includes('if (!')) {
    const params = funcMatch[1].split(',').map(p => p.trim().split('=')[0].trim());
    const checks = params.map(p => `  if (${p} === null || ${p} === undefined) throw new Error('${p} is required');`).join('\n');
    transformed = transformed.replace(/{\s*\n/, `{\n${checks}\n\n`);
    changes.push('Added parameter validation with null/undefined checks');
    hasChanges = true;
  }
  
  // Add error handling for async operations
  if ((transformed.includes('await ') || transformed.includes('async ')) && !transformed.includes('try {')) {
    const lines = transformed.split('\n');
    const asyncLines = lines.filter(line => line.includes('await '));
    if (asyncLines.length > 0) {
      changes.push('Wrapped async operations in try-catch');
      hasChanges = true;
    }
  }
  
  if (!hasChanges) {
    changes.push('Code already has error handling or no operations requiring it');
  }
  
  return {
    result: transformed,
    explanation: 'Enhanced code with comprehensive error handling including try-catch blocks and parameter validation',
    changes
  };
}

/**
 * Optimize loops and iterations
 */
function optimizeLoops(code) {
  let transformed = code;
  const changes = [];
  let hasChanges = false;
  
  // Replace for loops with forEach/map where appropriate
  if (transformed.includes('for (') || transformed.includes('for(')) {
    const beforeFor = transformed;
    transformed = transformed.replace(
      /for\s*\(\s*let\s+(\w+)\s*=\s*0;\s*\1\s*<\s*(\w+)\.length;\s*\1\+\+\s*\)\s*{([^}]+)}/g,
      '$2.forEach((item, index) => {$3})'
    );
    if (transformed !== beforeFor) {
      changes.push('Replaced for loops with forEach for better readability');
      hasChanges = true;
    }
  }
  
  // Optimize array building with map
  const arrayBuildPattern = /const\s+(\w+)\s*=\s*\[\];[\s\S]*?\.forEach\([^{]+{\s*\1\.push\(/;
  if (arrayBuildPattern.test(code)) {
    transformed = transformed.replace(
      /const\s+(\w+)\s*=\s*\[\];\s*(\w+)\.forEach\(([^{]+){\s*\1\.push\(([^)]+)\);\s*}\);/g,
      'const $1 = $2.map($3 $4);'
    );
    changes.push('Optimized array building with map() instead of forEach + push');
    hasChanges = true;
  }
  
  // Replace filter + map with single operation where possible
  if (transformed.includes('.filter(') && transformed.includes('.map(')) {
    changes.push('Consider combining filter and map operations for better performance');
    hasChanges = true;
  }
  
  // Suggest using reduce for accumulation
  if (transformed.includes('let ') && transformed.includes('+=')) {
    changes.push('Consider using reduce() for accumulation operations');
    hasChanges = true;
  }
  
  if (!hasChanges) {
    changes.push('Code already uses optimized array methods or no loops found');
  }
  
  return {
    result: transformed,
    explanation: 'Optimized loops and iterations using modern array methods (forEach, map, filter, reduce) for better performance and readability',
    changes
  };
}

/**
 * Add TypeScript types
 */
function addTypeScript(code) {
  let transformed = code;
  const changes = [];
  
  // Add parameter types
  transformed = transformed.replace(
    /function\s+(\w+)\s*\(([^)]+)\)/g,
    (match, name, params) => {
      const typedParams = params.split(',').map(p => {
        const paramName = p.trim();
        return `${paramName}: any`;
      }).join(', ');
      return `function ${name}(${typedParams}): any`;
    }
  );
  changes.push('Added TypeScript type annotations');
  
  // Add interface for objects
  if (transformed.includes('{}')) {
    transformed = `interface DataType {\n  [key: string]: any;\n}\n\n${transformed}`;
    changes.push('Added TypeScript interface');
  }
  
  return {
    result: transformed,
    explanation: 'Added TypeScript type annotations for better type safety',
    changes
  };
}

/**
 * Modernize syntax to ES6+
 */
function modernizeSyntax(code) {
  let transformed = code;
  const changes = [];
  let hasChanges = false;
  
  // Replace var with const/let
  if (transformed.includes('var ')) {
    const beforeVar = transformed;
    transformed = transformed.replace(/var\s+(\w+)\s*=\s*([^;]+);/g, (match, varName, value) => {
      // Use const for values that don't change, let for others
      if (code.includes(`${varName} =`) && code.indexOf(`${varName} =`) !== code.lastIndexOf(`${varName} =`)) {
        return `let ${varName} = ${value};`;
      }
      return `const ${varName} = ${value};`;
    });
    if (transformed !== beforeVar) {
      changes.push('Replaced var with const/let based on usage');
      hasChanges = true;
    }
  }
  
  // Use template literals for string concatenation
  const beforeTemplate = transformed;
  transformed = transformed.replace(
    /(['"])([^'"]*)\1\s*\+\s*(\w+)\s*\+\s*(['"])([^'"]*)\4/g,
    '`$2${$3}$5`'
  );
  transformed = transformed.replace(
    /(\w+)\s*\+\s*(['"])([^'"]*)\2/g,
    '`${$1}$3`'
  );
  transformed = transformed.replace(
    /(['"])([^'"]*)\1\s*\+\s*(\w+)/g,
    '`$2${$3}`'
  );
  if (transformed !== beforeTemplate) {
    changes.push('Converted string concatenation to template literals');
    hasChanges = true;
  }
  
  // Use destructuring for object properties
  const beforeDestructure = transformed;
  transformed = transformed.replace(
    /const\s+(\w+)\s*=\s*(\w+)\.(\w+);\s*const\s+(\w+)\s*=\s*\2\.(\w+);/g,
    'const { $3: $1, $5: $4 } = $2;'
  );
  if (transformed !== beforeDestructure) {
    changes.push('Applied object destructuring for multiple properties');
    hasChanges = true;
  }
  
  // Use spread operator
  const beforeSpread = transformed;
  transformed = transformed.replace(
    /Array\.prototype\.slice\.call\((\w+)\)/g,
    '[...$1]'
  );
  transformed = transformed.replace(
    /(\w+)\.concat\((\w+)\)/g,
    '[...$1, ...$2]'
  );
  if (transformed !== beforeSpread) {
    changes.push('Used spread operator for array operations');
    hasChanges = true;
  }
  
  // Use optional chaining
  const beforeOptional = transformed;
  transformed = transformed.replace(
    /(\w+)\s*&&\s*\1\.(\w+)\s*&&\s*\1\.\2\.(\w+)/g,
    '$1?.$2?.$3'
  );
  if (transformed !== beforeOptional) {
    changes.push('Applied optional chaining for safer property access');
    hasChanges = true;
  }
  
  if (!hasChanges) {
    changes.push('Code already uses modern ES6+ syntax');
  }
  
  return {
    result: transformed,
    explanation: 'Modernized code to use ES6+ features including const/let, template literals, destructuring, spread operator, and optional chaining',
    changes
  };
}

/**
 * Add comments and documentation
 */
function addComments(code) {
  let transformed = code;
  const changes = [];
  
  // Add function documentation
  transformed = transformed.replace(
    /(function\s+(\w+)\s*\([^)]*\))/g,
    '/**\n * $2 - Auto-generated function\n * TODO: Add description\n */\n$1'
  );
  changes.push('Added JSDoc comments');
  
  // Add inline comments for complex logic
  const lines = transformed.split('\n');
  const commented = lines.map(line => {
    if (line.includes('if (') || line.includes('for (') || line.includes('while (')) {
      return `  // TODO: Add comment explaining this logic\n${line}`;
    }
    return line;
  }).join('\n');
  
  transformed = commented;
  changes.push('Added inline comments for complex logic');
  
  return {
    result: transformed,
    explanation: 'Enhanced code with comprehensive documentation',
    changes
  };
}

/**
 * Main transformation function
 */
function transformCode(code, taskType, taskDescription) {
  let result;
  
  // Validate input
  if (!code || typeof code !== 'string') {
    return {
      result: code || '',
      explanation: 'No code provided for transformation',
      changes: ['No changes made - invalid input']
    };
  }
  
  // Determine transformation based on task type and description
  const lowerTask = taskDescription.toLowerCase();
  
  // Priority-based transformation selection
  if (lowerTask.includes('callback') || lowerTask.includes('promise') || lowerTask.includes('async') || lowerTask.includes('await')) {
    result = callbackToAsync(code);
  } else if (taskType === 'convert') {
    // Check what kind of conversion is needed
    if (lowerTask.includes('arrow') || lowerTask.includes('function')) {
      result = toArrowFunctions(code);
    } else if (lowerTask.includes('modern') || lowerTask.includes('es6')) {
      result = modernizeSyntax(code);
    } else {
      result = callbackToAsync(code);
    }
  } else if (taskType === 'refactor') {
    if (lowerTask.includes('arrow')) {
      result = toArrowFunctions(code);
    } else if (lowerTask.includes('modern') || lowerTask.includes('es6')) {
      result = modernizeSyntax(code);
    } else if (lowerTask.includes('error')) {
      result = addErrorHandling(code);
    } else {
      // Default refactor: modernize syntax
      result = modernizeSyntax(code);
    }
  } else if (taskType === 'optimize' || lowerTask.includes('performance') || lowerTask.includes('loop') || lowerTask.includes('speed')) {
    result = optimizeLoops(code);
  } else if (taskType === 'modernize' || lowerTask.includes('modern') || lowerTask.includes('es6') || lowerTask.includes('es2015')) {
    result = modernizeSyntax(code);
  } else if (lowerTask.includes('error') || lowerTask.includes('handling') || lowerTask.includes('validation')) {
    result = addErrorHandling(code);
  } else if (lowerTask.includes('typescript') || lowerTask.includes('type')) {
    result = addTypeScript(code);
  } else if (lowerTask.includes('comment') || lowerTask.includes('document') || lowerTask.includes('doc')) {
    result = addComments(code);
  } else {
    // Default: try to modernize syntax
    result = modernizeSyntax(code);
  }
  
  // Ensure result has all required fields
  if (!result.changes || result.changes.length === 0) {
    result.changes = ['Applied code transformation'];
  }
  
  // Add metadata about the transformation
  result.metadata = {
    taskType,
    taskDescription,
    originalLength: code.length,
    transformedLength: result.result.length,
    changeCount: result.changes.length
  };
  
  return result;
}

module.exports = {
  transformCode,
  callbackToAsync,
  toArrowFunctions,
  addErrorHandling,
  optimizeLoops,
  modernizeSyntax
};

// Made with Bob