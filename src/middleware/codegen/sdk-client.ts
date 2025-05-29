/**
 * Codegen SDK Client
 * 
 * TypeScript client for interacting with the Codegen API
 * Based on the Python SDK patterns from https://pypi.org/project/codegen/
 */

export interface CodegenConfig {
  orgId: string;
  token: string;
  baseUrl?: string;
}

export interface TaskStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CodeGenerationRequest {
  prompt: string;
  context?: string;
  options?: {
    language?: string;
    framework?: string;
    style?: string;
  };
}

export interface RepositoryOperation {
  repoUrl: string;
  branchName?: string;
  baseBranch?: string;
}

export interface PullRequestRequest extends RepositoryOperation {
  title: string;
  description: string;
  headBranch: string;
}

export interface IssueRequest extends RepositoryOperation {
  title: string;
  description: string;
  labels?: string[];
}

export class CodegenSDKClient {
  private config: CodegenConfig;
  private baseUrl: string;

  constructor(config: CodegenConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://codegen-sh-rest-api.modal.run';
  }

  /**
   * Make authenticated HTTP request to Codegen API
   */
  async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.token}`,
      'X-Org-ID': this.config.orgId,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Codegen API Error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Codegen SDK Request Failed:', error);
      throw error;
    }
  }

  /**
   * Run a code generation task
   */
  async generateCode(request: CodeGenerationRequest): Promise<TaskStatus> {
    return this.makeRequest<TaskStatus>('/api/v1/tasks/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt: request.prompt,
        context: request.context,
        options: request.options,
      }),
    });
  }

  /**
   * Modify existing code
   */
  async modifyCode(
    filePath: string,
    modifications: string,
    context?: string
  ): Promise<TaskStatus> {
    return this.makeRequest<TaskStatus>('/api/v1/tasks/modify', {
      method: 'POST',
      body: JSON.stringify({
        filePath,
        modifications,
        context,
      }),
    });
  }

  /**
   * Review code
   */
  async reviewCode(
    filePath: string,
    reviewCriteria?: string
  ): Promise<TaskStatus> {
    return this.makeRequest<TaskStatus>('/api/v1/tasks/review', {
      method: 'POST',
      body: JSON.stringify({
        filePath,
        reviewCriteria,
      }),
    });
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    return this.makeRequest<TaskStatus>(`/api/v1/tasks/${taskId}`);
  }

  /**
   * Create a new branch
   */
  async createBranch(
    repoUrl: string,
    branchName: string,
    baseBranch: string = 'main'
  ): Promise<TaskStatus> {
    return this.makeRequest<TaskStatus>('/api/v1/repository/branch', {
      method: 'POST',
      body: JSON.stringify({
        repoUrl,
        branchName,
        baseBranch,
      }),
    });
  }

  /**
   * Create a pull request
   */
  async createPullRequest(request: PullRequestRequest): Promise<TaskStatus> {
    return this.makeRequest<TaskStatus>('/api/v1/repository/pull-request', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Merge a pull request
   */
  async mergePullRequest(
    repoUrl: string,
    prNumber: number,
    mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge'
  ): Promise<TaskStatus> {
    return this.makeRequest<TaskStatus>('/api/v1/repository/merge', {
      method: 'POST',
      body: JSON.stringify({
        repoUrl,
        prNumber,
        mergeMethod,
      }),
    });
  }

  /**
   * Create an issue
   */
  async createIssue(request: IssueRequest): Promise<TaskStatus> {
    return this.makeRequest<TaskStatus>('/api/v1/repository/issue', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Update an issue
   */
  async updateIssue(
    repoUrl: string,
    issueNumber: number,
    updates: Partial<IssueRequest>
  ): Promise<TaskStatus> {
    return this.makeRequest<TaskStatus>(`/api/v1/repository/issue/${issueNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({
        repoUrl,
        ...updates,
      }),
    });
  }

  /**
   * Close an issue
   */
  async closeIssue(repoUrl: string, issueNumber: number): Promise<TaskStatus> {
    return this.makeRequest<TaskStatus>(`/api/v1/repository/issue/${issueNumber}/close`, {
      method: 'POST',
      body: JSON.stringify({
        repoUrl,
      }),
    });
  }
}

/**
 * Task wrapper class for easier status management
 */
export class CodegenTask {
  private client: CodegenSDKClient;
  private _status: TaskStatus;

  constructor(client: CodegenSDKClient, initialStatus: TaskStatus) {
    this.client = client;
    this._status = initialStatus;
  }

  get id(): string {
    return this._status.id;
  }

  get status(): string {
    return this._status.status;
  }

  get result(): any {
    return this._status.result;
  }

  get error(): string | undefined {
    return this._status.error;
  }

  /**
   * Refresh task status from API
   */
  async refresh(): Promise<void> {
    this._status = await this.client.getTaskStatus(this.id);
  }

  /**
   * Wait for task completion with polling
   */
  async waitForCompletion(
    pollInterval: number = 2000,
    maxWaitTime: number = 300000 // 5 minutes
  ): Promise<TaskStatus> {
    const startTime = Date.now();
    
    while (this._status.status === 'pending' || this._status.status === 'running') {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Task timeout: Maximum wait time exceeded');
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      await this.refresh();
    }
    
    return this._status;
  }
}
