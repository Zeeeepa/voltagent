import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { z } from 'zod';

// Build configuration schemas
const BuildStepSchema = z.object({
  name: z.string(),
  command: z.string(),
  workingDir: z.string().optional(),
  timeout: z.number().default(600000), // 10 minutes
  retries: z.number().default(1),
  required: z.boolean().default(true),
  parallel: z.boolean().default(false),
  dependencies: z.array(z.string()).default([]),
  environment: z.record(z.string()).default({}),
});

const BuildConfigSchema = z.object({
  steps: z.array(BuildStepSchema),
  parallelJobs: z.number().default(2),
  timeout: z.number().default(1800000), // 30 minutes
  cacheEnabled: z.boolean().default(true),
  cacheDir: z.string().default('.build-cache'),
  artifactDir: z.string().default('dist'),
  cleanBeforeBuild: z.boolean().default(false),
});

export type BuildConfig = z.infer<typeof BuildConfigSchema>;
export type BuildStep = z.infer<typeof BuildStepSchema>;

export interface BuildResult {
  success: boolean;
  environmentId: string;
  buildTime: number;
  stepResults: BuildStepResult[];
  artifacts: BuildArtifact[];
  cacheStats: CacheStats;
  logs: string[];
  errors: string[];
}

export interface BuildStepResult {
  name: string;
  success: boolean;
  duration: number;
  output: string;
  error?: string;
  retries: number;
  cached: boolean;
  artifacts: string[];
}

export interface BuildArtifact {
  name: string;
  path: string;
  size: number;
  type: 'file' | 'directory';
  checksum: string;
  createdAt: Date;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  entries: number;
}

export class WSL2BuildSystem extends EventEmitter {
  private config: BuildConfig;
  private cache: Map<string, any> = new Map();

  constructor(config: BuildConfig) {
    super();
    this.config = BuildConfigSchema.parse(config);
  }

