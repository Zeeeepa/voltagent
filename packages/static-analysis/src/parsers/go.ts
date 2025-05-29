import type {
  FunctionDefinition,
  FunctionUsage,
  ImportExportMapping,
  SupportedLanguage,
  FunctionType,
  ASTFunctionNode,
} from "../types";
import { AbstractParser } from "./base";

/**
 * Parser for Go files
 * Note: This is a simplified implementation that uses regex patterns
 * For production use, consider using a proper Go AST parser
 */
export class GoParser extends AbstractParser {
  readonly language: SupportedLanguage = SupportedLanguage.GO;
  readonly supportedExtensions = [".go"];

  /**
   * Parse Go content into AST (simplified implementation)
   */
  async parseAST(content: string): Promise<ASTFunctionNode[]> {
    const functions: ASTFunctionNode[] = [];
    const lines = content.split("\\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const functionMatch = line.match(/^func\\s+(\\([^)]*\\)\\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(([^)]*)\\)/);
      
      if (functionMatch) {
        const [, receiver, name, params] = functionMatch;
        const paramList = params.split(",").map(p => p.trim()).filter(p => p);

        functions.push({
          type: "FuncDecl",
          name,
          start: { line: i + 1, column: 0 },
          end: { line: i + 1, column: line.length },
          params: paramList,
          isAsync: false, // Go doesn't have async/await
          isGenerator: false,
          parent: receiver ? {
            type: "Receiver",
            name: receiver.trim(),
          } : undefined,
        });
      }
    }

    return functions;
  }

