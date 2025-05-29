import { SecurityAnalysisModule } from './base'
import { PRContext, AnalysisConfig, AnalysisResult } from '../../types'

export class AccessControlModule extends SecurityAnalysisModule {
  readonly name = 'access-control'
  readonly version = '1.0.0'

  async analyze(context: PRContext, config: AnalysisConfig): Promise<AnalysisResult[]> {
    return []
  }

  canAutoFix(result: AnalysisResult): boolean {
    return false
  }
}

