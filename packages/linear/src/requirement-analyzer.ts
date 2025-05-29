import { EventEmitter } from "events";
import type {
  RequirementAnalysis,
  RequirementItem,
  LinearConfig,
} from "./types";

/**
 * Requirement Analyzer for parsing and analyzing requirements documents
 */
export class RequirementAnalyzer extends EventEmitter {
  private config: LinearConfig;
  private complexityWeights = {
    authentication: 8,
    database: 6,
    api: 4,
    ui: 3,
    testing: 2,
    documentation: 1,
  };

  constructor(config: LinearConfig) {
    super();
    this.config = config;
  }

  /**
   * Parse requirements from text and generate analysis
   */
  async analyzeRequirements(requirementsText: string): Promise<RequirementAnalysis> {
    const lines = requirementsText.split('\n').filter(line => line.trim());
    
    const mainRequirements = this.extractMainRequirements(lines);
    const subRequirements = this.extractSubRequirements(lines, mainRequirements);
    
    const complexity = this.calculateComplexity(mainRequirements, subRequirements);
    const estimatedHours = this.estimateEffort(mainRequirements, subRequirements);
    const priority = this.determinePriority(mainRequirements);
    const labels = this.generateLabels(mainRequirements, subRequirements);

    const analysis: RequirementAnalysis = {
      mainRequirements,
      subRequirements,
      complexity,
      estimatedHours,
      priority,
      labels,
    };

    this.emit("requirements.analyzed", analysis);
    return analysis;
  }

  /**
   * Parse structured requirements from PRD format
   */
  async analyzePRD(prdContent: string): Promise<RequirementAnalysis> {
    const sections = this.parsePRDSections(prdContent);
    
    const mainRequirements = this.extractMainRequirementsFromPRD(sections);
    const subRequirements = this.extractSubRequirementsFromPRD(sections);
    
    const complexity = this.calculateComplexity(mainRequirements, subRequirements);
    const estimatedHours = this.estimateEffort(mainRequirements, subRequirements);
    const priority = this.determinePriorityFromPRD(sections);
    const labels = this.generateLabelsFromPRD(sections);

    const analysis: RequirementAnalysis = {
      mainRequirements,
      subRequirements,
      complexity,
      estimatedHours,
      priority,
      labels,
    };

    this.emit("prd.analyzed", analysis);
    return analysis;
  }

  /**
   * Break down high-level requirements into atomic tasks
   */
  breakdownRequirement(requirement: RequirementItem): RequirementItem[] {
    const tasks: RequirementItem[] = [];
    
    // Analyze requirement type and break it down accordingly
    const requirementType = this.identifyRequirementType(requirement.title);
    
    switch (requirementType) {
      case "authentication":
        tasks.push(...this.breakdownAuthenticationRequirement(requirement));
        break;
      case "api":
        tasks.push(...this.breakdownApiRequirement(requirement));
        break;
      case "ui":
        tasks.push(...this.breakdownUIRequirement(requirement));
        break;
      case "database":
        tasks.push(...this.breakdownDatabaseRequirement(requirement));
        break;
      default:
        tasks.push(...this.breakdownGenericRequirement(requirement));
        break;
    }

    this.emit("requirement.broken.down", {
      original: requirement,
      tasks,
    });

    return tasks;
  }

