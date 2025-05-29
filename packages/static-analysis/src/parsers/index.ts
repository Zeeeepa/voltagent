import type { BaseParser } from "./base";
import type { SupportedLanguage } from "../types";
import { TypeScriptParser } from "./typescript";
import { PythonParser } from "./python";
import { GoParser } from "./go";

export { BaseParser, AbstractParser } from "./base";
export { TypeScriptParser } from "./typescript";
export { PythonParser } from "./python";
export { GoParser } from "./go";

/**
 * Factory for creating language-specific parsers
 */
export class ParserFactory {
  private static parsers: BaseParser[] = [
    new TypeScriptParser(),
    new PythonParser(),
    new GoParser(),
  ];

  /**
   * Get parser for a specific language
   */
  static getParser(language: SupportedLanguage): BaseParser | null {
    return this.parsers.find(parser => parser.language === language) || null;
  }

  /**
   * Get parser for a specific file based on extension
   */
  static getParserForFile(filePath: string): BaseParser | null {
    return this.parsers.find(parser => parser.canParse(filePath)) || null;
  }

  /**
   * Get all available parsers
   */
  static getAllParsers(): BaseParser[] {
    return [...this.parsers];
  }

  /**
   * Get all supported languages
   */
  static getSupportedLanguages(): SupportedLanguage[] {
    return this.parsers.map(parser => parser.language);
  }

  /**
   * Get all supported file extensions
   */
  static getSupportedExtensions(): string[] {
    return this.parsers.flatMap(parser => parser.supportedExtensions);
  }

  /**
   * Check if a file is supported for analysis
   */
  static isFileSupported(filePath: string): boolean {
    return this.parsers.some(parser => parser.canParse(filePath));
  }

  /**
   * Register a new parser
   */
  static registerParser(parser: BaseParser): void {
    // Remove existing parser for the same language
    this.parsers = this.parsers.filter(p => p.language !== parser.language);
    this.parsers.push(parser);
  }
}

