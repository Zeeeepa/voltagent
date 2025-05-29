import { DatabaseConnection } from '../connection';
import { RequirementsModel, Requirement, CreateRequirementInput } from '../models/requirements';
import { TasksModel, Task, CreateTaskInput } from '../models/tasks';

/**
 * Requirement Parser Service for VoltAgent
 * Phase 1.3: Setup Database Event Storage System
 * 
 * Handles PRD text analysis, requirement breakdown, and task hierarchy generation
 */

export interface PRDDocument {
  title: string;
  content: string;
  sections: PRDSection[];
  metadata?: Record<string, any>;
}

export interface PRDSection {
  title: string;
  content: string;
  type: 'overview' | 'requirements' | 'technical' | 'acceptance_criteria' | 'other';
  subsections?: PRDSection[];
}

export interface ParsedRequirement {
  title: string;
  description: string;
  type: 'functional' | 'non_functional' | 'technical' | 'business';
  priority: 'low' | 'medium' | 'high' | 'critical';
  complexity_score: number;
  dependencies: string[];
  acceptance_criteria: string[];
  estimated_effort: number; // in hours
  tags: string[];
}

export interface RequirementBreakdown {
  requirements: ParsedRequirement[];
  task_hierarchy: TaskHierarchy;
  dependencies: DependencyMap;
  estimated_total_effort: number;
}

export interface TaskHierarchy {
  root_tasks: ParsedTask[];
}

export interface ParsedTask {
  title: string;
  description: string;
  type: 'epic' | 'feature' | 'story' | 'task' | 'subtask';
  priority: number;
  estimated_effort: number;
  dependencies: string[];
  subtasks: ParsedTask[];
  acceptance_criteria: string[];
}

export interface DependencyMap {
  [requirementId: string]: string[];
}

export interface ParsingOptions {
  include_task_breakdown?: boolean;
  max_complexity_score?: number;
  default_priority?: 'low' | 'medium' | 'high' | 'critical';
  generate_subtasks?: boolean;
  estimate_effort?: boolean;
}

