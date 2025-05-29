import { Analyzer } from './types';
import { AccessControlAnalyzer } from './modules/security';

/**
 * Factory for creating analysis modules
 */
export class AnalyzerFactory {
  private static analyzers: Map<string, () => Analyzer> = new Map([
    ['access_control', () => new AccessControlAnalyzer()],
    // Future analyzers will be added here:
    // ['vulnerability_detection', () => new VulnerabilityAnalyzer()],
    // ['code_complexity', () => new ComplexityAnalyzer()],
    // ['performance_hotspot', () => new PerformanceAnalyzer()],
  ]);

  /**
   * Create an analyzer by name
   */
  static createAnalyzer(name: string): Analyzer | null {
    const factory = this.analyzers.get(name);
    return factory ? factory() : null;
  }

  /**
   * Get all available analyzer names
   */
  static getAvailableAnalyzers(): string[] {
    return Array.from(this.analyzers.keys());
  }

  /**
   * Register a new analyzer
   */
  static registerAnalyzer(name: string, factory: () => Analyzer): void {
    this.analyzers.set(name, factory);
  }

  /**
   * Create all available analyzers
   */
  static createAllAnalyzers(): Analyzer[] {
    return Array.from(this.analyzers.values()).map(factory => factory());
  }

  /**
   * Create security analyzers only
   */
  static createSecurityAnalyzers(): Analyzer[] {
    const securityAnalyzerNames = ['access_control', 'vulnerability_detection'];
    return securityAnalyzerNames
      .map(name => this.createAnalyzer(name))
      .filter((analyzer): analyzer is Analyzer => analyzer !== null);
  }
}

