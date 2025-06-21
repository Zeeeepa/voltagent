/**
 * Notification Types
 * 
 * This module defines the types and interfaces for the notification system
 * for synchronization events.
 */

import { SyncNotification, WorkstreamId } from '../types';

/**
 * Type of notification
 */
export enum NotificationType {
  SYNC_COMPLETE = 'sync_complete',
  SYNC_TIMEOUT = 'sync_timeout',
  DEADLOCK_DETECTED = 'deadlock_detected',
  CONFLICT_DETECTED = 'conflict_detected',
  DATA_AVAILABLE = 'data_available',
  RESOURCE_AVAILABLE = 'resource_available',
  WORKSTREAM_COMPLETED = 'workstream_completed',
  WORKSTREAM_FAILED = 'workstream_failed',
  CUSTOM = 'custom'
}

/**
 * Priority of a notification
 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Status of a notification
 */
export enum NotificationStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

/**
 * Extended notification information
 */
export interface NotificationInfo extends SyncNotification {
  /**
   * Type of notification
   */
  notificationType: NotificationType;
  
  /**
   * Priority of the notification
   */
  priority: NotificationPriority;
  
  /**
   * Current status of the notification
   */
  status: NotificationStatus;
  
  /**
   * When the notification was delivered
   */
  deliveredAt?: number;
  
  /**
   * When the notification was read
   */
  readAt?: number;
  
  /**
   * When the notification expires
   */
  expiresAt?: number;
}

/**
 * Options for notification delivery
 */
export interface NotificationOptions {
  /**
   * Priority of the notification
   */
  priority?: NotificationPriority;
  
  /**
   * Time-to-live for the notification in milliseconds
   */
  ttl?: number;
  
  /**
   * Whether to require acknowledgment of the notification
   */
  requireAck?: boolean;
  
  /**
   * Custom metadata for the notification
   */
  metadata?: Record<string, any>;
}

/**
 * Interface for notification handlers
 */
export interface NotificationHandler {
  /**
   * Handle a notification
   * 
   * @param notification The notification to handle
   */
  onNotification(notification: NotificationInfo): void | Promise<void>;
}

/**
 * Interface for notification subscriptions
 */
export interface NotificationSubscription {
  /**
   * Unique identifier for this subscription
   */
  id: string;
  
  /**
   * The workstream that created this subscription
   */
  workstreamId: WorkstreamId;
  
  /**
   * The notification types this subscription is for
   */
  types: NotificationType[];
  
  /**
   * When this subscription was created
   */
  createdAt: number;
  
  /**
   * When this subscription expires (if applicable)
   */
  expiresAt?: number;
  
  /**
   * Unsubscribe from notifications
   */
  unsubscribe(): void | Promise<void>;
}

