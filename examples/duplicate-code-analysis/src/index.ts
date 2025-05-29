import { Agent } from '@voltagent/core';
import { duplicateCodeDetectionTool } from '../../../packages/core/src/analysis';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Example: Duplicate Code Analysis Agent
 * 
 * This example demonstrates how to create an agent that analyzes
 * source code files for duplicate code and provides refactoring suggestions.
 */

// Sample source files with intentional duplicates for demonstration
const sampleFiles = [
  {
    path: 'src/auth/login.ts',
    content: `
import { User } from '../types/user';

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  if (!email || typeof email !== 'string') {
    return false;
  }
  return emailRegex.test(email.trim().toLowerCase());
}

function validatePassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

function hashPassword(password: string): string {
  // Simple hash function for demo
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export async function loginUser(email: string, password: string): Promise<User | null> {
  if (!validateEmail(email)) {
    throw new Error('Invalid email format');
  }
  
  if (!validatePassword(password)) {
    throw new Error('Invalid password format');
  }
  
  const hashedPassword = hashPassword(password);
  
  // Simulate database lookup
  const user = await findUserByEmail(email);
  if (user && user.passwordHash === hashedPassword) {
    return user;
  }
  
  return null;
}

async function findUserByEmail(email: string): Promise<User | null> {
  // Simulate database query
  return { id: 1, email, passwordHash: 'abc123', name: 'John Doe' };
}
    `
  },
  {
    path: 'src/auth/register.ts',
    content: `
import { User } from '../types/user';

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  if (!email || typeof email !== 'string') {
    return false;
  }
  return emailRegex.test(email.trim().toLowerCase());
}

function validatePassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

function hashPassword(password: string): string {
  // Simple hash function for demo
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export async function registerUser(email: string, password: string, confirmPassword: string): Promise<User> {
  if (!validateEmail(email)) {
    throw new Error('Invalid email format');
  }
  
  if (!validatePassword(password)) {
    throw new Error('Invalid password format');
  }
  
  if (password !== confirmPassword) {
    throw new Error('Passwords do not match');
  }
  
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error('User already exists');
  }
  
  const hashedPassword = hashPassword(password);
  const newUser = await createUser(email, hashedPassword);
  
  return newUser;
}

async function findUserByEmail(email: string): Promise<User | null> {
  // Simulate database query
  return null; // For registration, assume user doesn't exist
}

async function createUser(email: string, passwordHash: string): Promise<User> {
  // Simulate user creation
  return { id: Date.now(), email, passwordHash, name: 'New User' };
}
    `
  },
  {
    path: 'src/auth/password-reset.ts',
    content: `
import { User } from '../types/user';

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  if (!email || typeof email !== 'string') {
    return false;
  }
  return emailRegex.test(email.trim().toLowerCase());
}

function generateResetToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function requestPasswordReset(email: string): Promise<string> {
  if (!validateEmail(email)) {
    throw new Error('Invalid email format');
  }
  
  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error('User not found');
  }
  
  const resetToken = generateResetToken();
  await saveResetToken(user.id, resetToken);
  
  return resetToken;
}

async function findUserByEmail(email: string): Promise<User | null> {
  // Simulate database query
  return { id: 1, email, passwordHash: 'abc123', name: 'John Doe' };
}

async function saveResetToken(userId: number, token: string): Promise<void> {
  // Simulate saving reset token
  console.log(\`Saved reset token \${token} for user \${userId}\`);
}
    `
  },
  {
    path: 'src/utils/validation.ts',
    content: `
export function isValidString(value: any, minLength: number = 1): boolean {
  return typeof value === 'string' && value.length >= minLength;
}

export function isValidNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value);
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}
    `
  },
  {
    path: 'src/types/user.ts',
    content: `
export interface User {
  id: number;
  email: string;
  passwordHash: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  avatar?: string;
  bio?: string;
}
    `
  }
];

// Create the duplicate code analysis agent
const duplicateCodeAnalyzer = new Agent({
  name: 'Duplicate Code Analyzer',
  description: \`I am a code quality specialist that analyzes source code files to detect:
  
  - Exact code duplicates with 100% accuracy
  - Semantic similarities with configurable thresholds  
  - Cross-file duplicate detection
  - Refactoring opportunity suggestions
  - Similarity scoring metrics
  
  I help improve code maintainability by identifying redundant code that can be refactored into shared functions or modules.\`,
  tools: [duplicateCodeDetectionTool],
});

async function runDuplicateCodeAnalysis() {
  console.log('🔍 Starting Duplicate Code Analysis...');
  console.log('=====================================\\n');
  
  try {
    // Run the analysis
    const response = await duplicateCodeAnalyzer.run(
      \`Please analyze the provided source code files for duplicate code. Focus on:
      
      1. Exact duplicate functions and code blocks
      2. Similar validation logic across files
      3. Repeated patterns that could be refactored
      4. Cross-file duplicates that suggest shared utilities
      
      Provide specific refactoring recommendations for each finding.\`,
      {
        tools: {
          duplicate_code_detection: {
            files: sampleFiles,
            config: {
              minLines: 4,
              minTokens: 30,
              similarityThreshold: 0.85,
              ignoreComments: true,
              ignoreWhitespace: true,
              fileExtensions: ['.ts', '.js'],
              excludePatterns: ['node_modules', 'dist', 'build'],
              enableSemanticAnalysis: true,
            }
          }
        }
      }
    );
    
    console.log('📊 Analysis Complete!');
    console.log('====================\\n');
    console.log(response);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

async function runCustomAnalysis() {
  console.log('\\n🔧 Running Custom Analysis Configuration...');
  console.log('=============================================\\n');
  
  try {
    // Run with stricter settings
    const strictResponse = await duplicateCodeAnalyzer.run(
      \`Run a strict duplicate code analysis with high precision settings. 
      Focus only on exact duplicates and very high similarity matches.\`,
      {
        tools: {
          duplicate_code_detection: {
            files: sampleFiles,
            config: {
              minLines: 3,
              minTokens: 20,
              similarityThreshold: 0.95,
              ignoreComments: true,
              ignoreWhitespace: true,
              fileExtensions: ['.ts'],
              excludePatterns: [],
              enableSemanticAnalysis: true,
            }
          }
        }
      }
    );
    
    console.log('📈 Strict Analysis Results:');
    console.log('===========================\\n');
    console.log(strictResponse);
    
  } catch (error) {
    console.error('❌ Custom analysis failed:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 VoltAgent Duplicate Code Detection Example');
  console.log('==============================================\\n');
  
  console.log('📁 Analyzing the following files:');
  sampleFiles.forEach(file => {
    console.log(\`  - \${file.path}\`);
  });
  console.log('');
  
  // Run standard analysis
  await runDuplicateCodeAnalysis();
  
  // Run custom analysis with different settings
  await runCustomAnalysis();
  
  console.log('\\n✅ Example completed successfully!');
  console.log('\\n💡 Key Takeaways:');
  console.log('  - The validateEmail function appears in multiple files (exact duplicate)');
  console.log('  - The validatePassword function is duplicated across auth files');
  console.log('  - The hashPassword function could be extracted to a shared utility');
  console.log('  - Consider creating a shared validation module');
  console.log('\\n🔧 Suggested Refactoring:');
  console.log('  1. Create src/utils/auth-validation.ts');
  console.log('  2. Move validateEmail, validatePassword to shared module');
  console.log('  3. Create src/utils/crypto.ts for hashPassword function');
  console.log('  4. Update imports in login.ts, register.ts, password-reset.ts');
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { duplicateCodeAnalyzer, sampleFiles };