  /**
   * Generate acceptance criteria for a requirement
   */
  generateAcceptanceCriteria(requirement: RequirementItem): string[] {
    const criteria: string[] = [];
    const requirementType = this.identifyRequirementType(requirement.title);
    
    // Base criteria for all requirements
    criteria.push("Implementation is complete and functional");
    criteria.push("Code follows project coding standards");
    criteria.push("Unit tests are written and passing");
    criteria.push("Documentation is updated");

    // Type-specific criteria
    switch (requirementType) {
      case "authentication":
        criteria.push("Security best practices are followed");
        criteria.push("Authentication flows work correctly");
        criteria.push("Error handling is implemented");
        break;
      case "api":
        criteria.push("API endpoints return correct responses");
        criteria.push("Input validation is implemented");
        criteria.push("Error responses are properly formatted");
        criteria.push("API documentation is complete");
        break;
      case "ui":
        criteria.push("UI matches design specifications");
        criteria.push("Component is responsive");
        criteria.push("Accessibility requirements are met");
        criteria.push("User interactions work as expected");
        break;
      case "database":
        criteria.push("Database schema is properly designed");
        criteria.push("Migrations are created and tested");
        criteria.push("Data integrity constraints are in place");
        criteria.push("Performance is acceptable");
        break;
    }

    return criteria;
  }

  /**
   * Estimate effort for requirements
   */
  estimateRequirementEffort(requirement: RequirementItem): number {
    const baseHours = 4; // Minimum hours for any task
    const requirementType = this.identifyRequirementType(requirement.title);
    
    let multiplier = 1;
    
    switch (requirementType) {
      case "authentication":
        multiplier = 3;
        break;
      case "database":
        multiplier = 2.5;
        break;
      case "api":
        multiplier = 2;
        break;
      case "ui":
        multiplier = 1.5;
        break;
      case "testing":
        multiplier = 1;
        break;
      case "documentation":
        multiplier = 0.5;
        break;
    }

    // Adjust based on complexity indicators
    const complexityIndicators = [
      "integration",
      "complex",
      "advanced",
      "secure",
      "real-time",
      "performance",
    ];

    const hasComplexity = complexityIndicators.some(indicator =>
      requirement.title.toLowerCase().includes(indicator) ||
      requirement.description.toLowerCase().includes(indicator)
    );

    if (hasComplexity) {
      multiplier *= 1.5;
    }

    return Math.ceil(baseHours * multiplier);
  }

  /**
   * Analyze dependencies between requirements
   */
  analyzeDependencies(requirements: RequirementItem[]): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();
    
    for (const requirement of requirements) {
      const deps: string[] = [];
      
      // Look for explicit dependency keywords
      const dependencyKeywords = [
        "requires",
        "depends on",
        "needs",
        "after",
        "following",
        "based on",
      ];

      for (const keyword of dependencyKeywords) {
        if (requirement.description.toLowerCase().includes(keyword)) {
          // Try to find referenced requirements
          const referencedReqs = this.findReferencedRequirements(
            requirement.description,
            requirements
          );
          deps.push(...referencedReqs);
        }
      }

      // Analyze implicit dependencies based on requirement types
      const implicitDeps = this.findImplicitDependencies(requirement, requirements);
      deps.push(...implicitDeps);

      if (deps.length > 0) {
        dependencies.set(requirement.title, [...new Set(deps)]);
      }
    }

