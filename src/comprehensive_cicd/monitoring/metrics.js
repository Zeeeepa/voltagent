/**
 * Metrics Collection Service
 * Tracks performance metrics, success rates, and system health
 */

class MetricsCollector {
    constructor(config = {}) {
        this.config = {
            retentionPeriod: config.retentionPeriod || 7 * 24 * 60 * 60 * 1000, // 7 days
            aggregationInterval: config.aggregationInterval || 60 * 1000, // 1 minute
            enableDetailedMetrics: config.enableDetailedMetrics !== false,
            ...config
        };

        // Metrics storage
        this.requestMetrics = [];
        this.promptMetrics = [];
        this.prMetrics = [];
        this.retryMetrics = [];
        this.systemMetrics = [];
        
        // Aggregated metrics
        this.aggregatedMetrics = {
            requests: new Map(),
            prompts: new Map(),
            prs: new Map(),
            system: new Map()
        };

        this.startTime = Date.now();
        this.initialized = false;
    }

    async initialize() {
        console.log('📊 Initializing Metrics Collector...');
        
        // Start periodic cleanup and aggregation
        this.startPeriodicTasks();
        
        this.initialized = true;
        console.log('✅ Metrics Collector initialized successfully');
    }

    startPeriodicTasks() {
        // Clean up old metrics every hour
        setInterval(() => {
            this.cleanupOldMetrics();
        }, 60 * 60 * 1000);

        // Aggregate metrics every minute
        setInterval(() => {
            this.aggregateMetrics();
        }, this.config.aggregationInterval);
    }

    // Request Metrics

    recordRequest(method, path, statusCode, duration) {
        const metric = {
            timestamp: Date.now(),
            method,
            path,
            status_code: statusCode,
            duration_ms: duration,
            success: statusCode >= 200 && statusCode < 400
        };

        this.requestMetrics.push(metric);
        
        if (this.config.enableDetailedMetrics) {
            console.log(`📊 Request: ${method} ${path} - ${statusCode} (${duration}ms)`);
        }
    }

    // Prompt Generation Metrics

    recordPromptGeneration(success, duration) {
        const metric = {
            timestamp: Date.now(),
            success,
            duration_ms: duration,
            error: !success
        };

        this.promptMetrics.push(metric);
        
        if (this.config.enableDetailedMetrics) {
            console.log(`📊 Prompt Generation: ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`);
        }
    }

    // PR Creation Metrics

    recordPRCreation(success, duration) {
        const metric = {
            timestamp: Date.now(),
            success,
            duration_ms: duration,
            error: !success
        };

        this.prMetrics.push(metric);
        
        if (this.config.enableDetailedMetrics) {
            console.log(`📊 PR Creation: ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`);
        }
    }

    // Retry Metrics

    recordRetry(taskId, success) {
        const metric = {
            timestamp: Date.now(),
            task_id: taskId,
            success,
            error: !success
        };

        this.retryMetrics.push(metric);
        
        if (this.config.enableDetailedMetrics) {
            console.log(`📊 Retry: Task ${taskId} - ${success ? 'SUCCESS' : 'FAILED'}`);
        }
    }

    // System Metrics

    recordSystemMetric(type, value, metadata = {}) {
        const metric = {
            timestamp: Date.now(),
            type,
            value,
            metadata
        };

        this.systemMetrics.push(metric);
    }

    // Aggregation Methods

    aggregateMetrics() {
        const now = Date.now();
        const intervalStart = now - this.config.aggregationInterval;

        // Aggregate request metrics
        this.aggregateRequestMetrics(intervalStart, now);
        
        // Aggregate prompt metrics
        this.aggregatePromptMetrics(intervalStart, now);
        
        // Aggregate PR metrics
        this.aggregatePRMetrics(intervalStart, now);
        
        // Aggregate system metrics
        this.aggregateSystemMetrics(intervalStart, now);
    }

    aggregateRequestMetrics(start, end) {
        const requests = this.requestMetrics.filter(m => m.timestamp >= start && m.timestamp < end);
        
        if (requests.length === 0) return;

        const aggregation = {
            timestamp: end,
            total_requests: requests.length,
            successful_requests: requests.filter(r => r.success).length,
            failed_requests: requests.filter(r => !r.success).length,
            average_duration_ms: requests.reduce((sum, r) => sum + r.duration_ms, 0) / requests.length,
            min_duration_ms: Math.min(...requests.map(r => r.duration_ms)),
            max_duration_ms: Math.max(...requests.map(r => r.duration_ms)),
            success_rate: requests.filter(r => r.success).length / requests.length,
            status_codes: this.groupBy(requests, 'status_code'),
            methods: this.groupBy(requests, 'method'),
            paths: this.groupBy(requests, 'path')
        };

        this.aggregatedMetrics.requests.set(end, aggregation);
    }

