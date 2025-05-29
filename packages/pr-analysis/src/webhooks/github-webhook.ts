import { Webhooks } from '@octokit/webhooks'
import { PRAnalysisOrchestrator } from '../orchestration/orchestrator'

export class GitHubWebhookHandler {
  private webhooks: Webhooks
  private orchestrator: PRAnalysisOrchestrator

  constructor(secret: string, orchestrator: PRAnalysisOrchestrator) {
    this.webhooks = new Webhooks({ secret })
    this.orchestrator = orchestrator
    this.setupHandlers()
  }

  private setupHandlers(): void {
    this.webhooks.on('pull_request.opened', async ({ payload }) => {
      console.log(`PR opened: ${payload.pull_request.title}`)
      await this.orchestrator.analyzePR(payload.pull_request)
    })

    this.webhooks.on('pull_request.synchronize', async ({ payload }) => {
      console.log(`PR updated: ${payload.pull_request.title}`)
      await this.orchestrator.analyzePR(payload.pull_request)
    })
  }

  async handleWebhook(body: string, signature: string): Promise<void> {
    await this.webhooks.verifyAndReceive({
      id: Date.now().toString(),
      name: 'pull_request' as any,
      signature,
      payload: body
    })
  }
}

