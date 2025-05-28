/**
 * Notification Manager
 * 
 * This module provides a central manager for sending and receiving notifications
 * about synchronization events.
 */

import { v4 as uuidv4 } from 'uuid';
import { SyncNotification, WorkstreamId } from '../types';
import { 
  NotificationType, 
  NotificationPriority, 
  NotificationStatus,
  NotificationInfo,
  NotificationOptions,
  NotificationHandler,
  NotificationSubscription
} from './types';

/**
 * Manager for synchronization notifications
 */
export class NotificationManager {
  private _notifications: Map<string, NotificationInfo> = new Map();
  private _subscriptions: Map<string, {
    subscription: NotificationSubscription;
    handler: NotificationHandler;
  }> = new Map();
  private _workstreamSubscriptions: Map<WorkstreamId, Set<string>> = new Map();
  
  /**
   * Send a notification to workstreams
   * 
   * @param type The type of notification
   * @param workstreams The workstreams to notify
   * @param message The notification message
   * @param syncPointId Optional sync point ID related to the notification
   * @param metadata Optional metadata for the notification
   * @param options Optional delivery options
   * @returns The created notification
   */
  async sendNotification(
    type: NotificationType,
    workstreams: WorkstreamId[],
    message: string,
    syncPointId?: string,
    metadata?: Record<string, any>,
    options?: NotificationOptions
  ): Promise<NotificationInfo> {
    const id = uuidv4();
    const timestamp = Date.now();
    
    const notification: NotificationInfo = {
      id,
      type: this._mapNotificationType(type),
      notificationType: type,
      syncPointId,
      workstreams,
      timestamp,
      message,
      metadata: { ...metadata, ...options?.metadata },
      priority: options?.priority ?? NotificationPriority.MEDIUM,
      status: NotificationStatus.PENDING
    };
    
    if (options?.ttl) {
      notification.expiresAt = timestamp + options.ttl;
    }
    
    this._notifications.set(id, notification);
    
    // Deliver the notification to subscribers
    await this._deliverNotification(notification);
    
    return notification;
  }
  
  /**
   * Subscribe to notifications
   * 
   * @param workstreamId The workstream subscribing
   * @param handler The handler for notifications
   * @param types Optional specific notification types to subscribe to
   * @returns A subscription object
   */
  subscribe(
    workstreamId: WorkstreamId,
    handler: NotificationHandler,
    types?: NotificationType[]
  ): NotificationSubscription {
    const subscriptionId = uuidv4();
    const notificationTypes = types || Object.values(NotificationType);
    
    const subscription: NotificationSubscription = {
      id: subscriptionId,
      workstreamId,
      types: notificationTypes,
      createdAt: Date.now(),
      unsubscribe: async () => {
        await this.unsubscribe(subscriptionId);
      }
    };
    
    this._subscriptions.set(subscriptionId, {
      subscription,
      handler
    });
    
    // Track subscription for this workstream
    let workstreamSubs = this._workstreamSubscriptions.get(workstreamId);
    
    if (!workstreamSubs) {
      workstreamSubs = new Set<string>();
      this._workstreamSubscriptions.set(workstreamId, workstreamSubs);
    }
    
    workstreamSubs.add(subscriptionId);
    
    return subscription;
  }
  
  /**
   * Unsubscribe from notifications
   * 
   * @param subscriptionId The ID of the subscription to cancel
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const sub = this._subscriptions.get(subscriptionId);
    
    if (!sub) {
      return;
    }
    
    const { subscription } = sub;
    this._subscriptions.delete(subscriptionId);
    
    // Remove from workstream subscriptions
    const workstreamSubs = this._workstreamSubscriptions.get(subscription.workstreamId);
    
    if (workstreamSubs) {
      workstreamSubs.delete(subscriptionId);
      
      if (workstreamSubs.size === 0) {
        this._workstreamSubscriptions.delete(subscription.workstreamId);
      }
    }
  }
  
  /**
   * Get a notification by ID
   * 
   * @param notificationId The ID of the notification
   * @returns The notification, or undefined if not found
   */
  getNotification(notificationId: string): NotificationInfo | undefined {
    return this._notifications.get(notificationId);
  }
  
  /**
   * Mark a notification as read
   * 
   * @param notificationId The ID of the notification
   * @param workstreamId The workstream marking the notification as read
   * @returns The updated notification
   */
  markAsRead(notificationId: string, workstreamId: WorkstreamId): NotificationInfo | undefined {
    const notification = this._notifications.get(notificationId);
    
    if (!notification || !notification.workstreams.includes(workstreamId)) {
      return undefined;
    }
    
    notification.status = NotificationStatus.READ;
    notification.readAt = Date.now();
    
    return notification;
  }
  