    aggregatePromptMetrics(start, end) {
        const prompts = this.promptMetrics.filter(m => m.timestamp >= start && m.timestamp < end);
        
        if (prompts.length === 0) return;

        const successful = prompts.filter(p => p.success);
        
        const aggregation = {
            timestamp: end,
            total_prompts: prompts.length,
            successful_prompts: successful.length,
            failed_prompts: prompts.length - successful.length,
            success_rate: successful.length / prompts.length,
            average_generation_time_ms: successful.length > 0 
                ? successful.reduce((sum, p) => sum + p.duration_ms, 0) / successful.length 
                : 0,
            min_generation_time_ms: successful.length > 0 ? Math.min(...successful.map(p => p.duration_ms)) : 0,
            max_generation_time_ms: successful.length > 0 ? Math.max(...successful.map(p => p.duration_ms)) : 0
        };

        this.aggregatedMetrics.prompts.set(end, aggregation);
    }

    aggregatePRMetrics(start, end) {
        const prs = this.prMetrics.filter(m => m.timestamp >= start && m.timestamp < end);
        
        if (prs.length === 0) return;

        const successful = prs.filter(p => p.success);
        
        const aggregation = {
            timestamp: end,
            total_prs: prs.length,
            successful_prs: successful.length,
            failed_prs: prs.length - successful.length,
            success_rate: successful.length / prs.length,
            average_creation_time_ms: successful.length > 0 
                ? successful.reduce((sum, p) => sum + p.duration_ms, 0) / successful.length 
                : 0,
            min_creation_time_ms: successful.length > 0 ? Math.min(...successful.map(p => p.duration_ms)) : 0,
            max_creation_time_ms: successful.length > 0 ? Math.max(...successful.map(p => p.duration_ms)) : 0
        };

        this.aggregatedMetrics.prs.set(end, aggregation);
    }

    aggregateSystemMetrics(start, end) {
        const metrics = this.systemMetrics.filter(m => m.timestamp >= start && m.timestamp < end);
        
        if (metrics.length === 0) return;

        const aggregation = {
            timestamp: end,
            total_metrics: metrics.length,
            metric_types: this.groupBy(metrics, 'type'),
            memory_usage: this.getMemoryUsage(),
            uptime_ms: Date.now() - this.startTime
        };

        this.aggregatedMetrics.system.set(end, aggregation);
    }

    // Query Methods

    async getMetrics() {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        const oneDayAgo = now - (24 * 60 * 60 * 1000);

        return {
            timestamp: now,
            uptime_ms: now - this.startTime,
            
            // Current metrics
            current: {
                requests: this.getRecentMetrics(this.requestMetrics, oneHourAgo),
                prompts: this.getRecentMetrics(this.promptMetrics, oneHourAgo),
                prs: this.getRecentMetrics(this.prMetrics, oneHourAgo),
                retries: this.getRecentMetrics(this.retryMetrics, oneHourAgo)
            },
            
            // Hourly aggregations
            hourly: {
                requests: this.getAggregatedMetrics(this.aggregatedMetrics.requests, oneHourAgo),
                prompts: this.getAggregatedMetrics(this.aggregatedMetrics.prompts, oneHourAgo),
                prs: this.getAggregatedMetrics(this.aggregatedMetrics.prs, oneHourAgo),
                system: this.getAggregatedMetrics(this.aggregatedMetrics.system, oneHourAgo)
            },
            
            // Daily summary
            daily: {
                requests: this.getDailySummary(this.requestMetrics, oneDayAgo),
                prompts: this.getDailySummary(this.promptMetrics, oneDayAgo),
                prs: this.getDailySummary(this.prMetrics, oneDayAgo),
                retries: this.getDailySummary(this.retryMetrics, oneDayAgo)
            },
            
            // System health
            health: this.getSystemHealth()
        };
    }

    getRecentMetrics(metrics, since) {
        const recent = metrics.filter(m => m.timestamp >= since);
        
        return {
            total: recent.length,
            successful: recent.filter(m => m.success !== false).length,
            failed: recent.filter(m => m.success === false).length,
            success_rate: recent.length > 0 ? recent.filter(m => m.success !== false).length / recent.length : 0
        };
    }

    getAggregatedMetrics(aggregatedMap, since) {
        const aggregations = Array.from(aggregatedMap.values())
            .filter(a => a.timestamp >= since)
            .sort((a, b) => a.timestamp - b.timestamp);
            
        return aggregations;
    }

    getDailySummary(metrics, since) {
        const daily = metrics.filter(m => m.timestamp >= since);
        const successful = daily.filter(m => m.success !== false);
        
        return {
            total: daily.length,
            successful: successful.length,
            failed: daily.length - successful.length,
            success_rate: daily.length > 0 ? successful.length / daily.length : 0,
            average_duration_ms: successful.length > 0 && successful[0].duration_ms !== undefined
                ? successful.reduce((sum, m) => sum + m.duration_ms, 0) / successful.length
                : null
        };
    }

