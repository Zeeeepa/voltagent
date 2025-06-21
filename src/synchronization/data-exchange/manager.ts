/**
 * Data Exchange Manager
 * 
 * This module provides a central manager for data exchange between workstreams.
 * It supports creating and managing different types of data exchange channels.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  DataExchange, 
  DataExchangeId, 
  WorkstreamId 
} from '../types';
import { 
  DataExchangeType, 
  DataExchangeOptions, 
  DataExchangeHandler,
  DataExchangeChannel,
  DataExchangeSubscription
} from './types';
import { BroadcastChannel } from './channels/broadcast';
import { DirectChannel } from './channels/direct';
import { PublishSubscribeChannel } from './channels/publish-subscribe';
import { QueueChannel } from './channels/queue';
import { SharedMemoryChannel } from './channels/shared-memory';

/**
 * Manager for data exchange between workstreams
 */
export class DataExchangeManager {
  private _channels: Map<string, DataExchangeChannel<any>> = new Map();
  private _exchanges: Map<DataExchangeId, DataExchange<any>> = new Map();
  private _workstreamSubscriptions: Map<WorkstreamId, Set<string>> = new Map();
  
  /**
   * Create a new data exchange channel
   * 
   * @param name Name of the channel
   * @param type Type of channel to create
   * @returns The created channel
   */
  createChannel<T = any>(name: string, type: DataExchangeType): DataExchangeChannel<T> {
    const id = `${name}-${uuidv4()}`;
    
    let channel: DataExchangeChannel<T>;
    
    switch (type) {
      case DataExchangeType.BROADCAST:
        channel = new BroadcastChannel<T>(id, name);
        break;
      case DataExchangeType.DIRECT:
        channel = new DirectChannel<T>(id, name);
        break;
      case DataExchangeType.PUBLISH_SUBSCRIBE:
        channel = new PublishSubscribeChannel<T>(id, name);
        break;
      case DataExchangeType.QUEUE:
        channel = new QueueChannel<T>(id, name);
        break;
      case DataExchangeType.SHARED_MEMORY:
        channel = new SharedMemoryChannel<T>(id, name);
        break;
      default:
        throw new Error(`Unsupported channel type: ${type}`);
    }
    
    this._channels.set(id, channel);
    return channel;
  }
  
  /**
   * Get an existing channel by ID
   * 
   * @param channelId ID of the channel to get
   * @returns The channel, or undefined if not found
   */
  getChannel<T = any>(channelId: string): DataExchangeChannel<T> | undefined {
    return this._channels.get(channelId) as DataExchangeChannel<T> | undefined;
  }
  
  /**
   * Find channels by name
   * 
   * @param name Name to search for
   * @returns Array of matching channels
   */
  findChannelsByName<T = any>(name: string): Array<DataExchangeChannel<T>> {
    const result: Array<DataExchangeChannel<T>> = [];
    
    for (const channel of this._channels.values()) {
      if (channel.name === name) {
        result.push(channel as DataExchangeChannel<T>);
      }
    }
    
    return result;
  }
  
  /**
   * Find channels by type
   * 
   * @param type Type to search for
   * @returns Array of matching channels
   */
  findChannelsByType<T = any>(type: DataExchangeType): Array<DataExchangeChannel<T>> {
    const result: Array<DataExchangeChannel<T>> = [];
    
    for (const channel of this._channels.values()) {
      if (channel.type === type) {
        result.push(channel as DataExchangeChannel<T>);
      }
    }
    
    return result;
  }
  
  /**
   * Close a channel
   * 
   * @param channelId ID of the channel to close
   * @returns Promise that resolves when the channel is closed
   */
  async closeChannel(channelId: string): Promise<void> {
    const channel = this._channels.get(channelId);
    if (channel) {
      await channel.close();
      this._channels.delete(channelId);
    }
  }
  
  /**
   * Register a data exchange
   * 
   * @param exchange The data exchange to register
   */
  registerExchange<T = any>(exchange: DataExchange<T>): void {
    this._exchanges.set(exchange.id, exchange);
  }
  
