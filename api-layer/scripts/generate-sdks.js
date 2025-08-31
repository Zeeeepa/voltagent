#!/usr/bin/env node

/**
 * Script to generate SDK libraries for different programming languages
 * using OpenAPI Generator.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Supported languages
const LANGUAGES = [
  { name: 'typescript', outputDir: '../sdks/typescript', npmName: '@workflow-orchestration/typescript-sdk' },
  { name: 'python', outputDir: '../sdks/python', packageName: 'workflow_orchestration_sdk' },
  { name: 'java', outputDir: '../sdks/java', invokerPackage: 'com.workfloworchestration.sdk' },
  { name: 'go', outputDir: '../sdks/go', packageName: 'workfloworchestration' },
  { name: 'csharp', outputDir: '../sdks/csharp', packageName: 'WorkflowOrchestration.SDK' }
];

// Path to OpenAPI specification
const OPENAPI_SPEC = path.join(__dirname, '../openapi.json');

/**
 * Generate SDK for a specific language
 */
function generateSdk(language, outputDir, options = {}) {
  console.log(`Generating ${language} SDK...`);
  
  // Create output directory if it doesn't exist
  const fullOutputDir = path.join(__dirname, outputDir);
  if (!fs.existsSync(fullOutputDir)) {
    fs.mkdirSync(fullOutputDir, { recursive: true });
  }
  
  // Build options string
  const optionsString = Object.entries(options)
    .map(([key, value]) => `--additional-properties=${key}=${value}`)
    .join(' ');
  
  // Run OpenAPI Generator
  const command = `npx @openapitools/openapi-generator-cli generate \
    -i ${OPENAPI_SPEC} \
    -g ${language} \
    -o ${fullOutputDir} \
    --skip-validate-spec \
    ${optionsString}`;
  
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${language} SDK generated successfully`);
  } catch (error) {
    console.error(`❌ Error generating ${language} SDK:`, error.message);
    process.exit(1);
  }
}

/**
 * Generate OpenAPI specification from code
 */
function generateOpenApiSpec() {
  console.log('Generating OpenAPI specification...');
  
  try {
    // This assumes you have a script to generate the OpenAPI spec
    // In a real implementation, you might use a tool like swagger-jsdoc
    execSync('npm run generate:openapi', { stdio: 'inherit' });
    console.log('✅ OpenAPI specification generated successfully');
  } catch (error) {
    console.error('❌ Error generating OpenAPI specification:', error.message);
    process.exit(1);
  }
}

/**
 * Main function
 */
function main() {
  // Generate OpenAPI specification
  generateOpenApiSpec();
  
  // Generate SDKs for all languages
  for (const language of LANGUAGES) {
    const { name, outputDir, ...options } = language;
    generateSdk(name, outputDir, options);
  }
  
  console.log('✅ All SDKs generated successfully');
}

// Run the script
main();

