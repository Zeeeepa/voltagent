/**
 * Requirement Parser Service for Task Master
 * Phase 4.1: Comprehensive Database & Event Storage Implementation
 */

import { RequirementsModel, CreateRequirementInput, Requirement } from '../models/requirements';
import { EventStorageService, TaskMasterEventTypes, TaskMasterEventSources } from './event-storage';

export interface ParsedRequirement {
  title: string;
  description: string;
  priority: number;
  complexity_score: number;
  estimated_hours: number;
  dependencies: string[];
  acceptance_criteria: string[];
  technical_notes: string[];
  risks: string[];
}

export interface RequirementAnalysis {
  completeness_score: number;
  clarity_score: number;
  testability_score: number;
  feasibility_score: number;
  overall_quality: number;
  suggestions: string[];
  missing_elements: string[];
}

export interface RequirementHierarchy {
  parent: ParsedRequirement | null;
  children: ParsedRequirement[];
  level: number;
}

export class RequirementParserService {
  private requirementsModel: RequirementsModel;
  private eventStorage: EventStorageService;

  constructor(eventStorage: EventStorageService) {
    this.requirementsModel = new RequirementsModel();
    this.eventStorage = eventStorage;
  }

  /**
   * Parse requirements from text file content
   */
  async parseRequirementsFile(content: string, filename: string = 'requirements.txt'): Promise<ParsedRequirement[]> {
    try {
      const requirements = this.extractRequirementsFromText(content);
      
      // Log parsing event
      await this.eventStorage.ingestEvent({
        event_type: TaskMasterEventTypes.REQUIREMENT_ANALYZED,
        source: TaskMasterEventSources.TASK_MASTER,
        action: 'parse_file',
        target_type: 'file',
        target_id: filename,
        payload: {
          filename,
          requirements_count: requirements.length,
          content_length: content.length,
        },
      });

      return requirements;
    } catch (error) {
      await this.eventStorage.ingestEvent({
        event_type: TaskMasterEventTypes.SYSTEM_ERROR,
        source: TaskMasterEventSources.TASK_MASTER,
        action: 'parse_file_error',
        target_type: 'file',
        target_id: filename,
        payload: {
          error: error instanceof Error ? error.message : 'Unknown error',
          filename,
        },
      });
      throw error;
    }
  }

  /**
   * Extract structured requirements from text
   */
  private extractRequirementsFromText(content: string): ParsedRequirement[] {
    const requirements: ParsedRequirement[] = [];
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentRequirement: Partial<ParsedRequirement> | null = null;
    let currentSection: string | null = null;

    for (const line of lines) {
      // Check for requirement headers (e.g., "## Requirement 1:", "### Feature:", etc.)
      if (this.isRequirementHeader(line)) {
        // Save previous requirement if exists
        if (currentRequirement && currentRequirement.title) {
          requirements.push(this.finalizeRequirement(currentRequirement));
        }
        
        // Start new requirement
        currentRequirement = {
          title: this.extractTitle(line),
          description: '',
          dependencies: [],
          acceptance_criteria: [],
          technical_notes: [],
          risks: [],
        };
        currentSection = null;
        continue;
      }

      // Check for section headers
      const section = this.identifySection(line);
      if (section) {
        currentSection = section;
        continue;
      }

      // Process content based on current section
      if (currentRequirement) {
        this.processLineForRequirement(currentRequirement, line, currentSection);
      }
    }

    // Save last requirement
    if (currentRequirement && currentRequirement.title) {
      requirements.push(this.finalizeRequirement(currentRequirement));
    }

    return requirements;
  }

