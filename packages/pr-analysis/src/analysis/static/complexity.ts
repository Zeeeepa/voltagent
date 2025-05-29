import { StaticAnalysisModule } from './base'
import { PRContext, AnalysisConfig, AnalysisResult } from '../../types'

export class ComplexityAnalysisModule extends StaticAnalysisModule {
  readonly name = 'complexity'
  readonly version = '1.0.0'

  async analyze(context: PRContext, config: AnalysisConfig): Promise<AnalysisResult[]> {
    // Mock implementation
    return []
  }

  canAutoFix(result: AnalysisResult): boolean {
    return false
  }
}

