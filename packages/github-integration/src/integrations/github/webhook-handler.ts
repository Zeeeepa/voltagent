import { EventEmitter } from 'events';
import { Webhooks } from '@octokit/webhooks';
import { z } from 'zod';

const WebhookConfigSchema = z.object({
  secret: z.string(),
  port: z.number().default(3001),
  path: z.string().default('/webhook'),
  events: z.array(z.string()).default(['pull_request', 'push', 'check_run']),
});

export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

export interface PREvent {
  action: string;
  number: number;
  title: string;
  body: string;
  head: string;
  base: string;
  author: string;
  repository: string;
  url: string;
}

export interface PushEvent {
  ref: string;
  before: string;
  after: string;
  repository: string;
  pusher: string;
  commits: CommitInfo[];
}

export interface CommitInfo {
  id: string;
  message: string;
  author: string;
  timestamp: Date;
  url: string;
}

export interface CheckRunEvent {
  name: string;
  status: string;
  conclusion: string | null;
  head_sha: string;
  repository: string;
  url: string;
}

export class GitHubWebhookHandler extends EventEmitter {
  private webhooks: Webhooks;
  private config: WebhookConfig;
  private server?: any;

  constructor(config: WebhookConfig) {
    super();
    this.config = WebhookConfigSchema.parse(config);
    this.webhooks = new Webhooks({
      secret: this.config.secret,
    });

    this.setupEventHandlers();
  }

  /**
   * Start the webhook server
   */
  async start(): Promise<void> {
    const { createServer } = await import('http');
    const { createNodeMiddleware } = await import('@octokit/webhooks');

    this.server = createServer(createNodeMiddleware(this.webhooks, { path: this.config.path }));

    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, (error: any) => {
        if (error) {
          reject(error);
        } else {
          this.emit('server:started', { port: this.config.port, path: this.config.path });
          resolve();
        }
      });
    });
  }

  /**
   * Stop the webhook server
   */
  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          this.emit('server:stopped');
          resolve();
        });
      });
    }
  }

  /**
   * Setup event handlers for different webhook events
   */
  private setupEventHandlers(): void {
    // Pull Request events
    this.webhooks.on('pull_request', async ({ payload }) => {
      const prEvent: PREvent = {
        action: payload.action,
        number: payload.pull_request.number,
        title: payload.pull_request.title,
        body: payload.pull_request.body || '',
        head: payload.pull_request.head.ref,
        base: payload.pull_request.base.ref,
        author: payload.pull_request.user.login,
        repository: payload.repository.full_name,
        url: payload.pull_request.html_url,
      };

      this.emit('pr:event', prEvent);

      // Emit specific action events
      switch (payload.action) {
        case 'opened':
          this.emit('pr:opened', prEvent);
          break;
        case 'closed':
          if (payload.pull_request.merged) {
            this.emit('pr:merged', prEvent);
          } else {
            this.emit('pr:closed', prEvent);
          }
          break;
        case 'synchronize':
          this.emit('pr:updated', prEvent);
          break;
        case 'reopened':
          this.emit('pr:reopened', prEvent);
          break;
        case 'ready_for_review':
          this.emit('pr:ready', prEvent);
          break;
      }
    });

    // Push events
    this.webhooks.on('push', async ({ payload }) => {
      const commits: CommitInfo[] = payload.commits.map(commit => ({
        id: commit.id,
        message: commit.message,
        author: commit.author.name,
        timestamp: new Date(commit.timestamp),
        url: commit.url,
      }));

      const pushEvent: PushEvent = {
        ref: payload.ref,
        before: payload.before,
        after: payload.after,
        repository: payload.repository.full_name,
        pusher: payload.pusher.name,
        commits,
      };

      this.emit('push:event', pushEvent);

      // Check if this is a push to main/master branch
      if (payload.ref === 'refs/heads/main' || payload.ref === 'refs/heads/master') {
        this.emit('push:main', pushEvent);
      }
    });

    // Check run events
    this.webhooks.on('check_run', async ({ payload }) => {
      const checkEvent: CheckRunEvent = {
        name: payload.check_run.name,
        status: payload.check_run.status,
        conclusion: payload.check_run.conclusion,
        head_sha: payload.check_run.head_sha,
        repository: payload.repository.full_name,
        url: payload.check_run.html_url,
      };

      this.emit('check:event', checkEvent);

      // Emit specific status events
      switch (payload.check_run.status) {
        case 'completed':
          if (payload.check_run.conclusion === 'success') {
            this.emit('check:success', checkEvent);
          } else if (payload.check_run.conclusion === 'failure') {
            this.emit('check:failure', checkEvent);
          }
          break;
        case 'in_progress':
          this.emit('check:started', checkEvent);
          break;
      }
    });

    // Check suite events
    this.webhooks.on('check_suite', async ({ payload }) => {
      if (payload.action === 'completed') {
        const allChecksSuccess = payload.check_suite.conclusion === 'success';
        
        this.emit('checks:completed', {
          head_sha: payload.check_suite.head_sha,
          repository: payload.repository.full_name,
          success: allChecksSuccess,
          conclusion: payload.check_suite.conclusion,
          url: payload.check_suite.url,
        });
      }
    });

    // Issue comment events (for PR comments)
    this.webhooks.on('issue_comment', async ({ payload }) => {
      if (payload.issue.pull_request) {
        this.emit('pr:comment', {
          prNumber: payload.issue.number,
          comment: payload.comment.body,
          author: payload.comment.user.login,
          action: payload.action,
          repository: payload.repository.full_name,
          url: payload.comment.html_url,
        });
      }
    });

    // Pull request review events
    this.webhooks.on('pull_request_review', async ({ payload }) => {
      this.emit('pr:review', {
        prNumber: payload.pull_request.number,
        reviewer: payload.review.user.login,
        state: payload.review.state,
        body: payload.review.body,
        action: payload.action,
        repository: payload.repository.full_name,
        url: payload.review.html_url,
      });
    });

    // Error handling
    this.webhooks.onError((error) => {
      this.emit('webhook:error', error);
    });
  }

  /**
   * Manually trigger a deployment for testing
   */
  triggerDeployment(prNumber: number, repository: string): void {
    this.emit('deployment:trigger', {
      prNumber,
      repository,
      source: 'manual',
      timestamp: new Date(),
    });
  }

  /**
   * Get webhook delivery statistics
   */
  getStats(): any {
    // This would typically track webhook deliveries, errors, etc.
    return {
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      lastDelivery: null,
    };
  }

  /**
   * Validate webhook signature (for security)
   */
  validateSignature(payload: string, signature: string): boolean {
    try {
      return this.webhooks.verify(payload, signature);
    } catch (error) {
      this.emit('webhook:validation:failed', { error });
      return false;
    }
  }
}

export default GitHubWebhookHandler;