  /**
   * Extract function definitions from Go content
   */
  async extractFunctionDefinitions(filePath: string, content: string): Promise<FunctionDefinition[]> {
    const functions: FunctionDefinition[] = [];
    const lines = content.split("\\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Match function definitions
      const functionMatch = line.match(/^func\\s+(\\([^)]*\\)\\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(([^)]*)\\)([^{]*)?\\s*{?/);
      
      if (functionMatch) {
        const [, receiver, name, params, returnType] = functionMatch;
        
        // Determine function type
        let functionType = FunctionType.PUBLIC_FUNCTION;
        if (name[0] === name[0].toLowerCase()) {
          functionType = FunctionType.PRIVATE_METHOD; // Go convention: lowercase = private
        }
        if (receiver) {
          functionType = FunctionType.CLASS_METHOD; // Method with receiver
        }

        // Extract receiver type for scope
        let scope: string | undefined;
        if (receiver) {
          const receiverMatch = receiver.match(/\\(\\s*\\w*\\s*\\*?([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\)/);
          if (receiverMatch) {
            scope = receiverMatch[1];
          }
        }

        // Get documentation (comments above function)
        let documentation: string | undefined;
        if (i > 0) {
          const prevLine = lines[i - 1].trim();
          if (prevLine.startsWith("//")) {
            documentation = prevLine.replace(/^\\/\\/\\s*/, "");
          }
        }

        functions.push({
          name,
          file: filePath,
          line: i + 1,
          column: 0,
          type: functionType,
          isExported: name[0] === name[0].toUpperCase(), // Go convention: uppercase = exported
          isDefaultExport: false,
          signature: `func ${receiver || ""}${name}(${params})${returnType || ""}`,
          documentation,
          scope,
        });
      }
    }

    return functions;
  }

  /**
   * Extract function usages from Go content
   */
  async extractFunctionUsages(filePath: string, content: string): Promise<FunctionUsage[]> {
    const usages: FunctionUsage[] = [];
    const lines = content.split("\\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Match function calls (simplified pattern)
      const callMatches = line.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(/g);
      
      for (const match of callMatches) {
        const functionName = match[1];
        const column = match.index || 0;

        // Skip Go keywords and built-ins
        if (this.isGoKeyword(functionName)) {
          continue;
        }

        usages.push({
          functionName,
          file: filePath,
          line: i + 1,
          column,
          context: this.getGoCallContext(lines, i),
        });
      }

      // Match method calls
      const methodMatches = line.matchAll(/\\.([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(/g);
      
      for (const match of methodMatches) {
        const methodName = match[1];
        const column = match.index || 0;

        usages.push({
          functionName: methodName,
          file: filePath,
          line: i + 1,
          column,
          context: this.getGoCallContext(lines, i),
        });
      }
    }

    return usages;
  }

  /**
   * Extract import/export mappings from Go content
   */
  async extractImportExportMappings(filePath: string, content: string): Promise<ImportExportMapping[]> {
    const mappings: ImportExportMapping[] = [];
    const lines = content.split("\\n");

    let inImportBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Single import statement
      const singleImportMatch = line.match(/^import\\s+"([^"]+)"/);
      if (singleImportMatch) {
        const packagePath = singleImportMatch[1];
        const packageName = packagePath.split("/").pop() || packagePath;
        
        mappings.push({
          source: filePath,
          target: packagePath,
          symbols: [packageName],
          isDefault: false,
          isNamespace: true,
        });
        continue;
      }

      // Import with alias
      const aliasImportMatch = line.match(/^import\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s+"([^"]+)"/);
      if (aliasImportMatch) {
        const alias = aliasImportMatch[1];
        const packagePath = aliasImportMatch[2];
        
        mappings.push({
          source: filePath,
          target: packagePath,
          symbols: [alias],
          isDefault: false,
          isNamespace: true,
        });
        continue;
      }

      // Import block start
      if (line === "import (") {
        inImportBlock = true;
        continue;
      }

      // Import block end
      if (inImportBlock && line === ")") {
        inImportBlock = false;
        continue;
      }

      // Import within block
      if (inImportBlock) {
        const blockImportMatch = line.match(/^\\s*(?:([a-zA-Z_][a-zA-Z0-9_]*)\\s+)?"([^"]+)"/);
        if (blockImportMatch) {
          const alias = blockImportMatch[1];
          const packagePath = blockImportMatch[2];
          const packageName = alias || packagePath.split("/").pop() || packagePath;
          
          mappings.push({
            source: filePath,
            target: packagePath,
            symbols: [packageName],
            isDefault: false,
            isNamespace: true,
          });
        }
      }
    }

    return mappings;
  }

  /**
   * Check if a name is a Go keyword or built-in
   */
  private isGoKeyword(name: string): boolean {
    const keywords = [
      "break", "case", "chan", "const", "continue", "default", "defer", "else", "fallthrough",
      "for", "func", "go", "goto", "if", "import", "interface", "map", "package", "range",
      "return", "select", "struct", "switch", "type", "var"
    ];

    const builtins = [
      "append", "cap", "close", "complex", "copy", "delete", "imag", "len", "make", "new",
      "panic", "print", "println", "real", "recover", "bool", "byte", "complex64", "complex128",
      "error", "float32", "float64", "int", "int8", "int16", "int32", "int64", "rune", "string",
      "uint", "uint8", "uint16", "uint32", "uint64", "uintptr", "true", "false", "iota", "nil"
    ];

    return keywords.includes(name) || builtins.includes(name);
  }

  /**
   * Get the context of a function call in Go
   */
  private getGoCallContext(lines: string[], lineIndex: number): string | undefined {
    // Look for function context
    for (let i = lineIndex - 1; i >= 0; i--) {
      const line = lines[i];
      const functionMatch = line.match(/^func\\s+(\\([^)]*\\)\\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (functionMatch) {
        const [, receiver, name] = functionMatch;
        if (receiver) {
          return `in method ${name}`;
        } else {
          return `in function ${name}`;
        }
      }

      // Look for struct/interface context
      const structMatch = line.match(/^type\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s+struct/);
      if (structMatch) {
        return `in struct ${structMatch[1]}`;
      }

      const interfaceMatch = line.match(/^type\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s+interface/);
      if (interfaceMatch) {
        return `in interface ${interfaceMatch[1]}`;
      }
    }

    return undefined;
  }
}