  /**
   * Find notifications for a workstream
   * 
   * @param workstreamId The workstream ID
   * @param status Optional status filter
   * @returns Array of notifications for this workstream
   */
  findNotificationsForWorkstream(
    workstreamId: WorkstreamId,
    status?: NotificationStatus
  ): NotificationInfo[] {
    const result: NotificationInfo[] = [];
    
    for (const notification of this._notifications.values()) {
      if (notification.workstreams.includes(workstreamId)) {
        if (!status || notification.status === status) {
          result.push(notification);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Find notifications by type
   * 
   * @param type The notification type
   * @returns Array of notifications of this type
   */
  findNotificationsByType(type: NotificationType): NotificationInfo[] {
    const result: NotificationInfo[] = [];
    
    for (const notification of this._notifications.values()) {
      if (notification.notificationType === type) {
        result.push(notification);
      }
    }
    
    return result;
  }
  
  /**
   * Find notifications by sync point
   * 
   * @param syncPointId The sync point ID
   * @returns Array of notifications for this sync point
   */
  findNotificationsBySyncPoint(syncPointId: string): NotificationInfo[] {
    const result: NotificationInfo[] = [];
    
    for (const notification of this._notifications.values()) {
      if (notification.syncPointId === syncPointId) {
        result.push(notification);
      }
    }
    
    return result;
  }
  
  /**
   * Clean up expired notifications
   * 
   * @returns The number of notifications cleaned up
   */
  cleanupExpiredNotifications(): number {
    const now = Date.now();
    let count = 0;
    
    for (const [id, notification] of this._notifications.entries()) {
      if (notification.expiresAt && notification.expiresAt < now) {
        notification.status = NotificationStatus.EXPIRED;
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Clean up old notifications
   * 
   * @param maxAge Maximum age of notifications to keep (in milliseconds)
   * @returns The number of notifications cleaned up
   */
  cleanupOldNotifications(maxAge: number): number {
    const now = Date.now();
    const cutoff = now - maxAge;
    let count = 0;
    
    for (const [id, notification] of this._notifications.entries()) {
      if (notification.timestamp < cutoff) {
        this._notifications.delete(id);
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Clean up resources for a workstream
   * 
   * @param workstreamId The workstream ID
   */
  cleanupWorkstream(workstreamId: WorkstreamId): void {
    // Unsubscribe from all notifications
    const subscriptions = this._workstreamSubscriptions.get(workstreamId);
    
    if (subscriptions) {
      for (const subscriptionId of subscriptions) {
        this.unsubscribe(subscriptionId).catch(console.error);
      }
    }
    
    this._workstreamSubscriptions.delete(workstreamId);
  }
  
  /**
   * Map notification type to SyncNotification type
   */
  private _mapNotificationType(type: NotificationType): SyncNotification['type'] {
    switch (type) {
      case NotificationType.SYNC_COMPLETE:
        return 'sync_complete';
      case NotificationType.SYNC_TIMEOUT:
        return 'sync_timeout';
      case NotificationType.DEADLOCK_DETECTED:
        return 'deadlock_detected';
      case NotificationType.CONFLICT_DETECTED:
        return 'conflict_detected';
      case NotificationType.DATA_AVAILABLE:
        return 'data_available';
      default:
        return 'data_available'; // Default fallback
    }
  }
  
  /**
   * Deliver a notification to subscribers
   */
  private async _deliverNotification(notification: NotificationInfo): Promise<void> {
    const deliveryPromises: Promise<void>[] = [];
    
    // Find subscriptions for this notification
    for (const { subscription, handler } of this._subscriptions.values()) {
      // Check if this subscription is for this notification type
      if (subscription.types.includes(notification.notificationType)) {
        // Check if this subscription is for one of the target workstreams
        if (notification.workstreams.includes(subscription.workstreamId)) {
          try {
            const deliveryPromise = Promise.resolve(handler.onNotification(notification));
            deliveryPromises.push(deliveryPromise);
          } catch (error) {
            console.error(`Error delivering notification ${notification.id} to subscription ${subscription.id}:`, error);
          }
        }
      }
    }
    
    // Wait for all deliveries to complete
    await Promise.all(deliveryPromises);
    
    // Update notification status
    notification.status = NotificationStatus.DELIVERED;
    notification.deliveredAt = Date.now();
  }
}