  /**
   * Get a data exchange by ID
   * 
   * @param exchangeId ID of the exchange to get
   * @returns The exchange, or undefined if not found
   */
  getExchange<T = any>(exchangeId: DataExchangeId): DataExchange<T> | undefined {
    return this._exchanges.get(exchangeId) as DataExchange<T> | undefined;
  }
  
  /**
   * Find exchanges by source workstream
   * 
   * @param workstreamId Source workstream ID
   * @returns Array of matching exchanges
   */
  findExchangesBySource<T = any>(workstreamId: WorkstreamId): Array<DataExchange<T>> {
    const result: Array<DataExchange<T>> = [];
    
    for (const exchange of this._exchanges.values()) {
      if (exchange.sourceWorkstream === workstreamId) {
        result.push(exchange as DataExchange<T>);
      }
    }
    
    return result;
  }
  
  /**
   * Find exchanges by target workstream
   * 
   * @param workstreamId Target workstream ID
   * @returns Array of matching exchanges
   */
  findExchangesByTarget<T = any>(workstreamId: WorkstreamId): Array<DataExchange<T>> {
    const result: Array<DataExchange<T>> = [];
    
    for (const exchange of this._exchanges.values()) {
      if (exchange.targetWorkstreams.includes(workstreamId)) {
        result.push(exchange as DataExchange<T>);
      }
    }
    
    return result;
  }
  
  /**
   * Track a subscription for a workstream
   * 
   * @param workstreamId The workstream ID
   * @param subscriptionId The subscription ID
   */
  trackSubscription(workstreamId: WorkstreamId, subscriptionId: string): void {
    let subscriptions = this._workstreamSubscriptions.get(workstreamId);
    
    if (!subscriptions) {
      subscriptions = new Set<string>();
      this._workstreamSubscriptions.set(workstreamId, subscriptions);
    }
    
    subscriptions.add(subscriptionId);
  }
  
  /**
   * Untrack a subscription for a workstream
   * 
   * @param workstreamId The workstream ID
   * @param subscriptionId The subscription ID
   */
  untrackSubscription(workstreamId: WorkstreamId, subscriptionId: string): void {
    const subscriptions = this._workstreamSubscriptions.get(workstreamId);
    
    if (subscriptions) {
      subscriptions.delete(subscriptionId);
      
      if (subscriptions.size === 0) {
        this._workstreamSubscriptions.delete(workstreamId);
      }
    }
  }
  
  /**
   * Get all subscriptions for a workstream
   * 
   * @param workstreamId The workstream ID
   * @returns Array of subscription IDs
   */
  getWorkstreamSubscriptions(workstreamId: WorkstreamId): string[] {
    const subscriptions = this._workstreamSubscriptions.get(workstreamId);
    return subscriptions ? Array.from(subscriptions) : [];
  }
  
  /**
   * Clean up resources for a workstream
   * 
   * @param workstreamId The workstream ID
   */
  cleanupWorkstream(workstreamId: WorkstreamId): void {
    // Unsubscribe from all channels
    for (const channel of this._channels.values()) {
      channel.unsubscribe(workstreamId).catch(console.error);
    }
    
    // Remove subscription tracking
    this._workstreamSubscriptions.delete(workstreamId);
  }
  
  /**
   * Create a new data exchange object
   * 
   * @param sourceWorkstream The source workstream
   * @param targetWorkstreams The target workstreams
   * @param data The data to exchange
   * @param options Options for the exchange
   * @returns The created data exchange
   */
  createExchange<T = any>(
    sourceWorkstream: WorkstreamId,
    targetWorkstreams: WorkstreamId[],
    data: T,
    options?: DataExchangeOptions
  ): DataExchange<T> {
    const exchange: DataExchange<T> = {
      id: uuidv4(),
      sourceWorkstream,
      targetWorkstreams,
      data,
      timestamp: Date.now(),
      metadata: options?.metadata
    };
    
    this.registerExchange(exchange);
    return exchange;
  }
}

