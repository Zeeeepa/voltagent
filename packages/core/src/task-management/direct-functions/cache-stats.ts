/**
 * cache-stats.ts
 * Direct function implementation for getting cache statistics
 */

import { getCacheStats } from '../utils/cache-utils';
import { DirectFunctionArgs, DirectFunctionResult, Logger } from '../types';

/**
 * Direct function wrapper for getting cache statistics.
 *
 * @param args - Command arguments (not used for this function).
 * @param log - Logger object.
 * @returns Cache statistics result.
 */
export async function getCacheStatsDirect(
  args: DirectFunctionArgs, 
  log: Logger
): Promise<DirectFunctionResult<Record<string, any>>> {
  try {
    log.info('Getting cache statistics');
    
    // Get cache statistics
    const stats = getCacheStats();
    
    log.info(`Cache statistics retrieved: ${JSON.stringify(stats)}`);
    
    return {
      success: true,
      data: stats
    };
  } catch (error: any) {
    log.error(`Error getting cache statistics: ${error.message}`);
    return {
      success: false,
      error: {
        code: 'CACHE_STATS_ERROR',
        message: error.message
      }
    };
  }
}

