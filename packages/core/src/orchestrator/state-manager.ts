import { EventEmitter } from "events";
import type {
  ComponentStatus,
  ComponentHealth,
  OrchestratorComponent,
  StatePersistenceOptions,
  OrchestratorEvent,
} from "./types";

/**
 * State change event
 */
export interface StateChangeEvent {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: Date;
  source: string;
}

/**
 * State snapshot
 */
export interface StateSnapshot {
  id: string;
  timestamp: Date;
  state: Record<string, unknown>;
  version: number;
  checksum: string;
}

/**
 * State Manager - Global system state tracking with persistence and recovery
 */
export class StateManager implements OrchestratorComponent {
  public readonly id: string;
  public readonly name: string = "StateManager";
  private _status: ComponentStatus = "idle";
  private state: Map<string, unknown> = new Map();
  private stateHistory: StateChangeEvent[] = [];
  private snapshots: StateSnapshot[] = [];
  private eventEmitter: EventEmitter = new EventEmitter();
  private startTime: Date = new Date();
  private errorCount: number = 0;
  private lastError?: Error;
  private syncTimer?: NodeJS.Timeout;
  private readonly persistenceOptions: StatePersistenceOptions;
  private readonly maxHistorySize: number;
  private readonly maxSnapshots: number;
  private stateVersion: number = 0;

  constructor(options: {
    id?: string;
    persistence?: StatePersistenceOptions;
    maxHistorySize?: number;
    maxSnapshots?: number;
  } = {}) {
    this.id = options.id || `state-manager-${Date.now()}`;
    this.maxHistorySize = options.maxHistorySize || 10000;
    this.maxSnapshots = options.maxSnapshots || 100;
    this.persistenceOptions = options.persistence || {
      enabled: false,
      storage: "memory",
    };
  }

  public get status(): ComponentStatus {
    return this._status;
  }

