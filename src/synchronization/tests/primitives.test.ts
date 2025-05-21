/**
 * Unit tests for synchronization primitives
 */

import { 
  Barrier, 
  Semaphore, 
  Mutex, 
  CountdownLatch,
  SyncPrimitiveType,
  SyncStatus
} from '../index';

describe('Synchronization Primitives', () => {
  describe('Barrier', () => {
    it('should block until all parties arrive', async () => {
      const barrier = new Barrier('test-barrier', { parties: 3 });
      
      // Track which workstreams have been released
      const released: string[] = [];
      
      // Create promises for each workstream
      const promise1 = barrier.wait('workstream-1').then(() => {
        released.push('workstream-1');
      });
      
      const promise2 = barrier.wait('workstream-2').then(() => {
        released.push('workstream-2');
      });
      
      // At this point, no workstreams should be released
      expect(released).toHaveLength(0);
      expect(barrier.status).toBe(SyncStatus.IN_PROGRESS);
      
      // Add the third workstream
      const promise3 = barrier.wait('workstream-3').then(() => {
        released.push('workstream-3');
      });
      
      // Wait for all promises to resolve
      await Promise.all([promise1, promise2, promise3]);
      
      // All workstreams should be released
      expect(released).toHaveLength(3);
      expect(released).toContain('workstream-1');
      expect(released).toContain('workstream-2');
      expect(released).toContain('workstream-3');
      expect(barrier.status).toBe(SyncStatus.COMPLETED);
    });
    
    it('should reset correctly', async () => {
      const barrier = new Barrier('test-barrier', { parties: 2 });
      
      // First generation
      const promise1 = barrier.wait('workstream-1');
      const promise2 = barrier.wait('workstream-2');
      
      await Promise.all([promise1, promise2]);
      
      expect(barrier.generation).toBe(1);
      expect(barrier.status).toBe(SyncStatus.COMPLETED);
      
      // Reset the barrier
      await barrier.reset();
      
      expect(barrier.generation).toBe(1);
      expect(barrier.status).toBe(SyncStatus.PENDING);
      expect(barrier.waitingWorkstreams).toHaveLength(0);
      expect(barrier.passedWorkstreams).toHaveLength(0);
      
      // Second generation
      const promise3 = barrier.wait('workstream-1');
      const promise4 = barrier.wait('workstream-2');
      
      await Promise.all([promise3, promise4]);
      
      expect(barrier.generation).toBe(2);
      expect(barrier.status).toBe(SyncStatus.COMPLETED);
    });
  });
  
  describe('Semaphore', () => {
    it('should limit concurrent access', async () => {
      const semaphore = new Semaphore('test-semaphore', { permits: 2 });
      
      // Track active workstreams
      const active: Set<string> = new Set();
      const maxActive = { count: 0 };
      
      // Helper function to simulate work
      const doWork = async (workstreamId: string) => {
        await semaphore.acquire(workstreamId);
        
        active.add(workstreamId);
        maxActive.count = Math.max(maxActive.count, active.size);
        
        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 100));
        
        active.delete(workstreamId);
        await semaphore.release(workstreamId);
      };
      
      // Start 5 workstreams
      const promises = [];
      for (let i = 1; i <= 5; i++) {
        promises.push(doWork(`workstream-${i}`));
      }
      
      // Wait for all workstreams to complete
      await Promise.all(promises);
      
      // At most 2 workstreams should have been active at the same time
      expect(maxActive.count).toBe(2);
      expect(active.size).toBe(0);
      expect(semaphore.availablePermits).toBe(2);
    });
    
    it('should handle multiple permits per workstream', async () => {
      const semaphore = new Semaphore('test-semaphore', { permits: 5 });
      
      // Acquire 2 permits for workstream-1
      await semaphore.acquire('workstream-1', 2);
      
      expect(semaphore.availablePermits).toBe(3);
      expect(semaphore.getHeldPermits('workstream-1')).toBe(2);
      
      // Acquire 3 permits for workstream-2
      await semaphore.acquire('workstream-2', 3);
      
      expect(semaphore.availablePermits).toBe(0);
      expect(semaphore.getHeldPermits('workstream-2')).toBe(3);
      
      // Try to acquire a permit for workstream-3 (should not be immediately available)
      const acquirePromise = semaphore.acquire('workstream-3', 1);
      
      // Release 1 permit from workstream-1
      await semaphore.release('workstream-1', 1);
      
      expect(semaphore.availablePermits).toBe(0); // Should be acquired by workstream-3
      expect(semaphore.getHeldPermits('workstream-1')).toBe(1);
      
      // Wait for workstream-3 to acquire the permit
      await acquirePromise;
      
      expect(semaphore.getHeldPermits('workstream-3')).toBe(1);
      
      // Release all permits
      await semaphore.release('workstream-1', 1);
      await semaphore.release('workstream-2', 3);
      await semaphore.release('workstream-3', 1);
      
      expect(semaphore.availablePermits).toBe(5);
    });
  });
  
  describe('Mutex', () => {
    it('should ensure exclusive access', async () => {
      const mutex = new Mutex('test-mutex');
      
      // Track which workstream holds the lock
      let lockHolder: string | null = null;
      
      // Helper function to simulate work
      const doWork = async (workstreamId: string) => {
        await mutex.lock(workstreamId);
        
        // Verify exclusive access
        expect(lockHolder).toBeNull();
        lockHolder = workstreamId;
        
        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Release the lock
        lockHolder = null;
        await mutex.unlock(workstreamId);
      };
      
      // Start 3 workstreams
      const promises = [
        doWork('workstream-1'),
        doWork('workstream-2'),
        doWork('workstream-3')
      ];
      
      // Wait for all workstreams to complete
      await Promise.all(promises);
      
      // Verify the mutex is unlocked
      expect(lockHolder).toBeNull();
      expect(mutex.isLocked()).toBe(false);
    });
    
    it('should support tryLock', async () => {
      const mutex = new Mutex('test-mutex');
      
      // Lock the mutex
      await mutex.lock('workstream-1');
      
      // Try to lock the mutex (should fail)
      const result = mutex.tryLock('workstream-2');
      
      expect(result).toBe(false);
      expect(mutex.isLocked()).toBe(true);
      expect(mutex.isLockedBy('workstream-1')).toBe(true);
      expect(mutex.isLockedBy('workstream-2')).toBe(false);
      
      // Unlock the mutex
      await mutex.unlock('workstream-1');
      
      // Try to lock the mutex again (should succeed)
      const result2 = mutex.tryLock('workstream-2');
      
      expect(result2).toBe(true);
      expect(mutex.isLocked()).toBe(true);
      expect(mutex.isLockedBy('workstream-2')).toBe(true);
      
      // Unlock the mutex
      await mutex.unlock('workstream-2');
    });
  });
  
  describe('CountdownLatch', () => {
    it('should release waiters when count reaches zero', async () => {
      const latch = new CountdownLatch('test-latch', { count: 3 });
      
      // Track which workstreams have been released
      const released: string[] = [];
      
      // Create promises for waiting workstreams
      const promise1 = latch.await('waiter-1').then(() => {
        released.push('waiter-1');
      });
      
      const promise2 = latch.await('waiter-2').then(() => {
        released.push('waiter-2');
      });
      
      // At this point, no workstreams should be released
      expect(released).toHaveLength(0);
      expect(latch.count).toBe(3);
      
      // Count down
      await latch.countDown('counter-1');
      expect(latch.count).toBe(2);
      expect(released).toHaveLength(0);
      
      await latch.countDown('counter-2');
      expect(latch.count).toBe(1);
      expect(released).toHaveLength(0);
      
      await latch.countDown('counter-3');
      expect(latch.count).toBe(0);
      
      // Wait for all promises to resolve
      await Promise.all([promise1, promise2]);
      
      // All waiters should be released
      expect(released).toHaveLength(2);
      expect(released).toContain('waiter-1');
      expect(released).toContain('waiter-2');
      expect(latch.status).toBe(SyncStatus.COMPLETED);
    });
    
    it('should support countDownAll', async () => {
      const latch = new CountdownLatch('test-latch', { count: 5 });
      
      // Create a promise for a waiting workstream
      const released: string[] = [];
      const promise = latch.await('waiter').then(() => {
        released.push('waiter');
      });
      
      // Count down partially
      await latch.countDown('counter-1');
      await latch.countDown('counter-2');
      
      expect(latch.count).toBe(3);
      expect(released).toHaveLength(0);
      
      // Count down all remaining counts
      await latch.countDownAll();
      
      // Wait for the promise to resolve
      await promise;
      
      // The waiter should be released
      expect(released).toHaveLength(1);
      expect(released).toContain('waiter');
      expect(latch.count).toBe(0);
      expect(latch.status).toBe(SyncStatus.COMPLETED);
    });
    
    it('should initialize with zero count', async () => {
      const latch = new CountdownLatch('test-latch', { count: 0 });
      
      // The latch should already be completed
      expect(latch.count).toBe(0);
      expect(latch.status).toBe(SyncStatus.COMPLETED);
      
      // Waiting should resolve immediately
      const released: string[] = [];
      await latch.await('waiter').then(() => {
        released.push('waiter');
      });
      
      expect(released).toHaveLength(1);
      expect(released).toContain('waiter');
    });
  });
});

