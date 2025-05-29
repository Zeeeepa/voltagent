import { SecurityAnalysisModule } from './base'
import { PRContext, AnalysisConfig, AnalysisResult } from '../../types'

export class ComplianceModule extends SecurityAnalysisModule {
  readonly name = 'compliance'
  readonly version = '1.0.0'

  async analyze(context: PRContext, config: AnalysisConfig): Promise<AnalysisResult[]> {
    return []
  }

  canAutoFix(result: AnalysisResult): boolean {
    return false
  }
}