  /**
   * Execute the complete build process
   */
  async build(environmentId: string, projectPath: string): Promise<BuildResult> {
    const startTime = Date.now();
    const result: BuildResult = {
      success: false,
      environmentId,
      buildTime: 0,
      stepResults: [],
      artifacts: [],
      cacheStats: {
        hits: 0,
        misses: 0,
        size: 0,
        entries: 0,
      },
      logs: [],
      errors: [],
    };

    try {
      this.emit('build:started', { environmentId, projectPath });

      // Clean build directory if requested
      if (this.config.cleanBeforeBuild) {
        await this.cleanBuildDirectory(environmentId, projectPath, result);
      }

      // Initialize cache
      if (this.config.cacheEnabled) {
        await this.initializeCache(environmentId, projectPath, result);
      }

      // Execute build steps
      result.stepResults = await this.executeBuildSteps(environmentId, projectPath, result);

      // Collect build artifacts
      result.artifacts = await this.collectArtifacts(environmentId, projectPath, result);

      // Update cache statistics
      if (this.config.cacheEnabled) {
        result.cacheStats = await this.getCacheStats(environmentId, projectPath);
      }

      // Check if all required steps succeeded
      const requiredSteps = this.config.steps.filter(step => step.required);
      const requiredStepResults = result.stepResults.filter(stepResult => 
        requiredSteps.some(step => step.name === stepResult.name)
      );
      result.success = requiredStepResults.every(stepResult => stepResult.success);

      this.emit('build:completed', result);
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      this.emit('build:failed', result, error);
    } finally {
      result.buildTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute build steps with dependency resolution and parallelization
   */
  private async executeBuildSteps(
    environmentId: string,
    projectPath: string,
    result: BuildResult
  ): Promise<BuildStepResult[]> {
    this.emit('build:steps:started', { environmentId, stepCount: this.config.steps.length });

    const stepResults: BuildStepResult[] = [];
    const executedSteps = new Set<string>();
    const executionOrder = this.resolveBuildOrder(this.config.steps);

    for (const stepGroup of executionOrder) {
      if (stepGroup.length === 1 || !stepGroup.every(step => step.parallel)) {
        // Execute steps sequentially
        for (const step of stepGroup) {
          const stepResult = await this.executeBuildStep(environmentId, projectPath, step, result);
          stepResults.push(stepResult);
          executedSteps.add(step.name);
        }
      } else {
        // Execute steps in parallel
        const parallelPromises = stepGroup.map(step => 
          this.executeBuildStep(environmentId, projectPath, step, result)
        );
        const parallelResults = await Promise.all(parallelPromises);
        stepResults.push(...parallelResults);
        stepGroup.forEach(step => executedSteps.add(step.name));
      }
    }

    this.emit('build:steps:completed', { environmentId, results: stepResults });
    return stepResults;
  }

  /**
   * Execute a single build step
   */
  private async executeBuildStep(
    environmentId: string,
    projectPath: string,
    step: BuildStep,
    buildResult: BuildResult
  ): Promise<BuildStepResult> {
    const startTime = Date.now();
    const stepResult: BuildStepResult = {
      name: step.name,
      success: false,
      duration: 0,
      output: '',
      retries: 0,
      cached: false,
      artifacts: [],
    };

    try {
      this.emit('build:step:started', { environmentId, step: step.name });

      // Check cache if enabled
      if (this.config.cacheEnabled) {
        const cachedResult = await this.checkCache(environmentId, projectPath, step);
        if (cachedResult) {
          stepResult.cached = true;
          stepResult.success = true;
          stepResult.output = 'Retrieved from cache';
          stepResult.artifacts = cachedResult.artifacts;
          buildResult.cacheStats.hits++;
          this.emit('build:step:cached', { environmentId, step: step.name });
          return stepResult;
        }
        buildResult.cacheStats.misses++;
      }

      // Execute step with retries
      let lastError: string | undefined;
      while (stepResult.retries <= step.retries) {
        try {
          const output = await this.executeStepCommand(environmentId, projectPath, step);
          stepResult.output = output;
          stepResult.success = true;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
          stepResult.retries++;
          
          if (stepResult.retries <= step.retries) {
            this.emit('build:step:retry', { 
              environmentId, 
              step: step.name, 
              attempt: stepResult.retries + 1, 
              error: lastError 
            });
            await new Promise(resolve => setTimeout(resolve, 2000 * stepResult.retries));
          }
        }
      }

      if (!stepResult.success) {
        stepResult.error = lastError;
      } else {
        // Collect step artifacts
        stepResult.artifacts = await this.collectStepArtifacts(environmentId, projectPath, step);

        // Cache successful result
        if (this.config.cacheEnabled) {
          await this.cacheStepResult(environmentId, projectPath, step, stepResult);
        }
      }

      this.emit('build:step:completed', { environmentId, step: step.name, result: stepResult });
    } catch (error) {
      stepResult.error = error instanceof Error ? error.message : String(error);
      this.emit('build:step:failed', { environmentId, step: step.name, error: stepResult.error });
    } finally {
      stepResult.duration = Date.now() - startTime;
    }

    return stepResult;
  }

  /**
   * Execute a step command with proper environment setup
   */
  private async executeStepCommand(
    environmentId: string,
    projectPath: string,
    step: BuildStep
  ): Promise<string> {
    const workingDir = step.workingDir ? `${projectPath}/${step.workingDir}` : projectPath;
    
    // Prepare environment variables
    const envVars = Object.entries(step.environment)
      .map(([key, value]) => `export ${key}="${value}"`)
      .join(' && ');

    const fullCommand = envVars 
      ? `${envVars} && cd ${workingDir} && ${step.command}`
      : `cd ${workingDir} && ${step.command}`;

    return this.executeWSLCommand(environmentId, fullCommand, step.timeout);
  }

  /**
   * Resolve build order based on dependencies
   */
  private resolveBuildOrder(steps: BuildStep[]): BuildStep[][] {
    const stepMap = new Map(steps.map(step => [step.name, step]));
    const resolved: BuildStep[][] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (stepName: string): number => {
      if (visiting.has(stepName)) {
        throw new Error(`Circular dependency detected: ${stepName}`);
      }
      if (visited.has(stepName)) {
        return -1; // Already processed
      }

      const step = stepMap.get(stepName);
      if (!step) {
        throw new Error(`Step not found: ${stepName}`);
      }

      visiting.add(stepName);

      let maxDepLevel = -1;
      for (const depName of step.dependencies) {
        const depLevel = visit(depName);
        maxDepLevel = Math.max(maxDepLevel, depLevel);
      }

      visiting.delete(stepName);
      visited.add(stepName);

      const level = maxDepLevel + 1;
      if (!resolved[level]) {
        resolved[level] = [];
      }
      resolved[level].push(step);

      return level;
    };

    for (const step of steps) {
      visit(step.name);
    }

    return resolved.filter(group => group.length > 0);
  }

  /**
   * Clean build directory
   */
  private async cleanBuildDirectory(
    environmentId: string,
    projectPath: string,
    result: BuildResult
  ): Promise<void> {
    this.emit('build:clean:started', { environmentId, projectPath });

    try {
      const cleanCommands = [
        `rm -rf ${projectPath}/${this.config.artifactDir}`,
        `rm -rf ${projectPath}/node_modules/.cache`,
        `rm -rf ${projectPath}/.next`,
        `rm -rf ${projectPath}/build`,
      ];

      for (const command of cleanCommands) {
        try {
          await this.executeWSLCommand(environmentId, command);
        } catch {
          // Ignore errors for non-existent directories
        }
      }

      result.logs.push('Build directory cleaned');
      this.emit('build:clean:completed', { environmentId, projectPath });
    } catch (error) {
      result.errors.push(`Clean failed: ${error}`);
    }
  }

  /**
   * Initialize build cache
   */
  private async initializeCache(
    environmentId: string,
    projectPath: string,
    result: BuildResult
  ): Promise<void> {
    try {
      const cacheDir = `${projectPath}/${this.config.cacheDir}`;
      await this.executeWSLCommand(environmentId, `mkdir -p ${cacheDir}`);
      result.logs.push('Build cache initialized');
    } catch (error) {
      result.errors.push(`Cache initialization failed: ${error}`);
    }
  }

  /**
   * Check if step result is cached
   */
  private async checkCache(
    environmentId: string,
    projectPath: string,
    step: BuildStep
  ): Promise<any | null> {
    try {
      const cacheKey = this.generateCacheKey(step);
      const cacheFile = `${projectPath}/${this.config.cacheDir}/${cacheKey}.json`;
      
      const cacheExists = await this.executeWSLCommand(
        environmentId,
        `test -f ${cacheFile} && echo "exists" || echo "not found"`
      );

      if (cacheExists.includes('exists')) {
        const cacheContent = await this.executeWSLCommand(environmentId, `cat ${cacheFile}`);
        return JSON.parse(cacheContent);
      }
    } catch {
      // Cache miss or error
    }
    return null;
  }

  /**
   * Cache step result
   */
  private async cacheStepResult(
    environmentId: string,
    projectPath: string,
    step: BuildStep,
    result: BuildStepResult
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(step);
      const cacheFile = `${projectPath}/${this.config.cacheDir}/${cacheKey}.json`;
      const cacheData = {
        step: step.name,
        timestamp: new Date().toISOString(),
        artifacts: result.artifacts,
        output: result.output,
      };

      await this.executeWSLCommand(
        environmentId,
        `echo '${JSON.stringify(cacheData)}' > ${cacheFile}`
      );
    } catch (error) {
      // Cache write failure is not critical
    }
  }

  /**
   * Generate cache key for a step
   */
  private generateCacheKey(step: BuildStep): string {
    const content = JSON.stringify({
      name: step.name,
      command: step.command,
      environment: step.environment,
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Collect artifacts for a specific step
   */
  private async collectStepArtifacts(
    environmentId: string,
    projectPath: string,
    step: BuildStep
  ): Promise<string[]> {
    const artifacts: string[] = [];
    
    try {
      // Look for common artifact patterns
      const artifactPatterns = [
        `${projectPath}/${this.config.artifactDir}/**/*`,
        `${projectPath}/build/**/*`,
        `${projectPath}/*.tgz`,
        `${projectPath}/*.tar.gz`,
      ];

      for (const pattern of artifactPatterns) {
        try {
          const files = await this.executeWSLCommand(environmentId, `find ${pattern} -type f 2>/dev/null || true`);
          if (files.trim()) {
            artifacts.push(...files.split('\n').filter(f => f.trim()));
          }
        } catch {
          // Pattern not found
        }
      }
    } catch (error) {
      // Artifact collection is not critical
    }

    return artifacts;
  }

  /**
   * Collect all build artifacts
   */
  private async collectArtifacts(
    environmentId: string,
    projectPath: string,
    result: BuildResult
  ): Promise<BuildArtifact[]> {
    const artifacts: BuildArtifact[] = [];

    try {
      const artifactDir = `${projectPath}/${this.config.artifactDir}`;
      const findOutput = await this.executeWSLCommand(
        environmentId,
        `find ${artifactDir} -type f -exec ls -la {} \\; 2>/dev/null || true`
      );

      for (const line of findOutput.split('\n')) {
        if (line.trim()) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 9) {
            const size = parseInt(parts[4]);
            const path = parts.slice(8).join(' ');
            const name = path.split('/').pop() || path;

            // Calculate checksum
            const checksum = await this.calculateChecksum(environmentId, path);

            artifacts.push({
              name,
              path,
              size,
              type: 'file',
              checksum,
              createdAt: new Date(),
            });
          }
        }
      }

      this.emit('build:artifacts:collected', { environmentId, artifacts });
    } catch (error) {
      result.errors.push(`Artifact collection failed: ${error}`);
    }

    return artifacts;
  }

  /**
   * Calculate file checksum
   */
  private async calculateChecksum(environmentId: string, filePath: string): Promise<string> {
    try {
      const output = await this.executeWSLCommand(environmentId, `sha256sum ${filePath}`);
      return output.split(' ')[0];
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get cache statistics
   */
  private async getCacheStats(environmentId: string, projectPath: string): Promise<CacheStats> {
    try {
      const cacheDir = `${projectPath}/${this.config.cacheDir}`;
      const [sizeOutput, countOutput] = await Promise.all([
        this.executeWSLCommand(environmentId, `du -sb ${cacheDir} 2>/dev/null || echo "0"`),
        this.executeWSLCommand(environmentId, `find ${cacheDir} -name "*.json" | wc -l 2>/dev/null || echo "0"`),
      ]);

      return {
        hits: 0, // Will be updated during build
        misses: 0, // Will be updated during build
        size: parseInt(sizeOutput.split('\t')[0] || '0'),
        entries: parseInt(countOutput.trim()),
      };
    } catch {
      return { hits: 0, misses: 0, size: 0, entries: 0 };
    }
  }

  /**
   * Execute a command in WSL2
   */
  private async executeWSLCommand(
    environmentId: string,
    command: string,
    timeout: number = 600000
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('wsl', ['--', 'bash', '-c', command]);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`WSL command failed with code ${code}: ${stderr}`));
        }
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        process.kill();
        reject(new Error(`Command timeout after ${timeout}ms: ${command}`));
      }, timeout);

      process.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }
}

export default WSL2BuildSystem;

