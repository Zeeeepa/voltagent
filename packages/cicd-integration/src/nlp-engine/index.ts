import { NaturalLanguageRequirement, RequirementIntent, ExtractedEntity, EntityType, ComplexityLevel, EffortEstimate } from '../types';
import natural from 'natural';
import compromise from 'compromise';

export interface NLPEngineConfig {
  confidenceThreshold: number;
  maxTokens: number;
  enableEntityExtraction: boolean;
  enableIntentClassification: boolean;
  enableComplexityAnalysis: boolean;
}

export class NLPRequirementsEngine {
  private config: NLPEngineConfig;
  private intentClassifier: natural.LogisticRegressionClassifier;
  private entityExtractor: EntityExtractor;
  private complexityAnalyzer: ComplexityAnalyzer;

  constructor(config: Partial<NLPEngineConfig> = {}) {
    this.config = {
      confidenceThreshold: 0.7,
      maxTokens: 1000,
      enableEntityExtraction: true,
      enableIntentClassification: true,
      enableComplexityAnalysis: true,
      ...config
    };

    this.intentClassifier = new natural.LogisticRegressionClassifier();
    this.entityExtractor = new EntityExtractor();
    this.complexityAnalyzer = new ComplexityAnalyzer();
    
    this.initializeClassifier();
  }

  /**
   * Process natural language requirements and extract structured information
   */
  async processRequirement(text: string): Promise<NaturalLanguageRequirement> {
    const id = this.generateId();
    
    // Clean and tokenize the input
    const cleanedText = this.preprocessText(text);
    
    // Extract intent
    const intent = this.config.enableIntentClassification 
      ? await this.classifyIntent(cleanedText)
      : RequirementIntent.CREATE_FEATURE;
    
    // Extract entities
    const entities = this.config.enableEntityExtraction
      ? await this.extractEntities(cleanedText)
      : [];
    
    // Analyze complexity
    const complexity = this.config.enableComplexityAnalysis
      ? await this.analyzeComplexity(cleanedText, entities)
      : ComplexityLevel.MEDIUM;
    
    // Estimate effort
    const estimatedEffort = await this.estimateEffort(cleanedText, complexity, entities);
    
    // Calculate overall confidence
    const confidence = this.calculateConfidence(intent, entities, complexity);

    return {
      id,
      text: cleanedText,
      intent,
      entities,
      confidence,
      complexity,
      estimatedEffort
    };
  }

  /**
   * Batch process multiple requirements
   */
  async processRequirements(texts: string[]): Promise<NaturalLanguageRequirement[]> {
    return Promise.all(texts.map(text => this.processRequirement(text)));
  }

  /**
   * Validate and refine a requirement
   */
  async refineRequirement(requirement: NaturalLanguageRequirement, feedback: string): Promise<NaturalLanguageRequirement> {
    const refinedText = `${requirement.text}\n\nAdditional context: ${feedback}`;
    return this.processRequirement(refinedText);
  }

