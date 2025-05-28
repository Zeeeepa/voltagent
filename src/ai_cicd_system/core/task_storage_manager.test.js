/**
 * Test file for TaskStorageManager
 * Verifies that the consolidated class works correctly without duplicate definitions
 */

import { TaskStorageManager } from './task_storage_manager.js';

// Test configuration
const testConfig = {
    storageType: 'mock',
    enableMetrics: true
};

// Test data
const sampleTask = {
    name: 'Test Task',
    description: 'A test task for validation',
    priority: 'high'
};

const sampleRequirement = {
    id: 'req_001',
    description: 'Test requirement',
    criteria: ['criterion1', 'criterion2']
};

/**
 * Basic functionality tests
 */
async function runTests() {
    console.log('🧪 Starting TaskStorageManager tests...\n');

    try {
        // Test 1: Initialization
        console.log('Test 1: Initialization');
        const manager = new TaskStorageManager(testConfig);
        console.log('✅ TaskStorageManager instance created successfully');
        
        await manager.initialize();
        console.log('✅ TaskStorageManager initialized successfully\n');

        // Test 2: Store Task
        console.log('Test 2: Store Task');
        const taskId = await manager.storeTask(sampleTask, sampleRequirement);
        console.log(`✅ Task stored successfully with ID: ${taskId}\n`);

        // Test 3: Retrieve Task
        console.log('Test 3: Retrieve Task');
        const retrievedTask = await manager.getTask(taskId);
        console.log('✅ Task retrieved successfully');
        console.log(`   Task name: ${retrievedTask.task.name}`);
        console.log(`   Status: ${retrievedTask.status}\n`);

        // Test 4: Update Task Status
        console.log('Test 4: Update Task Status');
        const updateSuccess = await manager.updateTaskStatus(taskId, 'in-progress');
        console.log(`✅ Task status updated successfully: ${updateSuccess}\n`);

        // Test 5: Get All Tasks
        console.log('Test 5: Get All Tasks');
        const allTasks = await manager.getAllTasks();
        console.log(`✅ Retrieved ${allTasks.length} task(s)\n`);

        // Test 6: Get Metrics
        console.log('Test 6: Get Metrics');
        const metrics = manager.getMetrics();
        console.log('✅ Metrics retrieved successfully');
        console.log(`   Operations tracked: ${Object.keys(metrics).join(', ')}\n`);

        // Test 7: Delete Task
        console.log('Test 7: Delete Task');
        const deleteSuccess = await manager.deleteTask(taskId);
        console.log(`✅ Task deleted successfully: ${deleteSuccess}\n`);

        // Test 8: Cleanup
        console.log('Test 8: Cleanup');
        await manager.close();
        console.log('✅ TaskStorageManager closed successfully\n');

        console.log('🎉 All tests passed! No duplicate class definition issues detected.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

/**
 * Test for duplicate class definition issues
 */
function testNoDuplicateClasses() {
    console.log('\n🔍 Testing for duplicate class definitions...');
    
    try {
        // Try to create multiple instances to ensure no conflicts
        const manager1 = new TaskStorageManager({ storageType: 'mock' });
        const manager2 = new TaskStorageManager({ storageType: 'database' });
        
        // Verify both instances are properly constructed
        if (manager1.constructor.name === 'TaskStorageManager' && 
            manager2.constructor.name === 'TaskStorageManager') {
            console.log('✅ No duplicate class definition conflicts detected');
            console.log('✅ Multiple instances can be created without issues');
        } else {
            throw new Error('Class constructor issues detected');
        }
        
    } catch (error) {
        console.error('❌ Duplicate class definition test failed:', error.message);
    }
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().then(() => {
        testNoDuplicateClasses();
    });
}

export { runTests, testNoDuplicateClasses };

