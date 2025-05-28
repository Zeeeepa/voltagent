/**
 * Unified alerting system
 */

import { EventEmitter } from 'events';
import type { 
  MonitoringConfig, 
  AlertRule, 
  Alert, 
  AlertCondition,
  AlertAction,
  MetricPoint,
  MonitoringProvider 
} from '../types';

/**
 * Alerting system that monitors metrics and triggers alerts
 */
export class AlertingSystem extends EventEmitter implements MonitoringProvider {
  public readonly name = 'AlertingSystem';
  
  private config: MonitoringConfig;
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private metricHistory: Map<string, MetricPoint[]> = new Map();
  private cooldownTracker: Map<string, number> = new Map();
  private isInitialized = false;
  
  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Initialize default alert rules
      this.initializeDefaultRules();
      
      // Start cleanup interval
      this.startCleanupInterval();
      
      this.isInitialized = true;
      console.log('[AlertingSystem] Initialized successfully');
      
    } catch (error) {
      console.error('[AlertingSystem] Failed to initialize:', error);
      throw error;
    }
  }
  
  async track(): Promise<void> {
    // Not used for alerting system
  }
  
  async recordMetric(): Promise<void> {
    // Not used for alerting system
  }
  
  /**
   * Add an alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    console.log(`[AlertingSystem] Added alert rule: ${rule.name}`);
  }
  
  /**
   * Remove an alert rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.cooldownTracker.delete(ruleId);
    console.log(`[AlertingSystem] Removed alert rule: ${ruleId}`);
  }
  
  /**
   * Update an alert rule
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.rules.set(ruleId, { ...rule, ...updates });
      console.log(`[AlertingSystem] Updated alert rule: ${ruleId}`);
    }
  }
  
  /**
   * Get all alert rules
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }
  
  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }
  
  /**
   * Get all alerts (including resolved)\n   */\n  getAllAlerts(): Alert[] {\n    return Array.from(this.alerts.values());\n  }\n  \n  /**\n   * Check a metric against all alert rules\n   */\n  async checkMetric(metric: MetricPoint): Promise<void> {\n    if (!this.isInitialized) {\n      return;\n    }\n    \n    try {\n      // Store metric in history\n      this.storeMetricInHistory(metric);\n      \n      // Check each rule\n      for (const rule of this.rules.values()) {\n        if (!rule.enabled) {\n          continue;\n        }\n        \n        // Check if rule is in cooldown\n        if (this.isInCooldown(rule.id)) {\n          continue;\n        }\n        \n        // Check if metric matches rule condition\n        if (await this.evaluateCondition(rule.condition, metric)) {\n          await this.triggerAlert(rule, metric);\n        }\n      }\n      \n    } catch (error) {\n      console.error('[AlertingSystem] Error checking metric:', error);\n    }\n  }\n  \n  /**\n   * Resolve an alert\n   */\n  resolveAlert(alertId: string, reason?: string): void {\n    const alert = this.alerts.get(alertId);\n    if (alert && !alert.resolved) {\n      alert.resolved = true;\n      alert.resolvedAt = new Date().toISOString();\n      \n      console.log(`[AlertingSystem] Resolved alert: ${alert.message}`);\n      this.emit('alertResolved', alert, reason);\n    }\n  }\n  \n  /**\n   * Initialize default alert rules\n   */\n  private initializeDefaultRules(): void {\n    // High memory usage alert\n    this.addRule({\n      id: 'high-memory-usage',\n      name: 'High Memory Usage',\n      description: 'Alert when memory usage exceeds 80% of available memory',\n      condition: {\n        metric: 'system.memory.used',\n        operator: 'gt',\n        threshold: 1024 * 1024 * 1024 * 0.8, // 80% of 1GB\n        timeWindow: 5,\n        aggregation: 'avg',\n      },\n      actions: [\n        {\n          type: 'log',\n          config: { level: 'warn' },\n        },\n      ],\n      enabled: true,\n      cooldown: 10, // 10 minutes\n    });\n    \n    // High error rate alert\n    this.addRule({\n      id: 'high-error-rate',\n      name: 'High Error Rate',\n      description: 'Alert when error rate exceeds 5%',\n      condition: {\n        metric: 'agent.error.rate',\n        operator: 'gt',\n        threshold: 0.05,\n        timeWindow: 10,\n        aggregation: 'avg',\n      },\n      actions: [\n        {\n          type: 'log',\n          config: { level: 'error' },\n        },\n      ],\n      enabled: true,\n      cooldown: 15, // 15 minutes\n    });\n    \n    // Slow operation alert\n    this.addRule({\n      id: 'slow-operations',\n      name: 'Slow Operations',\n      description: 'Alert when operation duration exceeds 30 seconds',\n      condition: {\n        metric: 'agent.operation.duration',\n        operator: 'gt',\n        threshold: 30000, // 30 seconds\n        timeWindow: 5,\n        aggregation: 'max',\n      },\n      actions: [\n        {\n          type: 'log',\n          config: { level: 'warn' },\n        },\n      ],\n      enabled: true,\n      cooldown: 5, // 5 minutes\n    });\n  }\n  \n  /**\n   * Store metric in history for time-window evaluations\n   */\n  private storeMetricInHistory(metric: MetricPoint): void {\n    const key = `${metric.name}:${JSON.stringify(metric.tags)}`;\n    \n    if (!this.metricHistory.has(key)) {\n      this.metricHistory.set(key, []);\n    }\n    \n    const history = this.metricHistory.get(key)!;\n    history.push(metric);\n    \n    // Keep only last 1000 points per metric\n    if (history.length > 1000) {\n      history.shift();\n    }\n  }\n  \n  /**\n   * Evaluate an alert condition against a metric\n   */\n  private async evaluateCondition(condition: AlertCondition, metric: MetricPoint): Promise<boolean> {\n    // Check if metric name matches\n    if (metric.name !== condition.metric) {\n      return false;\n    }\n    \n    // Get metric history for time window evaluation\n    const key = `${metric.name}:${JSON.stringify(metric.tags)}`;\n    const history = this.metricHistory.get(key) || [];\n    \n    // Filter to time window\n    const windowStart = Date.now() - (condition.timeWindow * 60 * 1000);\n    const windowMetrics = history.filter(m => \n      new Date(m.timestamp).getTime() >= windowStart\n    );\n    \n    if (windowMetrics.length === 0) {\n      return false;\n    }\n    \n    // Calculate aggregated value\n    let aggregatedValue: number;\n    const values = windowMetrics.map(m => m.value);\n    \n    switch (condition.aggregation) {\n      case 'avg':\n        aggregatedValue = values.reduce((sum, val) => sum + val, 0) / values.length;\n        break;\n      case 'sum':\n        aggregatedValue = values.reduce((sum, val) => sum + val, 0);\n        break;\n      case 'max':\n        aggregatedValue = Math.max(...values);\n        break;\n      case 'min':\n        aggregatedValue = Math.min(...values);\n        break;\n      case 'count':\n        aggregatedValue = values.length;\n        break;\n      default:\n        aggregatedValue = metric.value;\n    }\n    \n    // Evaluate condition\n    switch (condition.operator) {\n      case 'gt':\n        return aggregatedValue > condition.threshold;\n      case 'gte':\n        return aggregatedValue >= condition.threshold;\n      case 'lt':\n        return aggregatedValue < condition.threshold;\n      case 'lte':\n        return aggregatedValue <= condition.threshold;\n      case 'eq':\n        return aggregatedValue === condition.threshold;\n      default:\n        return false;\n    }\n  }\n  \n  /**\n   * Trigger an alert\n   */\n  private async triggerAlert(rule: AlertRule, metric: MetricPoint): Promise<void> {\n    const alert: Alert = {\n      id: `${rule.id}-${Date.now()}`,\n      ruleId: rule.id,\n      timestamp: new Date().toISOString(),\n      severity: this.determineSeverity(rule, metric),\n      message: `${rule.name}: ${rule.description}`,\n      context: {\n        metric: metric.name,\n        value: metric.value,\n        threshold: rule.condition.threshold,\n        tags: metric.tags,\n      },\n    };\n    \n    this.alerts.set(alert.id, alert);\n    \n    // Set cooldown\n    if (rule.cooldown) {\n      this.cooldownTracker.set(rule.id, Date.now() + (rule.cooldown * 60 * 1000));\n    }\n    \n    console.warn(`[AlertingSystem] Alert triggered: ${alert.message}`);\n    \n    // Execute alert actions\n    for (const action of rule.actions) {\n      await this.executeAction(action, alert);\n    }\n    \n    this.emit('alertTriggered', alert);\n  }\n  \n  /**\n   * Determine alert severity\n   */\n  private determineSeverity(rule: AlertRule, metric: MetricPoint): Alert['severity'] {\n    const ratio = metric.value / rule.condition.threshold;\n    \n    if (ratio >= 2) return 'critical';\n    if (ratio >= 1.5) return 'high';\n    if (ratio >= 1.2) return 'medium';\n    return 'low';\n  }\n  \n  /**\n   * Execute an alert action\n   */\n  private async executeAction(action: AlertAction, alert: Alert): Promise<void> {\n    try {\n      switch (action.type) {\n        case 'log':\n          const level = action.config.level || 'info';\n          console[level as keyof Console](`[Alert] ${alert.message}`, alert.context);\n          break;\n          \n        case 'webhook':\n          if (action.config.url) {\n            // Would implement webhook call here\n            console.log(`[AlertingSystem] Would send webhook to ${action.config.url}`);\n          }\n          break;\n          \n        case 'email':\n          if (action.config.to) {\n            // Would implement email sending here\n            console.log(`[AlertingSystem] Would send email to ${action.config.to}`);\n          }\n          break;\n          \n        default:\n          console.warn(`[AlertingSystem] Unknown action type: ${action.type}`);\n      }\n    } catch (error) {\n      console.error(`[AlertingSystem] Failed to execute action ${action.type}:`, error);\n    }\n  }\n  \n  /**\n   * Check if a rule is in cooldown\n   */\n  private isInCooldown(ruleId: string): boolean {\n    const cooldownEnd = this.cooldownTracker.get(ruleId);\n    if (!cooldownEnd) {\n      return false;\n    }\n    \n    if (Date.now() >= cooldownEnd) {\n      this.cooldownTracker.delete(ruleId);\n      return false;\n    }\n    \n    return true;\n  }\n  \n  /**\n   * Start cleanup interval for old alerts and metrics\n   */\n  private startCleanupInterval(): void {\n    setInterval(() => {\n      try {\n        // Clean up old alerts (keep last 1000)\n        const allAlerts = Array.from(this.alerts.values())\n          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());\n        \n        if (allAlerts.length > 1000) {\n          const toRemove = allAlerts.slice(1000);\n          for (const alert of toRemove) {\n            this.alerts.delete(alert.id);\n          }\n        }\n        \n        // Clean up old metric history\n        for (const [key, history] of this.metricHistory.entries()) {\n          const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours\n          const filtered = history.filter(m => \n            new Date(m.timestamp).getTime() >= cutoff\n          );\n          this.metricHistory.set(key, filtered);\n        }\n        \n      } catch (error) {\n        console.error('[AlertingSystem] Error during cleanup:', error);\n      }\n    }, 60000); // Every minute\n  }\n  \n  isHealthy(): boolean {\n    return this.isInitialized;\n  }\n  \n  async shutdown(): Promise<void> {\n    console.log('[AlertingSystem] Shutting down...');\n    \n    try {\n      // Clear all data\n      this.rules.clear();\n      this.alerts.clear();\n      this.metricHistory.clear();\n      this.cooldownTracker.clear();\n      \n      this.isInitialized = false;\n      console.log('[AlertingSystem] Shut down successfully');\n      \n    } catch (error) {\n      console.error('[AlertingSystem] Error during shutdown:', error);\n      throw error;\n    }\n  }\n}

