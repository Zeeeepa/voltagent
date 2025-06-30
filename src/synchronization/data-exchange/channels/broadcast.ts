/**
 * Broadcast Channel Implementation
 * 
 * This module implements a broadcast channel for data exchange, where
 * data sent by one workstream is delivered to all subscribed workstreams.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  DataExchange, 
  DataExchangeId, 
  WorkstreamId 
} from '../../types';
import { 
  DataExchangeType, 
  DataExchangeOptions, 
  DataExchangeHandler,
  DataExchangeChannel,
  DataExchangeSubscription
} from '../types';

/**
 * Implementation of a broadcast channel
 * 
 * In a broadcast channel, data sent by one workstream is delivered to all
 * subscribed workstreams. This is useful for announcements and global updates.
 */
export class BroadcastChannel<T = any> implements DataExchangeChannel<T> {
  readonly id: string;
  readonly name: string;
  readonly type = DataExchangeType.BROADCAST;
  
  private _subscribers: Map<WorkstreamId, DataExchangeHandler<T>> = new Map();
  private _subscriptions: Map<string, DataExchangeSubscription> = new Map();
  private _closed = false;
  
  /**
   * Create a new broadcast channel
   * 
   * @param id Unique identifier for this channel
   * @param name Name of this channel
   */
  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }
  
  /**
   * Send data to all subscribed workstreams
   * 
   * @param sourceWorkstream The workstream sending the data
   * @param data The data to send
   * @param targetWorkstreams Optional specific workstreams to send to (ignored in broadcast)
   * @param options Options for the data exchange
   * @returns The ID of the data exchange
   */
  async send(
    sourceWorkstream: WorkstreamId,
    data: T,
    targetWorkstreams?: WorkstreamId[],
    options?: DataExchangeOptions
  ): Promise<DataExchangeId> {
    if (this._closed) {
      throw new Error(`Channel ${this.name} is closed`);
    }
    
    // In broadcast mode, we send to all subscribers if targetWorkstreams is not specified
    const actualTargets = targetWorkstreams || Array.from(this._subscribers.keys());
    
    // Create the data exchange object
    const exchange: DataExchange<T> = {
      id: uuidv4(),
      sourceWorkstream,
      targetWorkstreams: actualTargets,
      data,
      timestamp: Date.now(),
      metadata: options?.metadata
    };
    
    // Deliver to all subscribers
    for (const [workstreamId, handler] of this._subscribers.entries()) {
      // Skip the source workstream unless it's explicitly targeted
      if (workstreamId === sourceWorkstream && !targetWorkstreams?.includes(workstreamId)) {
        continue;
      }
      
      // Skip workstreams not in the target list if specified
      if (targetWorkstreams && !targetWorkstreams.includes(workstreamId)) {
        continue;
      }
      
      try {
        await handler.onData(exchange);
      } catch (error) {
        console.error(`Error delivering data to workstream ${workstreamId}:`, error);
      }
    }
    
    return exchange.id;
  }
  
  /**
   * Subscribe to data from this channel
   * 
   * @param workstreamId The workstream subscribing
   * @param handler The handler for incoming data
   * @returns A subscription object
   */
  async subscribe(
    workstreamId: WorkstreamId,
    handler: DataExchangeHandler<T>
  ): Promise<DataExchangeSubscription> {
    if (this._closed) {
      throw new Error(`Channel ${this.name} is closed`);
    }
    
    this._subscribers.set(workstreamId, handler);
    
    const subscriptionId = uuidv4();
    const subscription: DataExchangeSubscription = {
      id: subscriptionId,
      workstreamId,
      topic: this.name,
      createdAt: Date.now(),
      unsubscribe: async () => {
        await this.unsubscribe(workstreamId);
      }
    };
    
    this._subscriptions.set(subscriptionId, subscription);
    
    return subscription;
  }
  
  /**
   * Unsubscribe from this channel
   * 
   * @param workstreamId The workstream unsubscribing
   * @returns Promise that resolves when unsubscribed
   */
  async unsubscribe(workstreamId: WorkstreamId): Promise<void> {
    this._subscribers.delete(workstreamId);
    
    // Remove all subscriptions for this workstream
    for (const [id, subscription] of this._subscriptions.entries()) {
      if (subscription.workstreamId === workstreamId) {
        this._subscriptions.delete(id);
      }
    }
  }
  
  /**
   * Close this channel
   * 
   * @returns Promise that resolves when the channel is closed
   */
  async close(): Promise<void> {
    this._closed = true;
    this._subscribers.clear();
    this._subscriptions.clear();
  }
  
  /**
   * Get the number of subscribers to this channel
   * 
   * @returns The number of subscribers
   */
  getSubscriberCount(): number {
    return this._subscribers.size;
  }
  
  /**
   * Check if a workstream is subscribed to this channel
   * 
   * @param workstreamId The workstream ID to check
   * @returns True if subscribed, false otherwise
   */
  isSubscribed(workstreamId: WorkstreamId): boolean {
    return this._subscribers.has(workstreamId);
  }
  
  /**
   * Get all subscriptions for this channel
   * 
   * @returns Array of all subscriptions
   */
  getAllSubscriptions(): DataExchangeSubscription[] {
    return Array.from(this._subscriptions.values());
  }
}

