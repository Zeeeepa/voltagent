/**
 * Unified Monitoring & Analytics System for VoltAgent
 * 
 * This module consolidates all monitoring, analytics, and observability
 * components into a single, cohesive system that provides:
 * - Performance monitoring
 * - Analytics and metrics collection
 * - Real-time monitoring & performance analytics
 * - Comprehensive observability
 * - Standardized monitoring interfaces
 */

export * from './core/monitor';
export * from './core/metrics';
export * from './core/analytics';
export * from './core/performance';
export * from './core/alerting';
export * from './core/dashboard';
export * from './types';
export * from './config';

// Integration exports
export * from './integrations/agent';
export * from './integrations/opentelemetry';
export * from './integrations/cli';

// Re-export telemetry and OpenTelemetry for backward compatibility
export * from '../telemetry/exporter';
export * from '../agent/open-telemetry';

// Main monitoring system
export { MonitoringSystem, monitoring } from './system';