  /**
   * Check if line is a requirement header
   */
  private isRequirementHeader(line: string): boolean {
    const headerPatterns = [
      /^#{1,4}\s+.+/,  // Markdown headers
      /^\d+\.\s+.+/,   // Numbered lists
      /^[A-Z][^:]*:$/,  // Title with colon
      /^(Requirement|Feature|Story|Epic)\s*\d*:?\s*.+/i,
    ];

    return headerPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Extract title from header line
   */
  private extractTitle(line: string): string {
    // Remove markdown headers
    line = line.replace(/^#{1,4}\s+/, '');
    
    // Remove numbering
    line = line.replace(/^\d+\.\s+/, '');
    
    // Remove trailing colon
    line = line.replace(/:$/, '');
    
    // Remove common prefixes
    line = line.replace(/^(Requirement|Feature|Story|Epic)\s*\d*:?\s*/i, '');
    
    return line.trim();
  }

  /**
   * Identify section type from line
   */
  private identifySection(line: string): string | null {
    const sectionPatterns = {
      description: /^(Description|Overview|Summary):/i,
      acceptance_criteria: /^(Acceptance Criteria|AC|Criteria):/i,
      technical_notes: /^(Technical Notes?|Implementation|Tech):/i,
      dependencies: /^(Dependencies|Depends On|Prerequisites):/i,
      risks: /^(Risks?|Concerns?|Issues?):/i,
    };

    for (const [section, pattern] of Object.entries(sectionPatterns)) {
      if (pattern.test(line)) {
        return section;
      }
    }

    return null;
  }

  /**
   * Process line content for current requirement
   */
  private processLineForRequirement(
    requirement: Partial<ParsedRequirement>,
    line: string,
    section: string | null
  ): void {
    // Remove section headers from content
    line = line.replace(/^[^:]+:\s*/, '');
    
    if (!line.trim()) return;

    switch (section) {
      case 'description':
        requirement.description = (requirement.description || '') + ' ' + line;
        break;
      
      case 'acceptance_criteria':
        if (line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line)) {
          requirement.acceptance_criteria!.push(line.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, ''));
        } else {
          requirement.acceptance_criteria!.push(line);
        }
        break;
      
      case 'technical_notes':
        requirement.technical_notes!.push(line);
        break;
      
      case 'dependencies':
        requirement.dependencies!.push(line);
        break;
      
      case 'risks':
        requirement.risks!.push(line);
        break;
      
      default:
        // If no section specified, add to description
        requirement.description = (requirement.description || '') + ' ' + line;
        break;
    }
  }

  /**
   * Finalize requirement with calculated values
   */
  private finalizeRequirement(requirement: Partial<ParsedRequirement>): ParsedRequirement {
    const description = (requirement.description || '').trim();
    
    return {
      title: requirement.title || 'Untitled Requirement',
      description,
      priority: this.calculatePriority(requirement),
      complexity_score: this.calculateComplexity(requirement),
      estimated_hours: this.estimateHours(requirement),
      dependencies: requirement.dependencies || [],
      acceptance_criteria: requirement.acceptance_criteria || [],
      technical_notes: requirement.technical_notes || [],
      risks: requirement.risks || [],
    };
  }

  /**
   * Calculate priority based on content analysis
   */
  private calculatePriority(requirement: Partial<ParsedRequirement>): number {
    let priority = 3; // Default medium priority
    
    const content = `${requirement.title} ${requirement.description}`.toLowerCase();
    
    // High priority indicators
    if (content.includes('critical') || content.includes('urgent') || content.includes('blocker')) {
      priority = 1;
    }
    // Low priority indicators
    else if (content.includes('nice to have') || content.includes('optional') || content.includes('future')) {
      priority = 5;
    }
    // High-medium priority
    else if (content.includes('important') || content.includes('must have')) {
      priority = 2;
    }
    // Low-medium priority
    else if (content.includes('should have') || content.includes('enhancement')) {
      priority = 4;
    }

    return Math.max(1, Math.min(5, priority));
  }

  /**
   * Calculate complexity score based on content analysis
   */
  private calculateComplexity(requirement: Partial<ParsedRequirement>): number {
    let complexity = 5; // Default medium complexity
    
    const content = `${requirement.title} ${requirement.description}`.toLowerCase();
    const technicalNotes = requirement.technical_notes?.join(' ').toLowerCase() || '';
    
    // High complexity indicators
    const highComplexityTerms = [
      'integration', 'api', 'database', 'migration', 'architecture',
      'performance', 'security', 'scalability', 'distributed', 'microservice'
    ];
    
    // Low complexity indicators
    const lowComplexityTerms = [
      'ui', 'text', 'label', 'color', 'simple', 'basic', 'copy', 'display'
    ];
    
    const highMatches = highComplexityTerms.filter(term => 
      content.includes(term) || technicalNotes.includes(term)
    ).length;
    
    const lowMatches = lowComplexityTerms.filter(term => 
      content.includes(term) || technicalNotes.includes(term)
    ).length;
    
    // Adjust complexity based on matches
    complexity += highMatches * 2;
    complexity -= lowMatches;
    
    // Factor in dependencies and technical notes
    complexity += (requirement.dependencies?.length || 0);
    complexity += Math.floor((requirement.technical_notes?.length || 0) / 2);
    
    return Math.max(1, Math.min(10, complexity));
  }