  /**
   * Start the state manager
   */
  public async start(): Promise<void> {
    if (this._status === "running") {
      return;
    }

    this._status = "starting";

    try {
      // Load persisted state if enabled
      if (this.persistenceOptions.enabled) {
        await this.loadPersistedState();
      }

      // Start sync timer if persistence is enabled
      if (this.persistenceOptions.enabled && this.persistenceOptions.syncInterval) {
        this.syncTimer = setInterval(
          () => this.syncState(),
          this.persistenceOptions.syncInterval
        );
      }

      this._status = "running";
      this.startTime = new Date();

      this.emitStateEvent("state.manager.started", {
        managerId: this.id,
        stateSize: this.state.size,
        version: this.stateVersion,
      });
    } catch (error) {
      this._status = "error";
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Stop the state manager
   */
  public async stop(): Promise<void> {
    if (this._status === "stopped") {
      return;
    }

    this._status = "stopping";

    try {
      // Clear sync timer
      if (this.syncTimer) {
        clearInterval(this.syncTimer);
        this.syncTimer = undefined;
      }

      // Final sync if persistence is enabled
      if (this.persistenceOptions.enabled) {
        await this.syncState();
      }

      this._status = "stopped";

      this.emitStateEvent("state.manager.stopped", {
        managerId: this.id,
        finalStateSize: this.state.size,
        version: this.stateVersion,
      });
    } catch (error) {
      this._status = "error";
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Restart the state manager
   */
  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * Get component health information
   */
  public getHealth(): ComponentHealth {
    return {
      id: this.id,
      name: this.name,
      status: this._status,
      lastHeartbeat: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      memoryUsage: this.calculateMemoryUsage(),
      errorCount: this.errorCount,
      lastError: this.lastError,
      metadata: {
        stateSize: this.state.size,
        historySize: this.stateHistory.length,
        snapshotCount: this.snapshots.length,
        version: this.stateVersion,
        persistenceEnabled: this.persistenceOptions.enabled,
      },
    };
  }

  /**
   * Get component metrics
   */
  public getMetrics(): Record<string, unknown> {
    return {
      stateSize: this.state.size,
      historySize: this.stateHistory.length,
      snapshotCount: this.snapshots.length,
      version: this.stateVersion,
      memoryUsage: this.calculateMemoryUsage(),
      uptime: Date.now() - this.startTime.getTime(),
      errorRate: this.errorCount / Math.max(this.stateHistory.length, 1),
    };
  }

  /**
   * Set state value
   */
  public setState(key: string, value: unknown, source: string = "unknown"): void {
    if (this._status !== "running") {
      throw new Error("StateManager is not running");
    }

    try {
      const oldValue = this.state.get(key);
      this.state.set(key, value);
      this.stateVersion++;

      const changeEvent: StateChangeEvent = {
        key,
        oldValue,
        newValue: value,
        timestamp: new Date(),
        source,
      };

      this.addToHistory(changeEvent);
      this.emitStateEvent("state.changed", changeEvent);

      // Emit specific key change event
      this.eventEmitter.emit(`state.changed.${key}`, changeEvent);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Get state value
   */
  public getState<T = unknown>(key: string): T | undefined {
    return this.state.get(key) as T;
  }

  /**
   * Check if state key exists
   */
  public hasState(key: string): boolean {
    return this.state.has(key);
  }

  /**
   * Delete state value
   */
  public deleteState(key: string, source: string = "unknown"): boolean {
    if (this._status !== "running") {
      throw new Error("StateManager is not running");
    }

    try {
      if (!this.state.has(key)) {
        return false;
      }

      const oldValue = this.state.get(key);
      this.state.delete(key);
      this.stateVersion++;

      const changeEvent: StateChangeEvent = {
        key,
        oldValue,
        newValue: undefined,
        timestamp: new Date(),
        source,
      };

      this.addToHistory(changeEvent);
      this.emitStateEvent("state.deleted", changeEvent);

      return true;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Get all state keys
   */
  public getStateKeys(): string[] {
    return Array.from(this.state.keys());
  }

  /**
   * Get entire state as object
   */
  public getAllState(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of this.state.entries()) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Set multiple state values atomically
   */
  public setMultipleState(
    updates: Record<string, unknown>,
    source: string = "unknown"
  ): void {
    if (this._status !== "running") {
      throw new Error("StateManager is not running");
    }

    try {
      const changes: StateChangeEvent[] = [];

      for (const [key, value] of Object.entries(updates)) {
        const oldValue = this.state.get(key);
        this.state.set(key, value);

        changes.push({
          key,
          oldValue,
          newValue: value,
          timestamp: new Date(),
          source,
        });
      }

      this.stateVersion++;

      // Add all changes to history
      changes.forEach(change => this.addToHistory(change));

      this.emitStateEvent("state.batch.changed", {
        changes,
        source,
        version: this.stateVersion,
      });
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Subscribe to state changes
   */
  public onStateChange(
    key: string | "*",
    callback: (event: StateChangeEvent) => void
  ): void {
    if (key === "*") {
      this.eventEmitter.on("state.changed", callback);
    } else {
      this.eventEmitter.on(`state.changed.${key}`, callback);
    }
  }

  /**
   * Unsubscribe from state changes
   */
  public offStateChange(
    key: string | "*",
    callback: (event: StateChangeEvent) => void
  ): void {
    if (key === "*") {
      this.eventEmitter.off("state.changed", callback);
    } else {
      this.eventEmitter.off(`state.changed.${key}`, callback);
    }
  }

  /**
   * Create state snapshot
   */
  public createSnapshot(id?: string): StateSnapshot {
    const snapshot: StateSnapshot = {
      id: id || `snapshot_${Date.now()}`,
      timestamp: new Date(),
      state: this.getAllState(),
      version: this.stateVersion,
      checksum: this.calculateChecksum(this.getAllState()),
    };

    this.snapshots.push(snapshot);

    // Maintain snapshot limit
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    this.emitStateEvent("state.snapshot.created", {
      snapshotId: snapshot.id,
      version: snapshot.version,
      stateSize: this.state.size,
    });

    return snapshot;
  }

  /**
   * Restore from snapshot
   */
  public restoreFromSnapshot(snapshotId: string, source: string = "snapshot"): boolean {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      return false;
    }

    try {
      // Verify checksum
      const currentChecksum = this.calculateChecksum(snapshot.state);
      if (currentChecksum !== snapshot.checksum) {
        throw new Error("Snapshot checksum mismatch - data may be corrupted");
      }

      // Clear current state
      this.state.clear();

      // Restore state
      for (const [key, value] of Object.entries(snapshot.state)) {
        this.state.set(key, value);
      }

      this.stateVersion = snapshot.version;

      this.emitStateEvent("state.restored", {
        snapshotId: snapshot.id,
        version: snapshot.version,
        source,
      });

      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  /**
   * Get state history
   */
  public getStateHistory(filter?: {
    key?: string;
    fromTime?: Date;
    toTime?: Date;
    limit?: number;
  }): StateChangeEvent[] {
    let history = this.stateHistory;

    if (filter) {
      if (filter.key) {
        history = history.filter(event => event.key === filter.key);
      }
      if (filter.fromTime) {
        history = history.filter(event => event.timestamp >= filter.fromTime!);
      }
      if (filter.toTime) {
        history = history.filter(event => event.timestamp <= filter.toTime!);
      }
      if (filter.limit) {
        history = history.slice(-filter.limit);
      }
    }

    return history;
  }

  /**
   * Get available snapshots
   */
  public getSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Clear state history
   */
  public clearHistory(): void {
    this.stateHistory = [];
    this.emitStateEvent("state.history.cleared", {
      managerId: this.id,
      timestamp: new Date(),
    });
  }

  /**
   * Clear snapshots
   */
  public clearSnapshots(): void {
    this.snapshots = [];
    this.emitStateEvent("state.snapshots.cleared", {
      managerId: this.id,
      timestamp: new Date(),
    });
  }

  /**
   * Sync state to persistent storage
   */
  private async syncState(): Promise<void> {
    if (!this.persistenceOptions.enabled) {
      return;
    }

    try {
      const stateData = {
        state: this.getAllState(),
        version: this.stateVersion,
        timestamp: new Date(),
      };

      switch (this.persistenceOptions.storage) {
        case "file":
          await this.syncToFile(stateData);
          break;
        case "database":
          await this.syncToDatabase(stateData);
          break;
        case "redis":
          await this.syncToRedis(stateData);
          break;
        default:
          // Memory storage - no sync needed
          break;
      }

      this.emitStateEvent("state.synced", {
        storage: this.persistenceOptions.storage,
        version: this.stateVersion,
        timestamp: new Date(),
      });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Load persisted state
   */
  private async loadPersistedState(): Promise<void> {
    if (!this.persistenceOptions.enabled) {
      return;
    }

    try {
      let stateData: any = null;

      switch (this.persistenceOptions.storage) {
        case "file":
          stateData = await this.loadFromFile();
          break;
        case "database":
          stateData = await this.loadFromDatabase();
          break;
        case "redis":
          stateData = await this.loadFromRedis();
          break;
        default:
          return;
      }

      if (stateData && stateData.state) {
        this.state.clear();
        for (const [key, value] of Object.entries(stateData.state)) {
          this.state.set(key, value);
        }
        this.stateVersion = stateData.version || 0;

        this.emitStateEvent("state.loaded", {
          storage: this.persistenceOptions.storage,
          version: this.stateVersion,
          stateSize: this.state.size,
        });
      }
    } catch (error) {
      console.warn("Failed to load persisted state:", error);
      // Don't throw - continue with empty state
    }
  }

  /**
   * Sync to file storage
   */
  private async syncToFile(stateData: any): Promise<void> {
    // Implementation would depend on file system access
    // For now, this is a placeholder
    console.log("Syncing state to file:", this.persistenceOptions.path);
  }

  /**
   * Sync to database storage
   */
  private async syncToDatabase(stateData: any): Promise<void> {
    // Implementation would depend on database connection
    // For now, this is a placeholder
    console.log("Syncing state to database:", this.persistenceOptions.connectionString);
  }

  /**
   * Sync to Redis storage
   */
  private async syncToRedis(stateData: any): Promise<void> {
    // Implementation would depend on Redis connection
    // For now, this is a placeholder
    console.log("Syncing state to Redis:", this.persistenceOptions.connectionString);
  }

  /**
   * Load from file storage
   */
  private async loadFromFile(): Promise<any> {
    // Implementation would depend on file system access
    // For now, this is a placeholder
    console.log("Loading state from file:", this.persistenceOptions.path);
    return null;
  }

  /**
   * Load from database storage
   */
  private async loadFromDatabase(): Promise<any> {
    // Implementation would depend on database connection
    // For now, this is a placeholder
    console.log("Loading state from database:", this.persistenceOptions.connectionString);
    return null;
  }

  /**
   * Load from Redis storage
   */
  private async loadFromRedis(): Promise<any> {
    // Implementation would depend on Redis connection
    // For now, this is a placeholder
    console.log("Loading state from Redis:", this.persistenceOptions.connectionString);
    return null;
  }

  /**
   * Add change event to history
   */
  private addToHistory(event: StateChangeEvent): void {
    this.stateHistory.push(event);

    // Maintain history size limit
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory = this.stateHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Calculate memory usage estimate
   */
  private calculateMemoryUsage(): number {
    // Rough estimate of memory usage
    let size = 0;
    for (const [key, value] of this.state.entries()) {
      size += key.length * 2; // UTF-16 characters
      size += this.estimateValueSize(value);
    }
    return size;
  }

  /**
   * Estimate size of a value in bytes
   */
  private estimateValueSize(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === "string") return value.length * 2;
    if (typeof value === "number") return 8;
    if (typeof value === "boolean") return 1;
    if (typeof value === "object") {
      return JSON.stringify(value).length * 2;
    }
    return 0;
  }

  /**
   * Calculate checksum for state data
   */
  private calculateChecksum(data: Record<string, unknown>): string {
    // Simple checksum implementation
    const str = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Emit state-related events
   */
  private emitStateEvent(type: string, data: any): void {
    const event: OrchestratorEvent = {
      id: `state_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      source: this.id,
      timestamp: new Date(),
      version: 1,
      status: "completed",
      affectedNodeId: this.id,
      data,
    };

    this.eventEmitter.emit(type, event);
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    this.errorCount++;
    this.lastError = error;
    console.error(`StateManager Error:`, error);

    this.emitStateEvent("state.manager.error", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date(),
    });
  }
}

