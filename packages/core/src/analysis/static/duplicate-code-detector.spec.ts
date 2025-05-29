import { duplicateCodeDetectionTool } from './duplicate-code-detector';

describe('Duplicate Code Detection Tool', () => {
  const sampleFiles = [
    {
      path: 'src/auth/login.ts',
      content: `
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): boolean {
  return password.length >= 8;
}

export function loginUser(email: string, password: string) {
  if (!validateEmail(email)) {
    throw new Error('Invalid email');
  }
  if (!validatePassword(password)) {
    throw new Error('Invalid password');
  }
  // Login logic here
  return { success: true };
}
      `
    },
    {
      path: 'src/auth/register.ts',
      content: `
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): boolean {
  return password.length >= 8;
}

export function registerUser(email: string, password: string, confirmPassword: string) {
  if (!validateEmail(email)) {
    throw new Error('Invalid email');
  }
  if (!validatePassword(password)) {
    throw new Error('Invalid password');
  }
  if (password !== confirmPassword) {
    throw new Error('Passwords do not match');
  }
  // Registration logic here
  return { success: true };
}
      `
    },
    {
      path: 'src/utils/helpers.ts',
      content: `
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function capitalizeString(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
      `
    }
  ];

  it('should detect exact duplicate functions', async () => {
    const result = await duplicateCodeDetectionTool.execute({
      files: sampleFiles,
      config: {
        minLines: 3,
        minTokens: 20,
        similarityThreshold: 0.8,
        ignoreComments: true,
        ignoreWhitespace: true,
        fileExtensions: ['.ts', '.js'],
        excludePatterns: ['node_modules'],
        enableSemanticAnalysis: true,
      }
    });

    expect(result).toBeDefined();
    expect(result.module).toBe('duplicate_code_detection');
    expect(result.findings).toBeInstanceOf(Array);
    expect(result.summary.files_analyzed).toBe(3);
    
    // Should find duplicate validateEmail and validatePassword functions
    const exactDuplicates = result.findings.filter(f => f.type === 'exact_duplicate');
    expect(exactDuplicates.length).toBeGreaterThan(0);
    
    // Check that duplicate locations are identified
    const emailValidationDuplicate = exactDuplicates.find(d => 
      d.code_snippet?.includes('validateEmail')
    );
    expect(emailValidationDuplicate).toBeDefined();
    expect(emailValidationDuplicate?.locations).toHaveLength(2);
    expect(emailValidationDuplicate?.similarity_score).toBe(1.0);
  });

  it('should handle empty file list', async () => {
    const result = await duplicateCodeDetectionTool.execute({
      files: [],
      config: {
        minLines: 5,
        minTokens: 50,
        similarityThreshold: 0.8,
        ignoreComments: true,
        ignoreWhitespace: true,
        fileExtensions: ['.ts'],
        excludePatterns: [],
        enableSemanticAnalysis: true,
      }
    });

    expect(result.module).toBe('duplicate_code_detection');
    expect(result.findings).toHaveLength(0);
    expect(result.summary.files_analyzed).toBe(0);
    expect(result.summary.total_duplicates).toBe(0);
  });

  it('should filter files by extension', async () => {
    const mixedFiles = [
      ...sampleFiles,
      {
        path: 'README.md',
        content: '# This is a markdown file\nSome content here'
      },
      {
        path: 'config.json',
        content: '{"key": "value"}'
      }
    ];

    const result = await duplicateCodeDetectionTool.execute({
      files: mixedFiles,
      config: {
        minLines: 3,
        minTokens: 20,
        similarityThreshold: 0.8,
        ignoreComments: true,
        ignoreWhitespace: true,
        fileExtensions: ['.ts'],
        excludePatterns: [],
        enableSemanticAnalysis: true,
      }
    });

    // Should only analyze .ts files
    expect(result.summary.files_analyzed).toBe(3);
  });

  it('should exclude files matching exclude patterns', async () => {
    const filesWithNodeModules = [
      ...sampleFiles,
      {
        path: 'node_modules/some-package/index.js',
        content: 'module.exports = {};'
      }
    ];

    const result = await duplicateCodeDetectionTool.execute({
      files: filesWithNodeModules,
      config: {
        minLines: 3,
        minTokens: 20,
        similarityThreshold: 0.8,
        ignoreComments: true,
        ignoreWhitespace: true,
        fileExtensions: ['.ts', '.js'],
        excludePatterns: ['node_modules'],
        enableSemanticAnalysis: true,
      }
    });

    // Should exclude node_modules file
    expect(result.summary.files_analyzed).toBe(3);
  });

  it('should detect semantic similarities', async () => {
    const similarFiles = [
      {
        path: 'src/user-service.ts',
        content: `
export function createUser(userData: any) {
  if (!userData.email) {
    throw new Error('Email is required');
  }
  if (!userData.name) {
    throw new Error('Name is required');
  }
  return saveToDatabase(userData);
}
        `
      },
      {
        path: 'src/product-service.ts',
        content: `
export function createProduct(productData: any) {
  if (!productData.name) {
    throw new Error('Name is required');
  }
  if (!productData.price) {
    throw new Error('Price is required');
  }
  return saveToDatabase(productData);
}
        `
      }
    ];

    const result = await duplicateCodeDetectionTool.execute({
      files: similarFiles,
      config: {
        minLines: 3,
        minTokens: 20,
        similarityThreshold: 0.6,
        ignoreComments: true,
        ignoreWhitespace: true,
        fileExtensions: ['.ts'],
        excludePatterns: [],
        enableSemanticAnalysis: true,
      }
    });

    const semanticSimilarities = result.findings.filter(f => 
      f.type === 'semantic_similar' || f.type === 'structural_similar'
    );
    expect(semanticSimilarities.length).toBeGreaterThan(0);
    
    const similarity = semanticSimilarities[0];
    expect(similarity.similarity_score).toBeGreaterThan(0.6);
    expect(similarity.similarity_score).toBeLessThan(1.0);
  });

  it('should provide appropriate refactoring suggestions', async () => {
    const result = await duplicateCodeDetectionTool.execute({
      files: sampleFiles,
      config: {
        minLines: 3,
        minTokens: 20,
        similarityThreshold: 0.8,
        ignoreComments: true,
        ignoreWhitespace: true,
        fileExtensions: ['.ts'],
        excludePatterns: [],
        enableSemanticAnalysis: true,
      }
    });

    const exactDuplicates = result.findings.filter(f => f.type === 'exact_duplicate');
    
    for (const duplicate of exactDuplicates) {
      expect(duplicate.suggestion).toBeDefined();
      expect(duplicate.refactor_opportunity).toBeDefined();
      expect(duplicate.similarity_score).toBe(1.0);
      expect(duplicate.locations.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('should calculate severity correctly', async () => {
    // Test with many duplicates (should be high severity)
    const manyDuplicateFiles = Array.from({ length: 15 }, (_, i) => ({
      path: `src/file${i}.ts`,
      content: `
function duplicateFunction() {
  console.log('This is a duplicate');
  return true;
}
      `
    }));

    const highSeverityResult = await duplicateCodeDetectionTool.execute({
      files: manyDuplicateFiles,
      config: {
        minLines: 3,
        minTokens: 20,
        similarityThreshold: 0.8,
        ignoreComments: true,
        ignoreWhitespace: true,
        fileExtensions: ['.ts'],
        excludePatterns: [],
        enableSemanticAnalysis: false,
      }
    });

    expect(highSeverityResult.severity).toBe('high');

    // Test with few duplicates (should be low severity)
    const fewDuplicateFiles = sampleFiles.slice(0, 1);
    const lowSeverityResult = await duplicateCodeDetectionTool.execute({
      files: fewDuplicateFiles,
      config: {
        minLines: 3,
        minTokens: 20,
        similarityThreshold: 0.8,
        ignoreComments: true,
        ignoreWhitespace: true,
        fileExtensions: ['.ts'],
        excludePatterns: [],
        enableSemanticAnalysis: true,
      }
    });

    expect(lowSeverityResult.severity).toBe('low');
  });

  it('should handle configuration options correctly', async () => {
    // Test with semantic analysis disabled
    const result = await duplicateCodeDetectionTool.execute({
      files: sampleFiles,
      config: {
        minLines: 3,
        minTokens: 20,
        similarityThreshold: 0.8,
        ignoreComments: true,
        ignoreWhitespace: true,
        fileExtensions: ['.ts'],
        excludePatterns: [],
        enableSemanticAnalysis: false,
      }
    });

    const semanticFindings = result.findings.filter(f => 
      f.type === 'semantic_similar' || f.type === 'structural_similar'
    );
    expect(semanticFindings).toHaveLength(0);
    expect(result.summary.semantic_duplicates).toBe(0);
  });

  it('should include analysis metadata', async () => {
    const result = await duplicateCodeDetectionTool.execute({
      files: sampleFiles,
      config: {
        minLines: 3,
        minTokens: 20,
        similarityThreshold: 0.8,
        ignoreComments: true,
        ignoreWhitespace: true,
        fileExtensions: ['.ts'],
        excludePatterns: [],
        enableSemanticAnalysis: true,
      }
    });

    expect(result.config_used).toBeDefined();
    expect(result.analysis_timestamp).toBeDefined();
    expect(new Date(result.analysis_timestamp)).toBeInstanceOf(Date);
  });
});