    return dependencies;
  }

  /**
   * Private helper methods
   */

  private extractMainRequirements(lines: string[]): RequirementItem[] {
    const mainRequirements: RequirementItem[] = [];
    
    for (const line of lines) {
      // Look for main requirement indicators
      if (this.isMainRequirement(line)) {
        const title = this.cleanRequirementTitle(line);
        const requirement: RequirementItem = {
          title,
          description: title,
          acceptanceCriteria: this.generateAcceptanceCriteria({ title } as RequirementItem),
          estimatedHours: this.estimateRequirementEffort({ title } as RequirementItem),
          dependencies: [],
          priority: "medium",
          labels: [],
        };
        
        mainRequirements.push(requirement);
      }
    }

    return mainRequirements;
  }

  private extractSubRequirements(
    lines: string[],
    mainRequirements: RequirementItem[]
  ): RequirementItem[] {
    const subRequirements: RequirementItem[] = [];
    
    for (const mainReq of mainRequirements) {
      const breakdown = this.breakdownRequirement(mainReq);
      subRequirements.push(...breakdown);
    }

    return subRequirements;
  }

  private isMainRequirement(line: string): boolean {
    const mainIndicators = [
      /^#+\s+/,           // Markdown headers
      /^\d+\.\s+/,        // Numbered lists
      /^-\s+[A-Z]/,       // Bullet points starting with capital
      /^Feature:/,        // Feature prefix
      /^Requirement:/,    // Requirement prefix
    ];

    return mainIndicators.some(pattern => pattern.test(line.trim()));
  }

  private cleanRequirementTitle(line: string): string {
    return line
      .replace(/^#+\s+/, '')
      .replace(/^\d+\.\s+/, '')
      .replace(/^-\s+/, '')
      .replace(/^Feature:\s*/i, '')
      .replace(/^Requirement:\s*/i, '')
      .trim();
  }

  private identifyRequirementType(title: string): string {
    const typeKeywords = {
      authentication: ["auth", "login", "signup", "password", "token", "session"],
      database: ["database", "db", "schema", "migration", "model", "table"],
      api: ["api", "endpoint", "rest", "graphql", "service", "request"],
      ui: ["ui", "component", "interface", "page", "form", "button"],
      testing: ["test", "testing", "spec", "unit", "integration"],
      documentation: ["doc", "documentation", "readme", "guide"],
    };

    const lowerTitle = title.toLowerCase();
    
    for (const [type, keywords] of Object.entries(typeKeywords)) {
      if (keywords.some(keyword => lowerTitle.includes(keyword))) {
        return type;
      }
    }

    return "generic";
  }

  private breakdownAuthenticationRequirement(requirement: RequirementItem): RequirementItem[] {
    return [
      {
        title: "Implement user registration",
        description: "Create user registration functionality with validation",
        acceptanceCriteria: this.generateAcceptanceCriteria({} as RequirementItem),
        estimatedHours: 8,
        dependencies: [],
        priority: "high",
        labels: ["authentication", "backend"],
      },
      {
        title: "Implement user login",
        description: "Create user login functionality with session management",
        acceptanceCriteria: this.generateAcceptanceCriteria({} as RequirementItem),
        estimatedHours: 6,
        dependencies: ["Implement user registration"],
        priority: "high",
        labels: ["authentication", "backend"],
      },
      {
        title: "Implement password reset",
        description: "Create password reset functionality with email verification",
        acceptanceCriteria: this.generateAcceptanceCriteria({} as RequirementItem),
        estimatedHours: 4,
        dependencies: ["Implement user registration"],
        priority: "medium",
        labels: ["authentication", "backend"],
      },
    ];
  }

  private breakdownApiRequirement(requirement: RequirementItem): RequirementItem[] {
    return [
      {
        title: "Design API endpoints",
        description: "Design and document API endpoint specifications",
        acceptanceCriteria: this.generateAcceptanceCriteria({} as RequirementItem),
        estimatedHours: 4,
        dependencies: [],
        priority: "high",
        labels: ["api", "design"],
      },
      {
        title: "Implement API endpoints",
        description: "Implement the designed API endpoints",
        acceptanceCriteria: this.generateAcceptanceCriteria({} as RequirementItem),
        estimatedHours: 8,
        dependencies: ["Design API endpoints"],
        priority: "high",
        labels: ["api", "backend"],
      },
      {
        title: "Add API validation",
        description: "Add input validation and error handling",
        acceptanceCriteria: this.generateAcceptanceCriteria({} as RequirementItem),
        estimatedHours: 4,
        dependencies: ["Implement API endpoints"],
        priority: "medium",
        labels: ["api", "validation"],
      },
    ];
  }

  private breakdownUIRequirement(requirement: RequirementItem): RequirementItem[] {
    return [
      {
        title: "Create UI components",
        description: "Create reusable UI components",
        acceptanceCriteria: this.generateAcceptanceCriteria({} as RequirementItem),
        estimatedHours: 6,
        dependencies: [],
        priority: "medium",
        labels: ["ui", "frontend"],
      },
      {
        title: "Implement responsive design",
        description: "Make components responsive for different screen sizes",
        acceptanceCriteria: this.generateAcceptanceCriteria({} as RequirementItem),
        estimatedHours: 4,
        dependencies: ["Create UI components"],
        priority: "medium",
        labels: ["ui", "responsive"],
      },
    ];
  }

  private breakdownDatabaseRequirement(requirement: RequirementItem): RequirementItem[] {
    return [
      {
        title: "Design database schema",
        description: "Design database tables and relationships",
        acceptanceCriteria: this.generateAcceptanceCriteria({} as RequirementItem),
        estimatedHours: 4,
        dependencies: [],
        priority: "high",
        labels: ["database", "design"],
      },
      {
        title: "Create database migrations",
        description: "Create migration scripts for database setup",
        acceptanceCriteria: this.generateAcceptanceCriteria({} as RequirementItem),
        estimatedHours: 3,
        dependencies: ["Design database schema"],
        priority: "high",
        labels: ["database", "migration"],
      },
    ];
  }

  private breakdownGenericRequirement(requirement: RequirementItem): RequirementItem[] {
    return [
      {
        title: `Implement ${requirement.title}`,
        description: requirement.description,
        acceptanceCriteria: this.generateAcceptanceCriteria(requirement),
        estimatedHours: this.estimateRequirementEffort(requirement),
        dependencies: [],
        priority: requirement.priority,
        labels: ["implementation"],
      },
    ];
  }

  private calculateComplexity(
    mainRequirements: RequirementItem[],
    subRequirements: RequirementItem[]
  ): number {
    let complexity = 0;
    
    // Base complexity from number of requirements
    complexity += mainRequirements.length * 2;
    complexity += subRequirements.length;
    
    // Add complexity based on requirement types
    for (const req of [...mainRequirements, ...subRequirements]) {
      const type = this.identifyRequirementType(req.title);
      complexity += this.complexityWeights[type] || 2;
    }

    // Normalize to 1-10 scale
    return Math.min(10, Math.max(1, Math.ceil(complexity / 10)));
  }

  private estimateEffort(
    mainRequirements: RequirementItem[],
    subRequirements: RequirementItem[]
  ): number {
    let totalHours = 0;
    
    for (const req of [...mainRequirements, ...subRequirements]) {
      totalHours += this.estimateRequirementEffort(req);
    }

    return totalHours;
  }

  private determinePriority(requirements: RequirementItem[]): "low" | "medium" | "high" | "urgent" {
    const priorityKeywords = {
      urgent: ["critical", "urgent", "blocker", "security"],
      high: ["important", "core", "essential", "authentication"],
      medium: ["feature", "enhancement", "improvement"],
      low: ["nice-to-have", "optional", "documentation"],
    };

    for (const req of requirements) {
      const text = `${req.title} ${req.description}`.toLowerCase();
      
      for (const [priority, keywords] of Object.entries(priorityKeywords)) {
        if (keywords.some(keyword => text.includes(keyword))) {
          return priority as any;
        }
      }
    }

    return "medium";
  }

  private generateLabels(
    mainRequirements: RequirementItem[],
    subRequirements: RequirementItem[]
  ): string[] {
    const labels = new Set<string>();
    
    for (const req of [...mainRequirements, ...subRequirements]) {
      const type = this.identifyRequirementType(req.title);
      labels.add(type);
      
      // Add specific labels based on content
      const text = `${req.title} ${req.description}`.toLowerCase();
      
      if (text.includes("frontend") || text.includes("ui")) labels.add("frontend");
      if (text.includes("backend") || text.includes("api")) labels.add("backend");
      if (text.includes("test")) labels.add("testing");
      if (text.includes("doc")) labels.add("documentation");
    }

    return Array.from(labels);
  }

  private parsePRDSections(prdContent: string): Map<string, string> {
    const sections = new Map<string, string>();
    const lines = prdContent.split('\n');
    
    let currentSection = "";
    let currentContent = "";
    
    for (const line of lines) {
      if (line.match(/^#+\s+/)) {
        if (currentSection) {
          sections.set(currentSection, currentContent.trim());
        }
        currentSection = line.replace(/^#+\s+/, '').trim();
        currentContent = "";
      } else {
        currentContent += line + '\n';
      }
    }
    
    if (currentSection) {
      sections.set(currentSection, currentContent.trim());
    }
    
    return sections;
  }

  private extractMainRequirementsFromPRD(sections: Map<string, string>): RequirementItem[] {
    const requirements: RequirementItem[] = [];
    
    // Look for requirements in specific sections
    const requirementSections = [
      "Requirements",
      "Functional Requirements",
      "Features",
      "User Stories",
    ];

    for (const sectionName of requirementSections) {
      const content = sections.get(sectionName);
      if (content) {
        const lines = content.split('\n').filter(line => line.trim());
        requirements.push(...this.extractMainRequirements(lines));
      }
    }

    return requirements;
  }

  private extractSubRequirementsFromPRD(sections: Map<string, string>): RequirementItem[] {
    const subRequirements: RequirementItem[] = [];
    
    // Look for detailed requirements in technical sections
    const technicalSections = [
      "Technical Requirements",
      "Implementation Details",
      "Architecture",
      "API Specification",
    ];

    for (const sectionName of technicalSections) {
      const content = sections.get(sectionName);
      if (content) {
        const lines = content.split('\n').filter(line => line.trim());
        subRequirements.push(...this.extractMainRequirements(lines));
      }
    }

    return subRequirements;
  }

  private determinePriorityFromPRD(sections: Map<string, string>): "low" | "medium" | "high" | "urgent" {
    const prioritySection = sections.get("Priority") || sections.get("Timeline") || "";
    
    if (prioritySection.toLowerCase().includes("urgent") || 
        prioritySection.toLowerCase().includes("critical")) {
      return "urgent";
    }
    
    if (prioritySection.toLowerCase().includes("high") ||
        prioritySection.toLowerCase().includes("important")) {
      return "high";
    }
    
    return "medium";
  }

  private generateLabelsFromPRD(sections: Map<string, string>): string[] {
    const labels = new Set<string>();
    
    // Extract labels from section names and content
    for (const [sectionName, content] of sections) {
      const text = `${sectionName} ${content}`.toLowerCase();
      
      if (text.includes("frontend") || text.includes("ui")) labels.add("frontend");
      if (text.includes("backend") || text.includes("api")) labels.add("backend");
      if (text.includes("mobile")) labels.add("mobile");
      if (text.includes("web")) labels.add("web");
      if (text.includes("database")) labels.add("database");
      if (text.includes("security")) labels.add("security");
      if (text.includes("performance")) labels.add("performance");
    }

    return Array.from(labels);
  }

  private findReferencedRequirements(
    description: string,
    requirements: RequirementItem[]
  ): string[] {
    const referenced: string[] = [];
    
    for (const req of requirements) {
      // Simple keyword matching - could be improved with NLP
      if (description.toLowerCase().includes(req.title.toLowerCase())) {
        referenced.push(req.title);
      }
    }

    return referenced;
  }

  private findImplicitDependencies(
    requirement: RequirementItem,
    allRequirements: RequirementItem[]
  ): string[] {
    const dependencies: string[] = [];
    const reqType = this.identifyRequirementType(requirement.title);
    
    // Define implicit dependency rules
    const dependencyRules = {
      ui: ["api", "authentication"],
      api: ["database"],
      testing: ["implementation"],
    };

    const requiredTypes = dependencyRules[reqType] || [];
    
    for (const requiredType of requiredTypes) {
      const dependentReqs = allRequirements.filter(req =>
        this.identifyRequirementType(req.title) === requiredType
      );
      
      dependencies.push(...dependentReqs.map(req => req.title));
    }

    return dependencies;
  }
}

