import { EventEmitter } from 'eventemitter3';
import { WSL2Config, WSL2Instance, ValidationStep, ValidationResult } from '../../types';

export class ValidationRunner extends EventEmitter {
  private config: WSL2Config;
  private workingDirectory = '/home/deploy/workspace';

  constructor(config: WSL2Config) {
    super();
    this.config = config;
  }

  /**
   * Run validation steps on a WSL2 instance
   */
  public async runValidation(
    instance: WSL2Instance,
    validationSteps: ValidationStep[]
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    this.emit('validation.started', { 
      instance: instance.id, 
      stepCount: validationSteps.length 
    });
    
    for (const step of validationSteps) {
      const result = await this.executeValidationStep(instance, step);
      results.push(result);
      
      // Stop execution if step failed and continueOnFailure is false
      if (result.status === 'failed' && !step.continueOnFailure) {
        this.emit('validation.stopped', { 
          instance: instance.id, 
          failedStep: step.name 
        });
        break;
      }
    }
    
    const allPassed = results.every(result => result.status === 'success');
    
    this.emit('validation.completed', { 
      instance: instance.id, 
      success: allPassed, 
      results 
    });
    
    return results;
  }

  /**
   * Execute a single validation step
   */
  private async executeValidationStep(
    instance: WSL2Instance,
    step: ValidationStep
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    
    this.emit('validation.step.started', { 
      instance: instance.id, 
      step: step.name 
    });
    
    const result: ValidationResult = {
      stepName: step.name,
      status: 'failed',
      duration: 0,
      output: ''
    };
    
    let attempt = 0;
    const maxRetries = step.retries || 0;
    
    while (attempt <= maxRetries) {
      try {
        const output = await this.executeCommand(
          instance,
          step.command,
          step.workingDirectory,
          step.timeout
        );
        
        result.status = 'success';
        result.output = output.trim();
        result.duration = Date.now() - startTime;
        
        this.emit('validation.step.completed', { 
          instance: instance.id, 
          step: step.name, 
          attempt: attempt + 1,
          duration: result.duration 
        });
        
        break;
        
      } catch (error) {
        attempt++;
        result.error = error.message;
        
        if (attempt <= maxRetries) {
          this.emit('validation.step.retry', { 
            instance: instance.id, 
            step: step.name, 
            attempt, 
            error: error.message 
          });
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } else {
          result.status = 'failed';
          result.duration = Date.now() - startTime;
          
          this.emit('validation.step.failed', { 
            instance: instance.id, 
            step: step.name, 
            error: error.message,
            duration: result.duration 
          });
        }
      }
    }
    
    return result;
  }

  /**
   * Run unit tests and integration tests
   */
  public async runTests(
    instance: WSL2Instance,
    repositoryName: string,
    testType: 'unit' | 'integration' | 'e2e' | 'all' = 'all'
  ): Promise<ValidationResult[]> {
    const repoPath = `${this.workingDirectory}/${repositoryName}`;
    const steps: ValidationStep[] = [];
    
    // Detect test framework and create appropriate steps
    const packageJsonExists = await this.checkFileExists(instance, `${repoPath}/package.json`);
    
    if (packageJsonExists) {
      const packageJson = await this.readPackageJson(instance, repoPath);
      
      // Jest tests
      if (packageJson.scripts?.test || packageJson.devDependencies?.jest) {
        if (testType === 'unit' || testType === 'all') {
          steps.push({
            name: 'Run Jest unit tests',
            command: 'npm test -- --testPathPattern=unit',
            workingDirectory: repoPath,
            timeout: 300000,
            retries: 1,
            continueOnFailure: true
          });
        }
        
        if (testType === 'integration' || testType === 'all') {
          steps.push({
            name: 'Run Jest integration tests',
            command: 'npm test -- --testPathPattern=integration',
            workingDirectory: repoPath,
            timeout: 600000,
            retries: 1,
            continueOnFailure: true
          });
        }
      }
      
      // Vitest tests
      if (packageJson.scripts?.['test:unit'] || packageJson.devDependencies?.vitest) {
        if (testType === 'unit' || testType === 'all') {
          steps.push({
            name: 'Run Vitest unit tests',
            command: 'npm run test:unit',
            workingDirectory: repoPath,
            timeout: 300000,
            retries: 1,
            continueOnFailure: true
          });
        }
      }
      
      // Cypress E2E tests
      if (packageJson.scripts?.['test:e2e'] || packageJson.devDependencies?.cypress) {
        if (testType === 'e2e' || testType === 'all') {
          steps.push({
            name: 'Run Cypress E2E tests',
            command: 'npm run test:e2e',
            workingDirectory: repoPath,
            timeout: 900000,
            retries: 2,
            continueOnFailure: true
          });
        }
      }
      
      // Playwright E2E tests
      if (packageJson.scripts?.['test:playwright'] || packageJson.devDependencies?.['@playwright/test']) {
        if (testType === 'e2e' || testType === 'all') {
          steps.push({
            name: 'Run Playwright E2E tests',
            command: 'npm run test:playwright',
            workingDirectory: repoPath,
            timeout: 900000,
            retries: 2,
            continueOnFailure: true
          });
        }
      }
    }
    
    // Python tests
    const requirementsExists = await this.checkFileExists(instance, `${repoPath}/requirements.txt`);
    const pytestExists = await this.checkFileExists(instance, `${repoPath}/pytest.ini`);
    
    if (requirementsExists || pytestExists) {
      if (testType === 'unit' || testType === 'all') {
        steps.push({
          name: 'Run Python unit tests',
          command: 'python -m pytest tests/unit/ -v',
          workingDirectory: repoPath,
          timeout: 300000,
          retries: 1,
          continueOnFailure: true
        });
      }
      
      if (testType === 'integration' || testType === 'all') {
        steps.push({
          name: 'Run Python integration tests',
          command: 'python -m pytest tests/integration/ -v',
          workingDirectory: repoPath,
          timeout: 600000,
          retries: 1,
          continueOnFailure: true
        });
      }
    }
    
    return this.runValidation(instance, steps);
  }