  /**
   * Estimate hours based on complexity and content
   */
  private estimateHours(requirement: Partial<ParsedRequirement>): number {
    const complexity = this.calculateComplexity(requirement);
    const baseHours = complexity * 2; // 2 hours per complexity point
    
    // Adjust based on acceptance criteria count
    const criteriaMultiplier = 1 + ((requirement.acceptance_criteria?.length || 0) * 0.1);
    
    // Adjust based on dependencies
    const dependencyMultiplier = 1 + ((requirement.dependencies?.length || 0) * 0.2);
    
    const estimatedHours = baseHours * criteriaMultiplier * dependencyMultiplier;
    
    return Math.max(1, Math.round(estimatedHours));
  }

  /**
   * Analyze requirement quality
   */
  async analyzeRequirement(requirement: ParsedRequirement): Promise<RequirementAnalysis> {
    const analysis: RequirementAnalysis = {
      completeness_score: this.calculateCompletenessScore(requirement),
      clarity_score: this.calculateClarityScore(requirement),
      testability_score: this.calculateTestabilityScore(requirement),
      feasibility_score: this.calculateFeasibilityScore(requirement),
      overall_quality: 0,
      suggestions: [],
      missing_elements: [],
    };

    // Calculate overall quality
    analysis.overall_quality = (
      analysis.completeness_score +
      analysis.clarity_score +
      analysis.testability_score +
      analysis.feasibility_score
    ) / 4;

    // Generate suggestions
    analysis.suggestions = this.generateSuggestions(requirement, analysis);
    analysis.missing_elements = this.identifyMissingElements(requirement);

    // Log analysis event
    await this.eventStorage.ingestEvent({
      event_type: TaskMasterEventTypes.REQUIREMENT_ANALYZED,
      source: TaskMasterEventSources.TASK_MASTER,
      action: 'analyze_quality',
      target_type: 'requirement',
      target_id: requirement.title,
      payload: {
        analysis,
        requirement_title: requirement.title,
      },
    });

    return analysis;
  }

  /**
   * Calculate completeness score (0-100)
   */
  private calculateCompletenessScore(requirement: ParsedRequirement): number {
    let score = 0;
    
    // Title (20 points)
    if (requirement.title && requirement.title.length > 5) score += 20;
    
    // Description (25 points)
    if (requirement.description && requirement.description.length > 20) score += 25;
    
    // Acceptance criteria (25 points)
    if (requirement.acceptance_criteria.length > 0) score += 25;
    
    // Dependencies (15 points)
    if (requirement.dependencies.length > 0) score += 15;
    
    // Technical notes (15 points)
    if (requirement.technical_notes.length > 0) score += 15;
    
    return Math.min(100, score);
  }

