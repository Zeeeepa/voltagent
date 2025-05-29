import { LanguagePatterns, AnalysisContext } from "./types";

// TypeScript/JavaScript patterns
const typescriptPatterns: LanguagePatterns = {
  trycatch: [
    /try\s*\{[\s\S]*?\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*?\}/g,
    /try\s*\{[\s\S]*?\}\s*finally\s*\{[\s\S]*?\}/g,
    /\.catch\s*\([^)]*\)\s*=>/g,
    /\.catch\s*\([\s\S]*?\)/g
  ],
  errorHandling: [
    /if\s*\([^)]*error[^)]*\)/gi,
    /if\s*\([^)]*err[^)]*\)/gi,
    /throw\s+new\s+\w*Error/g,
    /throw\s+\w*Error/g,
    /reject\s*\(/g
  ],
  exceptionThrow: [
    /throw\s+new\s+\w+/g,
    /throw\s+\w+/g,
    /Promise\.reject/g,
    /reject\s*\(/g
  ],
  errorReturn: [
    /return\s+\{[\s\S]*?error[\s\S]*?\}/g,
    /return\s+null/g,
    /return\s+undefined/g,
    /return\s+false/g
  ],
  logging: [
    /console\.(error|warn|log)/g,
    /logger\.(error|warn|info|debug)/g,
    /log\.(error|warn|info|debug)/g,
    /winston\.(error|warn|info|debug)/g
  ],
  asyncPatterns: [
    /async\s+function/g,
    /await\s+/g,
    /\.then\s*\(/g,
    /\.catch\s*\(/g,
    /Promise\./g
  ],
  resourceManagement: [
    /new\s+\w+Connection/g,
    /\.connect\s*\(/g,
    /\.close\s*\(/g,
    /\.dispose\s*\(/g,
    /fs\.\w+/g
  ]
};

// Python patterns
const pythonPatterns: LanguagePatterns = {
  trycatch: [
    /try:\s*[\s\S]*?except[\s\S]*?:/g,
    /try:\s*[\s\S]*?finally:/g,
    /with\s+\w+/g
  ],
  errorHandling: [
    /except\s+\w*Error/g,
    /except\s+Exception/g,
    /if\s+.*error/gi,
    /raise\s+\w*Error/g
  ],
  exceptionThrow: [
    /raise\s+\w+/g,
    /raise\s+Exception/g,
    /assert\s+/g
  ],
  errorReturn: [
    /return\s+None/g,
    /return\s+False/g,
    /return\s+\{\s*["']error["']/g
  ],
  logging: [
    /logging\.(error|warning|info|debug)/g,
    /logger\.(error|warning|info|debug)/g,
    /print\s*\(/g
  ],
  asyncPatterns: [
    /async\s+def/g,
    /await\s+/g,
    /asyncio\./g
  ],
  resourceManagement: [
    /with\s+open/g,
    /\.close\s*\(/g,
    /\.connect\s*\(/g,
    /\.disconnect\s*\(/g
  ]
};

// Go patterns
const goPatterns: LanguagePatterns = {
  trycatch: [
    /defer\s+/g,
    /recover\s*\(/g
  ],
  errorHandling: [
    /if\s+err\s*!=\s*nil/g,
    /if\s+\w+\s*!=\s*nil/g,
    /return\s+[\w,\s]*err/g,
    /errors\.New/g
  ],
  exceptionThrow: [
    /panic\s*\(/g,
    /errors\.New/g,
    /fmt\.Errorf/g
  ],
  errorReturn: [
    /return\s+[\w,\s]*err/g,
    /return\s+[\w,\s]*nil/g,
    /return\s+[\w,\s]*false/g
  ],
  logging: [
    /log\.(Print|Fatal|Panic)/g,
    /fmt\.Print/g,
    /logger\./g
  ],
  asyncPatterns: [
    /go\s+func/g,
    /go\s+\w+/g,
    /chan\s+/g,
    /<-\s*\w+/g
  ],
  resourceManagement: [
    /defer\s+/g,
    /\.Close\s*\(/g,
    /sql\.Open/g,
    /os\.Open/g
  ]
};

// Java patterns
const javaPatterns: LanguagePatterns = {
  trycatch: [
    /try\s*\{[\s\S]*?\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*?\}/g,
    /try\s*\{[\s\S]*?\}\s*finally\s*\{[\s\S]*?\}/g,
    /try\s*\([^)]*\)\s*\{[\s\S]*?\}/g // try-with-resources
  ],
  errorHandling: [
    /catch\s*\(\s*\w*Exception/g,
    /throws\s+\w*Exception/g,
    /if\s*\([^)]*exception[^)]*\)/gi,
    /instanceof\s+\w*Exception/g
  ],
  exceptionThrow: [
    /throw\s+new\s+\w*Exception/g,
    /throw\s+\w+/g
  ],
  errorReturn: [
    /return\s+null/g,
    /return\s+false/g,
    /Optional\.empty/g
  ],
  logging: [
    /logger\.(error|warn|info|debug)/g,
    /log\.(error|warn|info|debug)/g,
    /System\.out\.print/g,
    /System\.err\.print/g
  ],
  asyncPatterns: [
    /CompletableFuture/g,
    /Future</g,
    /async/g,
    /ExecutorService/g
  ],
  resourceManagement: [
    /try\s*\([^)]*\)/g, // try-with-resources
    /\.close\s*\(/g,
    /new\s+\w*Connection/g,
    /DriverManager\.getConnection/g
  ]
};

// Error-prone operations by language
const errorProneOperations = {
  typescript: [
    'fetch', 'axios', 'http.request', 'fs.readFile', 'fs.writeFile',
    'JSON.parse', 'parseInt', 'parseFloat', 'database.query',
    'connection.execute', 'redis.get', 'redis.set'
  ],
  javascript: [
    'fetch', 'axios', 'http.request', 'fs.readFile', 'fs.writeFile',
    'JSON.parse', 'parseInt', 'parseFloat', 'database.query',
    'connection.execute', 'redis.get', 'redis.set'
  ],
  python: [
    'requests.get', 'requests.post', 'open', 'json.loads', 'int()', 'float()',
    'cursor.execute', 'connection.execute', 'redis.get', 'redis.set'
  ],
  go: [
    'http.Get', 'http.Post', 'os.Open', 'json.Unmarshal', 'strconv.Atoi',
    'db.Query', 'db.Exec', 'redis.Get', 'redis.Set'
  ],
  java: [
    'HttpClient.send', 'Files.readAllLines', 'Integer.parseInt', 'Double.parseDouble',
    'PreparedStatement.executeQuery', 'Connection.createStatement'
  ]
};

// Common error types by language
const commonErrorTypes = {
  typescript: [
    'TypeError', 'ReferenceError', 'SyntaxError', 'RangeError',
    'NetworkError', 'DatabaseError', 'ValidationError'
  ],
  javascript: [
    'TypeError', 'ReferenceError', 'SyntaxError', 'RangeError',
    'NetworkError', 'DatabaseError', 'ValidationError'
  ],
  python: [
    'TypeError', 'ValueError', 'KeyError', 'IndexError', 'AttributeError',
    'FileNotFoundError', 'ConnectionError', 'TimeoutError'
  ],
  go: [
    'error', 'panic', 'runtime.Error', 'net.Error', 'os.PathError',
    'json.SyntaxError', 'sql.ErrNoRows'
  ],
  java: [
    'NullPointerException', 'IllegalArgumentException', 'IOException',
    'SQLException', 'NumberFormatException', 'ClassCastException'
  ]
};

// Get analysis context for a specific language
export function getAnalysisContext(language: string): AnalysisContext {
  const normalizedLang = language.toLowerCase();
  
  let patterns: LanguagePatterns;
  switch (normalizedLang) {
    case 'typescript':
    case 'ts':
      patterns = typescriptPatterns;
      break;
    case 'javascript':
    case 'js':
      patterns = typescriptPatterns; // Same patterns for JS/TS
      break;
    case 'python':
    case 'py':
      patterns = pythonPatterns;
      break;
    case 'go':
    case 'golang':
      patterns = goPatterns;
      break;
    case 'java':
      patterns = javaPatterns;
      break;
    default:
      patterns = typescriptPatterns; // Default to TypeScript patterns
  }

  return {
    language: normalizedLang,
    patterns,
    errorProneOperations: errorProneOperations[normalizedLang as keyof typeof errorProneOperations] || errorProneOperations.typescript,
    commonErrorTypes: commonErrorTypes[normalizedLang as keyof typeof commonErrorTypes] || commonErrorTypes.typescript
  };
}

// Detect language from file extension
export function detectLanguage(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'py':
      return 'python';
    case 'go':
      return 'go';
    case 'java':
      return 'java';
    default:
      return 'typescript'; // Default
  }
}