  private initializeClassifier(): void {
    // Training data for intent classification
    const trainingData = [
      { text: 'create a new component for user authentication', intent: RequirementIntent.CREATE_FEATURE },
      { text: 'add login functionality to the app', intent: RequirementIntent.CREATE_FEATURE },
      { text: 'build a dashboard for analytics', intent: RequirementIntent.CREATE_FEATURE },
      { text: 'implement user registration', intent: RequirementIntent.CREATE_FEATURE },
      
      { text: 'fix the login bug where users cannot sign in', intent: RequirementIntent.FIX_BUG },
      { text: 'resolve the issue with data not loading', intent: RequirementIntent.FIX_BUG },
      { text: 'fix broken navigation menu', intent: RequirementIntent.FIX_BUG },
      
      { text: 'refactor the user service to use dependency injection', intent: RequirementIntent.REFACTOR_CODE },
      { text: 'clean up the database connection code', intent: RequirementIntent.REFACTOR_CODE },
      { text: 'restructure the component hierarchy', intent: RequirementIntent.REFACTOR_CODE },
      
      { text: 'add unit tests for the authentication service', intent: RequirementIntent.ADD_TESTS },
      { text: 'write integration tests for the API', intent: RequirementIntent.ADD_TESTS },
      { text: 'create test coverage for user management', intent: RequirementIntent.ADD_TESTS },
      
      { text: 'update the API documentation', intent: RequirementIntent.UPDATE_DOCUMENTATION },
      { text: 'document the new authentication flow', intent: RequirementIntent.UPDATE_DOCUMENTATION },
      { text: 'add README for the project setup', intent: RequirementIntent.UPDATE_DOCUMENTATION },
      
      { text: 'optimize the database queries for better performance', intent: RequirementIntent.OPTIMIZE_PERFORMANCE },
      { text: 'improve loading speed of the dashboard', intent: RequirementIntent.OPTIMIZE_PERFORMANCE },
      { text: 'reduce memory usage in the data processing', intent: RequirementIntent.OPTIMIZE_PERFORMANCE },
      
      { text: 'integrate with Stripe payment system', intent: RequirementIntent.ADD_INTEGRATION },
      { text: 'connect to external analytics service', intent: RequirementIntent.ADD_INTEGRATION },
      { text: 'add OAuth integration with Google', intent: RequirementIntent.ADD_INTEGRATION }
    ];

    // Train the classifier
    trainingData.forEach(({ text, intent }) => {
      this.intentClassifier.addDocument(text, intent);
    });
    
    this.intentClassifier.train();
  }

  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  private async classifyIntent(text: string): Promise<RequirementIntent> {
    const classification = this.intentClassifier.classify(text);
    return classification as RequirementIntent;
  }

  private async extractEntities(text: string): Promise<ExtractedEntity[]> {
    return this.entityExtractor.extract(text);
  }

  private async analyzeComplexity(text: string, entities: ExtractedEntity[]): Promise<ComplexityLevel> {
    return this.complexityAnalyzer.analyze(text, entities);
  }

  private async estimateEffort(text: string, complexity: ComplexityLevel, entities: ExtractedEntity[]): Promise<EffortEstimate> {
    const baseHours = {
      [ComplexityLevel.LOW]: 2,
      [ComplexityLevel.MEDIUM]: 8,
      [ComplexityLevel.HIGH]: 24,
      [ComplexityLevel.VERY_HIGH]: 72
    };

    const factors = [];
    let multiplier = 1;

    // Adjust based on entities
    const hasDatabase = entities.some(e => e.type === EntityType.DATABASE_TABLE);
    const hasAPI = entities.some(e => e.type === EntityType.API_ENDPOINT);
    const hasIntegration = entities.some(e => e.type === EntityType.FRAMEWORK);

    if (hasDatabase) {
      multiplier *= 1.3;
      factors.push('Database integration');
    }
    if (hasAPI) {
      multiplier *= 1.2;
      factors.push('API development');
    }
    if (hasIntegration) {
      multiplier *= 1.4;
      factors.push('External integration');
    }

    const hours = Math.round(baseHours[complexity] * multiplier);
    const confidence = 0.7; // Base confidence, could be improved with ML

    return {
      hours,
      confidence,
      factors
    };
  }

  private calculateConfidence(intent: RequirementIntent, entities: ExtractedEntity[], complexity: ComplexityLevel): number {
    const intentConfidence = 0.8; // From classifier
    const entityConfidence = entities.length > 0 ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length : 0.5;
    const complexityConfidence = 0.7; // Base confidence for complexity analysis

    return (intentConfidence + entityConfidence + complexityConfidence) / 3;
  }

  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

class EntityExtractor {
  async extract(text: string): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];
    const doc = compromise(text);

    // Extract different types of entities
    this.extractComponents(doc, entities);
    this.extractTechnologies(doc, entities);
    this.extractFilePaths(doc, entities);
    this.extractAPIEndpoints(doc, entities);
    this.extractDatabaseTables(doc, entities);

