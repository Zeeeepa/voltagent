// Sample TypeScript code with various error handling issues
// This file is used to test the error handling analyzer

import { DatabaseConnection } from './database';
import { Logger } from './logger';

const logger = new Logger();
const db = new DatabaseConnection();

// ❌ Missing error handling for async operation
export async function fetchUser(id: string) {
  const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  return user;
}

// ❌ Empty catch block (error swallowing)
export async function createUser(userData: any) {
  try {
    const result = await db.insert('users', userData);
    return result;
  } catch (e) {
    // Silent failure - bad practice
  }
}

// ❌ Generic error handling without specificity
export async function updateUser(id: string, data: any) {
  try {
    const result = await db.update('users', data, { id });
    return result;
  } catch (error) {
    console.log('Something went wrong');
    throw error;
  }
}

// ❌ Missing error handling for JSON parsing
export function parseUserData(jsonString: string) {
  const data = JSON.parse(jsonString); // Can throw SyntaxError
  return data;
}

// ❌ No error handling for file operations
export async function saveUserAvatar(userId: string, imageData: Buffer) {
  const fs = require('fs');
  await fs.promises.writeFile(`/uploads/${userId}.jpg`, imageData);
  return `/uploads/${userId}.jpg`;
}

// ❌ Promise without catch handler
export function fetchUserProfile(id: string) {
  return fetch(`/api/users/${id}`)
    .then(response => response.json())
    .then(data => data.profile); // No error handling
}

// ❌ Resource leak - connection not closed
export async function getUserStats(id: string) {
  const connection = await db.getConnection();
  const stats = await connection.query('SELECT COUNT(*) FROM user_actions WHERE user_id = ?', [id]);
  return stats;
  // Connection never closed!
}

// ❌ Async function without try-catch
export async function processUserBatch(userIds: string[]) {
  const results = [];
  for (const id of userIds) {
    const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    const processed = await processUserData(user);
    results.push(processed);
  }
  return results;
}

// ❌ Error propagation without context
export async function deleteUser(id: string) {
  try {
    await db.delete('users', { id });
  } catch (err) {
    throw err; // No additional context
  }
}

// ❌ Missing validation error handling
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email); // Should handle invalid input
}

// ✅ Good example with proper error handling
export async function getUserSafely(id: string) {
  try {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid user ID provided');
    }
    
    const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    logger.info(`Successfully retrieved user ${id}`);
    return user;
  } catch (error) {
    logger.error(`Failed to get user ${id}:`, error);
    throw new Error(`Unable to retrieve user: ${error.message}`);
  }
}

// ✅ Good example with resource cleanup
export async function getUserStatsWithCleanup(id: string) {
  let connection;
  try {
    connection = await db.getConnection();
    const stats = await connection.query('SELECT COUNT(*) FROM user_actions WHERE user_id = ?', [id]);
    return stats;
  } catch (error) {
    logger.error(`Failed to get user stats for ${id}:`, error);
    throw new Error(`Unable to retrieve user statistics: ${error.message}`);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

// Helper function that might throw
async function processUserData(user: any) {
  // This function might throw various errors
  if (!user) throw new Error('No user data provided');
  if (!user.email) throw new Error('User email is required');
  
  // Simulate processing
  return { ...user, processed: true };
}