  /**
   * Calculate clarity score (0-100)
   */
  private calculateClarityScore(requirement: ParsedRequirement): number {
    let score = 100;
    
    const content = `${requirement.title} ${requirement.description}`;
    
    // Penalize vague terms
    const vagueTerms = ['maybe', 'probably', 'might', 'could', 'should probably', 'possibly'];
    const vagueCount = vagueTerms.filter(term => content.toLowerCase().includes(term)).length;
    score -= vagueCount * 10;
    
    // Penalize very short descriptions
    if (requirement.description.length < 50) score -= 20;
    
    // Reward specific acceptance criteria
    if (requirement.acceptance_criteria.length >= 3) score += 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate testability score (0-100)
   */
  private calculateTestabilityScore(requirement: ParsedRequirement): number {
    let score = 0;
    
    // Acceptance criteria presence (50 points)
    if (requirement.acceptance_criteria.length > 0) score += 50;
    
    // Specific, measurable criteria (30 points)
    const measurableTerms = ['should', 'must', 'will', 'exactly', 'within', 'less than', 'greater than'];
    const criteriaText = requirement.acceptance_criteria.join(' ').toLowerCase();
    const measurableCount = measurableTerms.filter(term => criteriaText.includes(term)).length;
    score += Math.min(30, measurableCount * 10);
    
    // Clear inputs/outputs (20 points)
    if (criteriaText.includes('input') || criteriaText.includes('output') || 
        criteriaText.includes('result') || criteriaText.includes('response')) {
      score += 20;
    }
    
    return Math.min(100, score);
  }

  /**
   * Calculate feasibility score (0-100)
   */
  private calculateFeasibilityScore(requirement: ParsedRequirement): number {
    let score = 80; // Start with high feasibility
    
    // Penalize very high complexity
    if (requirement.complexity_score > 8) score -= 20;
    
    // Penalize many dependencies
    if (requirement.dependencies.length > 5) score -= 15;
    
    // Penalize identified risks
    score -= requirement.risks.length * 5;
    
    // Penalize unrealistic time estimates
    if (requirement.estimated_hours > 100) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(requirement: ParsedRequirement, analysis: RequirementAnalysis): string[] {
    const suggestions: string[] = [];
    
    if (analysis.completeness_score < 70) {
      suggestions.push('Add more detailed description and acceptance criteria');
    }
    
    if (analysis.clarity_score < 70) {
      suggestions.push('Remove vague language and be more specific about expected behavior');
    }
    
    if (analysis.testability_score < 70) {
      suggestions.push('Add measurable acceptance criteria with clear inputs and expected outputs');
    }
    
    if (requirement.complexity_score > 8) {
      suggestions.push('Consider breaking this requirement into smaller, more manageable pieces');
    }
    
    if (requirement.dependencies.length > 3) {
      suggestions.push('Review dependencies to ensure they are all necessary');
    }
    
    if (requirement.risks.length === 0) {
      suggestions.push('Consider potential risks and mitigation strategies');
    }
    
    return suggestions;
  }

  /**
   * Identify missing elements
   */
  private identifyMissingElements(requirement: ParsedRequirement): string[] {
    const missing: string[] = [];
    
    if (!requirement.description || requirement.description.length < 20) {
      missing.push('Detailed description');
    }
    
    if (requirement.acceptance_criteria.length === 0) {
      missing.push('Acceptance criteria');
    }
    
    if (requirement.technical_notes.length === 0) {
      missing.push('Technical implementation notes');
    }
    
    if (requirement.dependencies.length === 0) {
      missing.push('Dependencies analysis');
    }
    
    if (requirement.risks.length === 0) {
      missing.push('Risk assessment');
    }
    
    return missing;
  }

  /**
   * Create requirements in database from parsed data
   */
  async createRequirementsFromParsed(
    parsedRequirements: ParsedRequirement[],
    parentId?: string
  ): Promise<Requirement[]> {
    const createdRequirements: Requirement[] = [];
    
    for (const parsed of parsedRequirements) {
      const input: CreateRequirementInput = {
        title: parsed.title,
        description: parsed.description,
        priority: parsed.priority,
        complexity_score: parsed.complexity_score,
        estimated_hours: parsed.estimated_hours,
        parent_id: parentId,
        metadata: {
          dependencies: parsed.dependencies,
          acceptance_criteria: parsed.acceptance_criteria,
          technical_notes: parsed.technical_notes,
          risks: parsed.risks,
          parsed_from: 'requirements_file',
          parsed_at: new Date().toISOString(),
        },
      };
      
      const requirement = await this.requirementsModel.create(input);
      createdRequirements.push(requirement);
      
      // Log creation event
      await this.eventStorage.ingestEvent({
        event_type: TaskMasterEventTypes.REQUIREMENT_CREATED,
        source: TaskMasterEventSources.TASK_MASTER,
        action: 'create_from_parsed',
        target_type: 'requirement',
        target_id: requirement.id,
        payload: {
          requirement_id: requirement.id,
          title: requirement.title,
          complexity_score: requirement.complexity_score,
          estimated_hours: requirement.estimated_hours,
        },
      });
    }
    
    return createdRequirements;
  }
}

