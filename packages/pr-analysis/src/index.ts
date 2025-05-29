/**
 * PR Analysis Package
 * Comprehensive code analysis modules for pull requests
 */

export * from './types/index.js';
export * from './modules/compliance/index.js';

// Re-export the main compliance analysis module
export { ComplianceAnalysisModule } from './modules/compliance/index.js';

/**
 * Factory function to create a compliance analysis module
 */
export function createComplianceAnalysisModule() {
  return new ComplianceAnalysisModule();
}

/**
 * Utility function to analyze files with the compliance module
 */
export async function analyzeCompliance(files: Array<{path: string, content: string}>) {
  const module = createComplianceAnalysisModule();
  
  const fileInfos = files.map(file => ({
    path: file.path,
    content: file.content,
    language: detectLanguageFromPath(file.path),
    size: file.content.length,
    modified: true
  }));

  return await module.analyze(fileInfos);
}

/**
 * Utility function to detect language from file path
 */
function detectLanguageFromPath(filePath: string): string {
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
    case 'cs':
      return 'csharp';
    case 'cpp':
    case 'cc':
    case 'cxx':
      return 'cpp';
    case 'c':
      return 'c';
    case 'h':
    case 'hpp':
      return 'header';
    default:
      return 'unknown';
  }
}

