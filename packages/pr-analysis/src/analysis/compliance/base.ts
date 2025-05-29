import { IAnalysisModule, PRContext, AnalysisConfig, AnalysisResult } from '../../types'

export abstract class ComplianceAnalysisModule implements IAnalysisModule {
  abstract readonly name: string
  readonly type = 'compliance' as const
  abstract readonly version: string
  abstract analyze(context: PRContext, config: AnalysisConfig): Promise<AnalysisResult[]>
  abstract canAutoFix(result: AnalysisResult): boolean
}

