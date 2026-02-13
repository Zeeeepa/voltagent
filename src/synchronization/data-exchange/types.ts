/**
 * Data Exchange Types
 * 
 * This module defines the types and interfaces for the data exchange mechanism
 * between parallel workstreams.
 */

import { DataExchange, DataExchangeId, WorkstreamId } from '../types';

/**
 * Type of data exchange operation
 */
export enum DataExchangeType {
  BROADCAST = 'broadcast',
  DIRECT = 'direct',
  PUBLISH_SUBSCRIBE = 'publish_subscribe',
  QUEUE = 'queue',
  SHARED_MEMORY = 'shared_memory'
}

/**
 * Status of a data exchange operation
 */
export enum DataExchangeStatus {
  PENDING = 'pending',
  SENT = 'sent',
  RECEIVED = 'received',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

/**
 * Options for data exchange operations
 */
export interface DataExchangeOptions {
  /**
   * Time-to-live for the data in milliseconds
   */
  ttl?: number;
  
  /**
   * Whether to persist the data for future workstreams
   */
  persistent?: boolean;
  
  /**
   * Priority of the data exchange
   */
  priority?: number;
  
  /**
   * Whether to compress the data
   */
  compress?: boolean;
  
  /**
   * Whether to encrypt the data
   */
  encrypt?: boolean;
  
  /**
   * Custom metadata for the data exchange
   */
  metadata?: Record<string, any>;
}

/**
 * Interface for data exchange handlers
 */
export interface DataExchangeHandler<T = any> {
  /**
   * Handle incoming data from another workstream
   * 
   * @param exchange The data exchange object
   */
  onData(exchange: DataExchange<T>): void | Promise<void>;
}

/**
 * Interface for data exchange subscriptions
 */
export interface DataExchangeSubscription {
  /**
   * Unique identifier for this subscription
   */
  id: string;
  
  /**
   * The workstream that created this subscription
   */
  workstreamId: WorkstreamId;
  
  /**
   * The topic or channel this subscription is for
   */
  topic: string;
  
  /**
   * When this subscription was created
   */
  createdAt: number;
  
  /**
   * When this subscription expires (if applicable)
   */
  expiresAt?: number;
  
  /**
   * Unsubscribe from this topic
   */
  unsubscribe(): void | Promise<void>;
}

/**
 * Interface for data exchange channels
 */
export interface DataExchangeChannel<T = any> {
  /**
   * Unique identifier for this channel
   */
  readonly id: string;
  
  /**
   * Name of this channel
   */
  readonly name: string;
  
  /**
   * Type of this channel
   */
  readonly type: DataExchangeType;
  
  /**
   * Send data to this channel
   * 
   * @param sourceWorkstream The workstream sending the data
   * @param data The data to send
   * @param targetWorkstreams Optional specific workstreams to send to
   * @param options Options for the data exchange
   * @returns The ID of the data exchange
   */
  send(
    sourceWorkstream: WorkstreamId,
    data: T,
    targetWorkstreams?: WorkstreamId[],
    options?: DataExchangeOptions
  ): Promise<DataExchangeId>;
  
  /**
   * Subscribe to data from this channel
   * 
   * @param workstreamId The workstream subscribing
   * @param handler The handler for incoming data
   * @returns A subscription object
   */
  subscribe(
    workstreamId: WorkstreamId,
    handler: DataExchangeHandler<T>
  ): Promise<DataExchangeSubscription>;
  
  /**
   * Unsubscribe from this channel
   * 
   * @param workstreamId The workstream unsubscribing
   * @returns Promise that resolves when unsubscribed
   */
  unsubscribe(workstreamId: WorkstreamId): Promise<void>;
  
  /**
   * Close this channel
   * 
   * @returns Promise that resolves when the channel is closed
   */
  close(): Promise<void>;
}