    getSystemHealth() {
        const memory = this.getMemoryUsage();
        const uptime = Date.now() - this.startTime;
        
        // Calculate health score based on various factors
        let healthScore = 1.0;
        
        // Memory usage impact
        if (memory.heapUsed / memory.heapTotal > 0.9) {
            healthScore -= 0.3;
        } else if (memory.heapUsed / memory.heapTotal > 0.7) {
            healthScore -= 0.1;
        }
        
        // Recent error rate impact
        const recentRequests = this.getRecentMetrics(this.requestMetrics, Date.now() - 300000); // 5 minutes
        if (recentRequests.total > 0 && recentRequests.success_rate < 0.8) {
            healthScore -= 0.4;
        } else if (recentRequests.total > 0 && recentRequests.success_rate < 0.9) {
            healthScore -= 0.2;
        }
        
        return {
            score: Math.max(0, healthScore),
            status: healthScore >= 0.8 ? 'healthy' : healthScore >= 0.5 ? 'degraded' : 'unhealthy',
            uptime_ms: uptime,
            memory: memory,
            checks: {
                memory_usage: memory.heapUsed / memory.heapTotal < 0.9,
                error_rate: recentRequests.total === 0 || recentRequests.success_rate >= 0.9,
                uptime: uptime > 60000 // At least 1 minute uptime
            }
        };
    }

    // Utility Methods

    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = (groups[group] || 0) + 1;
            return groups;
        }, {});
    }

    getMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            rss: usage.rss,
            heapTotal: usage.heapTotal,
            heapUsed: usage.heapUsed,
            external: usage.external,
            arrayBuffers: usage.arrayBuffers
        };
    }

    cleanupOldMetrics() {
        const cutoff = Date.now() - this.config.retentionPeriod;
        
        this.requestMetrics = this.requestMetrics.filter(m => m.timestamp > cutoff);
        this.promptMetrics = this.promptMetrics.filter(m => m.timestamp > cutoff);
        this.prMetrics = this.prMetrics.filter(m => m.timestamp > cutoff);
        this.retryMetrics = this.retryMetrics.filter(m => m.timestamp > cutoff);
        this.systemMetrics = this.systemMetrics.filter(m => m.timestamp > cutoff);
        
        // Clean up aggregated metrics
        for (const [timestamp, _] of this.aggregatedMetrics.requests) {
            if (timestamp < cutoff) {
                this.aggregatedMetrics.requests.delete(timestamp);
            }
        }
        
        for (const [timestamp, _] of this.aggregatedMetrics.prompts) {
            if (timestamp < cutoff) {
                this.aggregatedMetrics.prompts.delete(timestamp);
            }
        }
        
        for (const [timestamp, _] of this.aggregatedMetrics.prs) {
            if (timestamp < cutoff) {
                this.aggregatedMetrics.prs.delete(timestamp);
            }
        }
        
        for (const [timestamp, _] of this.aggregatedMetrics.system) {
            if (timestamp < cutoff) {
                this.aggregatedMetrics.system.delete(timestamp);
            }
        }
        
        console.log(`🧹 Cleaned up metrics older than ${new Date(cutoff).toISOString()}`);
    }

    // Export methods for external monitoring systems

    getPrometheusMetrics() {
        const metrics = [];
        const now = Date.now();
        
        // Request metrics
        const recentRequests = this.getRecentMetrics(this.requestMetrics, now - 300000);
        metrics.push(`cicd_requests_total ${recentRequests.total}`);
        metrics.push(`cicd_requests_successful ${recentRequests.successful}`);
        metrics.push(`cicd_requests_failed ${recentRequests.failed}`);
        metrics.push(`cicd_requests_success_rate ${recentRequests.success_rate}`);
        
        // Prompt metrics
        const recentPrompts = this.getRecentMetrics(this.promptMetrics, now - 300000);
        metrics.push(`cicd_prompts_total ${recentPrompts.total}`);
        metrics.push(`cicd_prompts_successful ${recentPrompts.successful}`);
        metrics.push(`cicd_prompts_failed ${recentPrompts.failed}`);
        metrics.push(`cicd_prompts_success_rate ${recentPrompts.success_rate}`);
        
        // PR metrics
        const recentPRs = this.getRecentMetrics(this.prMetrics, now - 300000);
        metrics.push(`cicd_prs_total ${recentPRs.total}`);
        metrics.push(`cicd_prs_successful ${recentPRs.successful}`);
        metrics.push(`cicd_prs_failed ${recentPRs.failed}`);
        metrics.push(`cicd_prs_success_rate ${recentPRs.success_rate}`);
        
        // System metrics
        const health = this.getSystemHealth();
        metrics.push(`cicd_health_score ${health.score}`);
        metrics.push(`cicd_uptime_seconds ${health.uptime_ms / 1000}`);
        metrics.push(`cicd_memory_heap_used_bytes ${health.memory.heapUsed}`);
        metrics.push(`cicd_memory_heap_total_bytes ${health.memory.heapTotal}`);
        
        return metrics.join('\n');
    }

    reset() {
        this.requestMetrics = [];
        this.promptMetrics = [];
        this.prMetrics = [];
        this.retryMetrics = [];
        this.systemMetrics = [];
        this.aggregatedMetrics = {
            requests: new Map(),
            prompts: new Map(),
            prs: new Map(),
            system: new Map()
        };
        this.startTime = Date.now();
        
        console.log('📊 Metrics reset');
    }
}

module.exports = MetricsCollector;