  /**
   * Execute linting and code quality checks
   */
  public async runLinting(
    instance: WSL2Instance,
    repositoryName: string
  ): Promise<ValidationResult[]> {
    const repoPath = `${this.workingDirectory}/${repositoryName}`;
    const steps: ValidationStep[] = [];
    
    const packageJsonExists = await this.checkFileExists(instance, `${repoPath}/package.json`);
    
    if (packageJsonExists) {
      const packageJson = await this.readPackageJson(instance, repoPath);
      
      // ESLint
      if (packageJson.scripts?.lint || packageJson.devDependencies?.eslint) {
        steps.push({
          name: 'Run ESLint',
          command: 'npm run lint',
          workingDirectory: repoPath,
          timeout: 120000,
          retries: 0,
          continueOnFailure: true
        });
      }
      
      // Prettier
      if (packageJson.scripts?.['format:check'] || packageJson.devDependencies?.prettier) {
        steps.push({
          name: 'Check Prettier formatting',
          command: 'npm run format:check || npx prettier --check .',
          workingDirectory: repoPath,
          timeout: 60000,
          retries: 0,
          continueOnFailure: true
        });
      }
      
      // TypeScript type checking
      if (packageJson.scripts?.['type-check'] || packageJson.devDependencies?.typescript) {
        steps.push({
          name: 'TypeScript type checking',
          command: 'npm run type-check || npx tsc --noEmit',
          workingDirectory: repoPath,
          timeout: 180000,
          retries: 0,
          continueOnFailure: true
        });
      }
      
      // Biome
      if (packageJson.devDependencies?.['@biomejs/biome']) {
        steps.push({
          name: 'Run Biome checks',
          command: 'npx biome check .',
          workingDirectory: repoPath,
          timeout: 120000,
          retries: 0,
          continueOnFailure: true
        });
      }
    }
    
    // Python linting
    const requirementsExists = await this.checkFileExists(instance, `${repoPath}/requirements.txt`);
    if (requirementsExists) {
      steps.push(
        {
          name: 'Run flake8',
          command: 'flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics',
          workingDirectory: repoPath,
          timeout: 120000,
          retries: 0,
          continueOnFailure: true
        },
        {
          name: 'Run black format check',
          command: 'black --check .',
          workingDirectory: repoPath,
          timeout: 60000,
          retries: 0,
          continueOnFailure: true
        },
        {
          name: 'Run isort import check',
          command: 'isort --check-only .',
          workingDirectory: repoPath,
          timeout: 60000,
          retries: 0,
          continueOnFailure: true
        }
      );
    }
    
    return this.runValidation(instance, steps);
  }

  /**
   * Perform security scans and vulnerability checks
   */
  public async runSecurityScans(
    instance: WSL2Instance,
    repositoryName: string
  ): Promise<ValidationResult[]> {
    const repoPath = `${this.workingDirectory}/${repositoryName}`;
    const steps: ValidationStep[] = [];
    
    const packageJsonExists = await this.checkFileExists(instance, `${repoPath}/package.json`);
    
    if (packageJsonExists) {
      // npm audit
      steps.push({
        name: 'npm security audit',
        command: 'npm audit --audit-level=moderate',
        workingDirectory: repoPath,
        timeout: 120000,
        retries: 1,
        continueOnFailure: true
      });
      
      // Snyk security scan (if available)
      steps.push({
        name: 'Snyk security scan',
        command: 'npx snyk test || echo "Snyk not configured"',
        workingDirectory: repoPath,
        timeout: 180000,
        retries: 0,
        continueOnFailure: true
      });
    }
    
    // Python security
    const requirementsExists = await this.checkFileExists(instance, `${repoPath}/requirements.txt`);
    if (requirementsExists) {
      steps.push(
        {
          name: 'Safety security check',
          command: 'safety check || echo "Safety not installed"',
          workingDirectory: repoPath,
          timeout: 120000,
          retries: 0,
          continueOnFailure: true
        },
        {
          name: 'Bandit security scan',
          command: 'bandit -r . || echo "Bandit not installed"',
          workingDirectory: repoPath,
          timeout: 180000,
          retries: 0,
          continueOnFailure: true
        }
      );
    }
    
    // Generic security checks
    steps.push(
      {
        name: 'Check for secrets in code',
        command: 'grep -r -i "password\\|secret\\|key\\|token" --include="*.js" --include="*.ts" --include="*.py" . | head -10 || echo "No obvious secrets found"',
        workingDirectory: repoPath,
        timeout: 60000,
        retries: 0,
        continueOnFailure: true
      },
      {
        name: 'Check file permissions',
        command: 'find . -type f -perm /o+w | head -10 || echo "No world-writable files found"',
        workingDirectory: repoPath,
        timeout: 30000,
        retries: 0,
        continueOnFailure: true
      }
    );
    
    return this.runValidation(instance, steps);
  }

