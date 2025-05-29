import { IAnalysisModule, PRContext, AnalysisConfig, AnalysisResult } from '../../types'

export abstract class PerformanceAnalysisModule implements IAnalysisModule {
  abstract readonly name: string
  readonly type = 'performance' as const
  abstract readonly version: string
  abstract analyze(context: PRContext, config: AnalysisConfig): Promise<AnalysisResult[]>
  abstract canAutoFix(result: AnalysisResult): boolean
}

