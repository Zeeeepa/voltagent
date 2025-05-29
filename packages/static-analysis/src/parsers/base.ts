import type {
  FunctionDefinition,
  FunctionUsage,
  ImportExportMapping,
  SupportedLanguage,
  ASTFunctionNode,
} from "../types";

/**
 * Base interface for language-specific parsers
 */
export interface BaseParser {
  /** Language this parser supports */
  readonly language: SupportedLanguage;

  /** File extensions this parser can handle */
  readonly supportedExtensions: string[];

  /**
   * Parse a file and extract function definitions
   * @param filePath - Path to the file
   * @param content - File content
   * @returns Array of function definitions
   */
  extractFunctionDefinitions(filePath: string, content: string): Promise<FunctionDefinition[]>;

  /**
   * Parse a file and extract function usages/calls
   * @param filePath - Path to the file
   * @param content - File content
   * @returns Array of function usages
   */
  extractFunctionUsages(filePath: string, content: string): Promise<FunctionUsage[]>;

  /**
   * Parse a file and extract import/export mappings
   * @param filePath - Path to the file
   * @param content - File content
   * @returns Array of import/export mappings
   */
  extractImportExportMappings(filePath: string, content: string): Promise<ImportExportMapping[]>;

  /**
   * Check if a file can be parsed by this parser
   * @param filePath - Path to the file
   * @returns True if the file can be parsed
   */
  canParse(filePath: string): boolean;

  /**
   * Parse file content into AST and extract function nodes
   * @param content - File content
   * @returns Array of AST function nodes
   */
  parseAST(content: string): Promise<ASTFunctionNode[]>;
}

/**
 * Abstract base class for parsers with common functionality
 */
export abstract class AbstractParser implements BaseParser {
  abstract readonly language: SupportedLanguage;
  abstract readonly supportedExtensions: string[];

  /**
   * Check if a file can be parsed by this parser based on extension
   */
  canParse(filePath: string): boolean {
    const extension = this.getFileExtension(filePath);
    return this.supportedExtensions.includes(extension);
  }

  /**
   * Get file extension from file path
   */
  protected getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf(".");
    return lastDot === -1 ? "" : filePath.substring(lastDot);
  }

  /**
   * Extract function name from various AST node types
   */
  protected extractFunctionName(node: any): string | null {
    if (node.id?.name) return node.id.name;
    if (node.key?.name) return node.key.name;
    if (node.name) return node.name;
    return null;
  }

  /**
   * Determine if a function is exported based on AST context
   */
  protected isExported(node: any, parent?: any): boolean {
    // Check if it's a direct export
    if (parent?.type === "ExportNamedDeclaration" || parent?.type === "ExportDefaultDeclaration") {
      return true;
    }

    // Check if it's part of an export statement
    if (node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration") {
      return true;
    }

    return false;
  }

  /**
   * Get the scope/context of a function (class name, namespace, etc.)
   */
  protected getScope(node: any, ancestors: any[]): string | undefined {
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const ancestor = ancestors[i];
      if (ancestor.type === "ClassDeclaration" && ancestor.id?.name) {
        return ancestor.id.name;
      }
      if (ancestor.type === "MethodDefinition" && ancestor.key?.name) {
        return ancestor.key.name;
      }
    }
    return undefined;
  }

  abstract extractFunctionDefinitions(filePath: string, content: string): Promise<FunctionDefinition[]>;
  abstract extractFunctionUsages(filePath: string, content: string): Promise<FunctionUsage[]>;
  abstract extractImportExportMappings(filePath: string, content: string): Promise<ImportExportMapping[]>;
  abstract parseAST(content: string): Promise<ASTFunctionNode[]>;
}