export class RequirementParserService {
  private requirementsModel: RequirementsModel;
  private tasksModel: TasksModel;
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
    this.requirementsModel = new RequirementsModel(db);
    this.tasksModel = new TasksModel(db);
  }

  /**
   * Parse PRD document and extract requirements
   */
  async parsePRD(
    document: PRDDocument, 
    options: ParsingOptions = {}
  ): Promise<RequirementBreakdown> {
    const sections = this.extractSections(document.content);
    const requirements = this.extractRequirements(sections, options);
    const dependencies = this.analyzeDependencies(requirements);
    
    let task_hierarchy: TaskHierarchy = { root_tasks: [] };
    
    if (options.include_task_breakdown) {
      task_hierarchy = this.generateTaskHierarchy(requirements, options);
    }
    
    const estimated_total_effort = requirements.reduce(
      (total, req) => total + req.estimated_effort, 0
    );
    
    return {
      requirements,
      task_hierarchy,
      dependencies,
      estimated_total_effort
    };
  }

  /**
   * Extract sections from PRD content
   */
  private extractSections(content: string): PRDSection[] {
    const sections: PRDSection[] = [];
    const lines = content.split('\n');
    let currentSection: PRDSection | null = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check for section headers (markdown style)
      if (trimmedLine.startsWith('#')) {
        if (currentSection) {
          sections.push(currentSection);
        }
        
        const title = trimmedLine.replace(/^#+\s*/, '');
        const type = this.classifySectionType(title);
        
        currentSection = {
          title,
          content: '',
          type,
          subsections: []
        };
      } else if (currentSection && trimmedLine) {
        currentSection.content += line + '\n';
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  /**
   * Classify section type based on title
   */
  private classifySectionType(title: string): PRDSection['type'] {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('overview') || lowerTitle.includes('summary')) {
      return 'overview';
    } else if (lowerTitle.includes('requirement') || lowerTitle.includes('feature')) {
      return 'requirements';
    } else if (lowerTitle.includes('technical') || lowerTitle.includes('architecture')) {
      return 'technical';
    } else if (lowerTitle.includes('acceptance') || lowerTitle.includes('criteria')) {
      return 'acceptance_criteria';
    } else {
      return 'other';
    }
  }

  /**
   * Extract requirements from sections
   */
  private extractRequirements(
    sections: PRDSection[], 
    options: ParsingOptions
  ): ParsedRequirement[] {
    const requirements: ParsedRequirement[] = [];
    
    for (const section of sections) {
      if (section.type === 'requirements' || section.type === 'technical') {
        const sectionRequirements = this.parseRequirementsFromText(section.content, options);
        requirements.push(...sectionRequirements);
      }
    }
    
    return requirements;
  }

  /**
   * Parse requirements from text content
   */
  private parseRequirementsFromText(
    content: string, 
    options: ParsingOptions
  ): ParsedRequirement[] {
    const requirements: ParsedRequirement[] = [];
    const lines = content.split('\n');
    
    let currentRequirement: Partial<ParsedRequirement> | null = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check for requirement bullets or numbered items
      if (this.isRequirementLine(trimmedLine)) {
        if (currentRequirement && currentRequirement.title) {
          requirements.push(this.completeRequirement(currentRequirement, options));
        }
        
        currentRequirement = {
          title: this.extractRequirementTitle(trimmedLine),
          description: '',
          type: this.classifyRequirementType(trimmedLine),
          priority: options.default_priority || 'medium',
          dependencies: [],
          acceptance_criteria: [],
          tags: []
        };
      } else if (currentRequirement && trimmedLine) {
        currentRequirement.description += trimmedLine + ' ';
      }
    }
    
    if (currentRequirement && currentRequirement.title) {
      requirements.push(this.completeRequirement(currentRequirement, options));
    }
    
    return requirements;
  }

  /**
   * Check if line represents a requirement
   */
  private isRequirementLine(line: string): boolean {
    return /^[-*•]\s+/.test(line) || /^\d+\.\s+/.test(line) || line.startsWith('- [ ]');
  }

  /**
   * Extract requirement title from line
   */
  private extractRequirementTitle(line: string): string {
    return line.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '').replace(/^- \[ \]\s+/, '').trim();
  }

  /**
   * Classify requirement type
   */
  private classifyRequirementType(text: string): ParsedRequirement['type'] {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('performance') || lowerText.includes('scalability') || 
        lowerText.includes('security') || lowerText.includes('reliability')) {
      return 'non_functional';
    } else if (lowerText.includes('api') || lowerText.includes('database') || 
               lowerText.includes('architecture') || lowerText.includes('technical')) {
      return 'technical';
    } else if (lowerText.includes('business') || lowerText.includes('revenue') || 
               lowerText.includes('cost') || lowerText.includes('roi')) {
      return 'business';
    } else {
      return 'functional';
    }
  }

  /**
   * Complete requirement with calculated fields
   */
  private completeRequirement(
    partial: Partial<ParsedRequirement>, 
    options: ParsingOptions
  ): ParsedRequirement {
    const description = partial.description?.trim() || '';
    const complexity_score = this.calculateComplexityScore(
      partial.title || '', 
      description, 
      options.max_complexity_score || 100
    );
    
    const estimated_effort = options.estimate_effort 
      ? this.estimateEffort(complexity_score, partial.type || 'functional')
      : 0;
    
    const tags = this.extractTags(partial.title || '', description);
    const acceptance_criteria = this.extractAcceptanceCriteria(description);
    
    return {
      title: partial.title || '',
      description,
      type: partial.type || 'functional',
      priority: partial.priority || 'medium',
      complexity_score,
      dependencies: partial.dependencies || [],
      acceptance_criteria,
      estimated_effort,
      tags
    };
  }

  /**
   * Calculate complexity score for requirement
   */
  private calculateComplexityScore(
    title: string, 
    description: string, 
    maxScore: number
  ): number {
    let score = 0;
    const text = (title + ' ' + description).toLowerCase();
    
    // Base score from text length
    score += Math.min(text.length / 50, 20);
    
    // Complexity keywords
    const complexityKeywords = [
      'integration', 'api', 'database', 'authentication', 'security',
      'performance', 'scalability', 'migration', 'refactor', 'architecture',
      'real-time', 'sync', 'async', 'queue', 'cache', 'optimization'
    ];
    
    complexityKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        score += 10;
      }
    });
    
    // Technical complexity indicators
    if (text.includes('multiple') || text.includes('various') || text.includes('different')) {
      score += 5;
    }
    
    if (text.includes('complex') || text.includes('advanced') || text.includes('sophisticated')) {
      score += 15;
    }
    
    return Math.min(Math.round(score), maxScore);
  }

  /**
   * Estimate effort in hours
   */
  private estimateEffort(complexityScore: number, type: ParsedRequirement['type']): number {
    let baseHours = complexityScore * 0.5; // Base: 0.5 hours per complexity point
    
    // Adjust based on type
    switch (type) {
      case 'technical':
        baseHours *= 1.5;
        break;
      case 'non_functional':
        baseHours *= 1.3;
        break;
      case 'business':
        baseHours *= 0.8;
        break;
      default:
        baseHours *= 1.0;
    }
    
    return Math.round(baseHours);
  }

  /**
   * Extract tags from text
   */
  private extractTags(title: string, description: string): string[] {
    const text = (title + ' ' + description).toLowerCase();
    const tags: string[] = [];
    
    const tagKeywords = {
      'frontend': ['ui', 'frontend', 'interface', 'user interface'],
      'backend': ['api', 'backend', 'server', 'database'],
      'security': ['security', 'authentication', 'authorization', 'encryption'],
      'performance': ['performance', 'optimization', 'speed', 'fast'],
      'integration': ['integration', 'third-party', 'external', 'webhook'],
      'mobile': ['mobile', 'ios', 'android', 'responsive'],
      'analytics': ['analytics', 'tracking', 'metrics', 'reporting']
    };
    
    Object.entries(tagKeywords).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        tags.push(tag);
      }
    });
    
    return tags;
  }

  /**
   * Extract acceptance criteria from description
   */
  private extractAcceptanceCriteria(description: string): string[] {
    const criteria: string[] = [];
    const lines = description.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('- [ ]') || 
          trimmedLine.includes('should') || 
          trimmedLine.includes('must') ||
          trimmedLine.includes('when') && trimmedLine.includes('then')) {
        criteria.push(trimmedLine.replace(/^- \[ \]\s*/, ''));
      }
    }
    
    return criteria;
  }

  /**
   * Analyze dependencies between requirements
   */
  private analyzeDependencies(requirements: ParsedRequirement[]): DependencyMap {
    const dependencies: DependencyMap = {};
    
    requirements.forEach((req, index) => {
      const reqId = `req_${index}`;
      dependencies[reqId] = [];
      
      // Simple dependency detection based on keywords
      const text = (req.title + ' ' + req.description).toLowerCase();
      
      requirements.forEach((otherReq, otherIndex) => {
        if (index !== otherIndex) {
          const otherText = (otherReq.title + ' ' + otherReq.description).toLowerCase();
          
          // Check if this requirement mentions the other
          if (text.includes(otherReq.title.toLowerCase()) ||
              this.hasCommonTechnicalTerms(text, otherText)) {
            dependencies[reqId].push(`req_${otherIndex}`);
          }
        }
      });
    });
    
    return dependencies;
  }

  /**
   * Check if two texts have common technical terms
   */
  private hasCommonTechnicalTerms(text1: string, text2: string): boolean {
    const technicalTerms = ['api', 'database', 'authentication', 'user', 'data', 'service'];
    
    const terms1 = technicalTerms.filter(term => text1.includes(term));
    const terms2 = technicalTerms.filter(term => text2.includes(term));
    
    return terms1.some(term => terms2.includes(term)) && terms1.length >= 2;
  }

  /**
   * Generate task hierarchy from requirements
   */
  private generateTaskHierarchy(
    requirements: ParsedRequirement[], 
    options: ParsingOptions
  ): TaskHierarchy {
    const root_tasks: ParsedTask[] = [];
    
    requirements.forEach(req => {
      const task = this.convertRequirementToTask(req, options);
      root_tasks.push(task);
    });
    
    return { root_tasks };
  }

  /**
   * Convert requirement to task
   */
  private convertRequirementToTask(
    requirement: ParsedRequirement, 
    options: ParsingOptions
  ): ParsedTask {
    const task: ParsedTask = {
      title: requirement.title,
      description: requirement.description,
      type: this.mapRequirementTypeToTaskType(requirement.type),
      priority: this.mapPriorityToNumber(requirement.priority),
      estimated_effort: requirement.estimated_effort,
      dependencies: requirement.dependencies,
      subtasks: [],
      acceptance_criteria: requirement.acceptance_criteria
    };
    
    if (options.generate_subtasks && requirement.complexity_score > 50) {
      task.subtasks = this.generateSubtasks(requirement);
    }
    
    return task;
  }

  /**
   * Map requirement type to task type
   */
  private mapRequirementTypeToTaskType(type: ParsedRequirement['type']): ParsedTask['type'] {
    switch (type) {
      case 'business':
        return 'epic';
      case 'functional':
        return 'feature';
      case 'technical':
        return 'task';
      case 'non_functional':
        return 'story';
      default:
        return 'task';
    }
  }

  /**
   * Map priority string to number
   */
  private mapPriorityToNumber(priority: ParsedRequirement['priority']): number {
    switch (priority) {
      case 'critical':
        return 10;
      case 'high':
        return 7;
      case 'medium':
        return 5;
      case 'low':
        return 2;
      default:
        return 5;
    }
  }

  /**
   * Generate subtasks for complex requirements
   */
  private generateSubtasks(requirement: ParsedRequirement): ParsedTask[] {
    const subtasks: ParsedTask[] = [];
    
    // Generate common subtasks based on requirement type
    if (requirement.type === 'technical') {
      subtasks.push(
        {
          title: `Design ${requirement.title}`,
          description: 'Create technical design and architecture',
          type: 'task',
          priority: 8,
          estimated_effort: Math.round(requirement.estimated_effort * 0.3),
          dependencies: [],
          subtasks: [],
          acceptance_criteria: ['Design document created', 'Architecture reviewed']
        },
        {
          title: `Implement ${requirement.title}`,
          description: 'Develop the core functionality',
          type: 'task',
          priority: 7,
          estimated_effort: Math.round(requirement.estimated_effort * 0.5),
          dependencies: [],
          subtasks: [],
          acceptance_criteria: ['Core functionality implemented', 'Unit tests written']
        },
        {
          title: `Test ${requirement.title}`,
          description: 'Test and validate the implementation',
          type: 'task',
          priority: 6,
          estimated_effort: Math.round(requirement.estimated_effort * 0.2),
          dependencies: [],
          subtasks: [],
          acceptance_criteria: ['All tests passing', 'Integration tests completed']
        }
      );
    }
    
    return subtasks;
  }

  /**
   * Store parsed requirements in database
   */
  async storeRequirements(
    breakdown: RequirementBreakdown,
    projectId?: string
  ): Promise<{ requirements: Requirement[]; tasks: Task[] }> {
    const storedRequirements: Requirement[] = [];
    const storedTasks: Task[] = [];
    
    // Store requirements
    for (const [index, parsedReq] of breakdown.requirements.entries()) {
      const requirementInput: CreateRequirementInput = {
        title: parsedReq.title,
        description: parsedReq.description,
        complexity_score: parsedReq.complexity_score,
        status: 'pending',
        dependencies: parsedReq.dependencies,
        metadata: {
          type: parsedReq.type,
          priority: parsedReq.priority,
          estimated_effort: parsedReq.estimated_effort,
          tags: parsedReq.tags,
          acceptance_criteria: parsedReq.acceptance_criteria,
          project_id: projectId
        }
      };
      
      const requirement = await this.requirementsModel.create(requirementInput);
      storedRequirements.push(requirement);
      
      // Store corresponding tasks
      const rootTask = breakdown.task_hierarchy.root_tasks[index];
      if (rootTask) {
        const task = await this.storeTaskHierarchy(rootTask, requirement.id);
        storedTasks.push(task);
      }
    }
    
    return { requirements: storedRequirements, tasks: storedTasks };
  }

  /**
   * Store task hierarchy recursively
   */
  private async storeTaskHierarchy(
    parsedTask: ParsedTask, 
    requirementId: string, 
    parentTaskId?: string
  ): Promise<Task> {
    const taskInput: CreateTaskInput = {
      requirement_id: requirementId,
      parent_task_id: parentTaskId,
      title: parsedTask.title,
      description: parsedTask.description,
      status: 'todo',
      priority: parsedTask.priority,
      metadata: {
        type: parsedTask.type,
        estimated_effort: parsedTask.estimated_effort,
        acceptance_criteria: parsedTask.acceptance_criteria,
        dependencies: parsedTask.dependencies
      }
    };
    
    const task = await this.tasksModel.create(taskInput);
    
    // Store subtasks
    for (const subtask of parsedTask.subtasks) {
      await this.storeTaskHierarchy(subtask, requirementId, task.id);
    }
    
    return task;
  }
}

