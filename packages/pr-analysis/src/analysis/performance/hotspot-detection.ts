import { PerformanceAnalysisModule } from './base'
import { PRContext, AnalysisConfig, AnalysisResult } from '../../types'

export class HotspotDetectionModule extends PerformanceAnalysisModule {
  readonly name = 'hotspot-detection'
  readonly version = '1.0.0'

  async analyze(context: PRContext, config: AnalysisConfig): Promise<AnalysisResult[]> {
    return []
  }

  canAutoFix(result: AnalysisResult): boolean {
    return false
  }
}