    return entities;
  }

  private extractComponents(doc: any, entities: ExtractedEntity[]): void {
    const componentPatterns = [
      /component|widget|module|service|controller|view|page/gi,
      /button|form|modal|dialog|menu|navbar|sidebar/gi
    ];

    componentPatterns.forEach(pattern => {
      const matches = doc.text().match(pattern);
      if (matches) {
        matches.forEach((match: string, index: number) => {
          entities.push({
            type: EntityType.COMPONENT,
            value: match,
            confidence: 0.8,
            position: [index, index + match.length]
          });
        });
      }
    });
  }

  private extractTechnologies(doc: any, entities: ExtractedEntity[]): void {
    const techKeywords = [
      'react', 'vue', 'angular', 'node', 'express', 'fastify',
      'typescript', 'javascript', 'python', 'java', 'go',
      'postgresql', 'mysql', 'mongodb', 'redis',
      'docker', 'kubernetes', 'aws', 'azure', 'gcp'
    ];

    techKeywords.forEach(tech => {
      if (doc.text().toLowerCase().includes(tech)) {
        entities.push({
          type: EntityType.TECHNOLOGY,
          value: tech,
          confidence: 0.9,
          position: [0, 0] // Simplified positioning
        });
      }
    });
  }

  private extractFilePaths(doc: any, entities: ExtractedEntity[]): void {
    const filePathPattern = /[\w\/\-\.]+\.(js|ts|jsx|tsx|py|java|go|sql|json|yaml|yml)/gi;
    const matches = doc.text().match(filePathPattern);
    
    if (matches) {
      matches.forEach((match: string, index: number) => {
        entities.push({
          type: EntityType.FILE_PATH,
          value: match,
          confidence: 0.95,
          position: [index, index + match.length]
        });
      });
    }
  }

  private extractAPIEndpoints(doc: any, entities: ExtractedEntity[]): void {
    const apiPattern = /\/api\/[\w\/\-]+|\/[\w\-]+\/[\w\-]+/gi;
    const matches = doc.text().match(apiPattern);
    
    if (matches) {
      matches.forEach((match: string, index: number) => {
        entities.push({
          type: EntityType.API_ENDPOINT,
          value: match,
          confidence: 0.85,
          position: [index, index + match.length]
        });
      });
    }
  }

  private extractDatabaseTables(doc: any, entities: ExtractedEntity[]): void {
    const tableKeywords = ['table', 'collection', 'model', 'entity'];
    const text = doc.text().toLowerCase();
    
    tableKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        entities.push({
          type: EntityType.DATABASE_TABLE,
          value: keyword,
          confidence: 0.7,
          position: [0, 0] // Simplified positioning
        });
      }
    });
  }
}

class ComplexityAnalyzer {
  async analyze(text: string, entities: ExtractedEntity[]): Promise<ComplexityLevel> {
    let score = 0;

    // Base complexity from text length
    const wordCount = text.split(' ').length;
    if (wordCount > 100) score += 3;
    else if (wordCount > 50) score += 2;
    else if (wordCount > 20) score += 1;

    // Complexity from entities
    const entityTypes = new Set(entities.map(e => e.type));
    score += entityTypes.size;

    // Specific complexity indicators
    const complexityKeywords = [
      'integration', 'authentication', 'authorization', 'security',
      'performance', 'optimization', 'scalability', 'migration',
      'refactor', 'architecture', 'microservice', 'distributed'
    ];

    const lowerText = text.toLowerCase();
    complexityKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) score += 2;
    });

    // Map score to complexity level
    if (score >= 10) return ComplexityLevel.VERY_HIGH;
    if (score >= 7) return ComplexityLevel.HIGH;
    if (score >= 4) return ComplexityLevel.MEDIUM;
    return ComplexityLevel.LOW;
  }
}

export { EntityExtractor, ComplexityAnalyzer };

