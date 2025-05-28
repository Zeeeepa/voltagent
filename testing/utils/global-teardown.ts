/**
 * Global teardown for integration and E2E tests
 */

export default async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');
  
  // Cleanup test databases, servers, or external dependencies
  // This runs once after all tests in the suite complete
  
  console.log('✅ Global test teardown completed');
}

