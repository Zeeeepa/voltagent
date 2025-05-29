import { DynamicAnalysisModule } from './base'
import { PRContext, AnalysisConfig, AnalysisResult } from '../../types'

export class ErrorHandlingModule extends DynamicAnalysisModule {
  readonly name = 'error-handling'
  readonly version = '1.0.0'

  async analyze(context: PRContext, config: AnalysisConfig): Promise<AnalysisResult[]> {
    return []
  }

  canAutoFix(result: AnalysisResult): boolean {
    return false
  }
}