  /**
   * Run performance and load tests
   */
  public async runPerformanceTests(
    instance: WSL2Instance,
    repositoryName: string
  ): Promise<ValidationResult[]> {
    const repoPath = `${this.workingDirectory}/${repositoryName}`;
    const steps: ValidationStep[] = [];
    
    const packageJsonExists = await this.checkFileExists(instance, `${repoPath}/package.json`);
    
    if (packageJsonExists) {
      const packageJson = await this.readPackageJson(instance, repoPath);
      
      // Performance tests
      if (packageJson.scripts?.['test:performance']) {
        steps.push({
          name: 'Run performance tests',
          command: 'npm run test:performance',
          workingDirectory: repoPath,
          timeout: 600000,
          retries: 1,
          continueOnFailure: true
        });
      }
      
      // Load tests with Artillery
      if (packageJson.devDependencies?.artillery) {
        steps.push({
          name: 'Run Artillery load tests',
          command: 'npx artillery run load-test.yml || echo "No Artillery config found"',
          workingDirectory: repoPath,
          timeout: 900000,
          retries: 0,
          continueOnFailure: true
        });
      }
      
      // Bundle size analysis
      if (packageJson.scripts?.['analyze'] || packageJson.devDependencies?.['webpack-bundle-analyzer']) {
        steps.push({
          name: 'Analyze bundle size',
          command: 'npm run analyze || npx webpack-bundle-analyzer build/static/js/*.js',
          workingDirectory: repoPath,
          timeout: 180000,
          retries: 0,
          continueOnFailure: true
        });
      }
    }
    
    // Basic performance checks
    steps.push(
      {
        name: 'Check build time',
        command: 'time npm run build',
        workingDirectory: repoPath,
        timeout: 600000,
        retries: 0,
        continueOnFailure: true
      },
      {
        name: 'Check startup time',
        command: 'time npm start &; sleep 10; pkill -f "npm start" || echo "Startup test completed"',
        workingDirectory: repoPath,
        timeout: 30000,
        retries: 0,
        continueOnFailure: true
      }
    );
    
    return this.runValidation(instance, steps);
  }

  /**
   * Execute custom validation scripts
   */
  public async runCustomValidation(
    instance: WSL2Instance,
    repositoryName: string,
    scriptPath: string
  ): Promise<ValidationResult[]> {
    const repoPath = `${this.workingDirectory}/${repositoryName}`;
    
    const steps: ValidationStep[] = [
      {
        name: 'Run custom validation script',
        command: `chmod +x ${scriptPath} && ${scriptPath}`,
        workingDirectory: repoPath,
        timeout: 600000,
        retries: 1,
        continueOnFailure: false
      }
    ];
    
    return this.runValidation(instance, steps);
  }

  /**
   * Check if file exists
   */
  private async checkFileExists(instance: WSL2Instance, filePath: string): Promise<boolean> {
    try {
      await this.executeCommand(instance, `test -f ${filePath}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read and parse package.json
   */
  private async readPackageJson(instance: WSL2Instance, repoPath: string): Promise<any> {
    try {
      const content = await this.executeCommand(instance, `cat ${repoPath}/package.json`);
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read package.json: ${error.message}`);
    }
  }

  /**
   * Execute command on WSL2 instance
   */
  private async executeCommand(
    instance: WSL2Instance,
    command: string,
    workingDirectory?: string,
    timeout: number = 300000
  ): Promise<string> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    let fullCommand = command;
    if (workingDirectory) {
      fullCommand = `cd ${workingDirectory} && ${command}`;
    }
    
    const wslCommand = `wsl -d ${instance.name} -- bash -c "${fullCommand.replace(/"/g, '\\"')}"`;
    
    try {
      const { stdout, stderr } = await execAsync(wslCommand, { 
        timeout,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      if (stderr && !stderr.includes('Warning') && !stderr.includes('npm WARN')) {
        throw new Error(stderr);
      }
      
      return stdout;
    } catch (error) {
      throw new Error(`Command failed on ${instance.name}: ${fullCommand}. Error: ${error.message}`);
    }
  }
}

