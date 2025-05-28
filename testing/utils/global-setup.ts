/**
 * Global setup for integration and E2E tests
 */

export default async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  // Set global test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
  
  // Setup test databases, servers, or external dependencies
  // This runs once before all tests in the suite
  
  console.log('✅ Global test setup completed');
}

