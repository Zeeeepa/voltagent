/**
 * Deadlock Prevention Types
 * 
 * This module defines the types and interfaces for the deadlock detection
 * and prevention system.
 */

import { Deadlock, WorkstreamId } from '../types';

/**
 * Type of resource in the resource allocation graph
 */
export enum ResourceType {
  SYNC_PRIMITIVE = 'sync_primitive',
  DATA_CHANNEL = 'data_channel',
  EXTERNAL_RESOURCE = 'external_resource',
  CUSTOM = 'custom'
}

/**
 * Status of a resource
 */
export enum ResourceStatus {
  FREE = 'free',
  ALLOCATED = 'allocated',
  REQUESTED = 'requested',
  LOCKED = 'locked'
}

/**
 * Type of deadlock detection algorithm
 */
export enum DeadlockDetectionAlgorithm {
  WAIT_FOR_GRAPH = 'wait_for_graph',
  RESOURCE_ALLOCATION_GRAPH = 'resource_allocation_graph',
  BANKER_ALGORITHM = 'banker_algorithm',
  TIMEOUT_BASED = 'timeout_based'
}

/**
 * Type of deadlock prevention strategy
 */
export enum DeadlockPreventionStrategy {
  TIMEOUT = 'timeout',
  RESOURCE_ORDERING = 'resource_ordering',
  PREEMPTION = 'preemption',
  AVOIDANCE = 'avoidance',
  DETECTION_RECOVERY = 'detection_recovery'
}

/**
 * Resource node in the resource allocation graph
 */
export interface ResourceNode {
  /**
   * Unique identifier for this resource
   */
  id: string;
  
  /**
   * Name of this resource
   */
  name: string;
  
  /**
   * Type of this resource
   */
  type: ResourceType;
  
  /**
   * Current status of this resource
   */
  status: ResourceStatus;
  
  /**
   * Workstream that currently holds this resource (if allocated)
   */
  allocatedTo?: WorkstreamId;
  
  /**
   * Workstreams that are waiting for this resource
   */
  requestedBy: WorkstreamId[];
  
  /**
   * Priority of this resource (used for preemption)
   */
  priority?: number;
  
  /**
   * Whether this resource can be preempted
   */
  preemptible?: boolean;
  
  /**
   * Maximum number of instances of this resource
   */
  maxInstances?: number;
  
  /**
   * Number of available instances of this resource
   */
  availableInstances?: number;
}

/**
 * Workstream node in the resource allocation graph
 */
export interface WorkstreamNode {
  /**
   * Unique identifier for this workstream
   */
  id: WorkstreamId;
  
  /**
   * Resources allocated to this workstream
   */
  allocatedResources: string[];
  
  /**
   * Resources requested by this workstream
   */
  requestedResources: string[];
  
  /**
   * Priority of this workstream (used for preemption)
   */
  priority?: number;
  
  /**
   * Maximum resource needs for this workstream (used for Banker's algorithm)
   */
  maxResourceNeeds?: Record<string, number>;
  
  /**
   * Current resource allocation for this workstream (used for Banker's algorithm)
   */
  currentAllocation?: Record<string, number>;
}

/**
 * Edge in the resource allocation graph
 */
export interface ResourceEdge {
  /**
   * Source node ID (workstream or resource)
   */
  from: string;
  
  /**
   * Target node ID (workstream or resource)
   */
  to: string;
  
  /**
   * Type of edge (allocation or request)
   */
  type: 'allocation' | 'request';
  
  /**
   * When this edge was created
   */
  createdAt: number;
}

/**
 * Extended deadlock information
 */
export interface DeadlockInfo extends Deadlock {
  /**
   * Detection algorithm that found this deadlock
   */
  detectionAlgorithm: DeadlockDetectionAlgorithm;
  
  /**
   * Prevention strategy to use
   */
  preventionStrategy: DeadlockPreventionStrategy;
  
  /**
   * Whether this deadlock has been resolved
   */
  resolved: boolean;
  
  /**
   * When this deadlock was resolved (if resolved)
   */
  resolvedAt?: number;
  
  /**
   * How this deadlock was resolved (if resolved)
   */
  resolutionMethod?: string;
}

