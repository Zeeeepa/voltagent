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
 * Parser for Python files
 * Note: This is a simplified implementation that uses regex patterns
 * For production use, consider using a proper Python AST parser
 */
export class PythonParser extends AbstractParser {
  readonly language: SupportedLanguage = SupportedLanguage.PYTHON;
  readonly supportedExtensions = [".py"];

  /**
   * Parse Python content into AST (simplified implementation)
   */
  async parseAST(content: string): Promise<ASTFunctionNode[]> {
    const functions: ASTFunctionNode[] = [];
    const lines = content.split("\\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const functionMatch = line.match(/^(\\s*)(def|async\\s+def)\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(([^)]*)\\):/);
      
      if (functionMatch) {
        const [, indent, defType, name, params] = functionMatch;
        const isAsync = defType.includes("async");
        const paramList = params.split(",").map(p => p.trim()).filter(p => p);

        functions.push({
          type: "FunctionDef",
          name,
          start: { line: i + 1, column: indent.length },
          end: { line: i + 1, column: line.length },
          params: paramList,
          isAsync,
          isGenerator: false, // Python generators are detected differently
        });
      }
    }

    return functions;
  }

  /**
   * Extract function definitions from Python content
   */
  async extractFunctionDefinitions(filePath: string, content: string): Promise<FunctionDefinition[]> {
    const functions: FunctionDefinition[] = [];
    const lines = content.split("\\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Match function definitions
      const functionMatch = line.match(/^(\\s*)(def|async\\s+def)\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(([^)]*)\\):/);
      
      if (functionMatch) {
        const [, indent, defType, name, params] = functionMatch;
        const isAsync = defType.includes("async");
        const indentLevel = indent.length;
        
        // Determine function type based on context
        let functionType = FunctionType.PUBLIC_FUNCTION;
        if (name.startsWith("_") && !name.startsWith("__")) {
          functionType = FunctionType.PRIVATE_METHOD;
        } else if (indentLevel > 0) {
          functionType = FunctionType.CLASS_METHOD;
        }

        // Check if function is in a class
        let scope: string | undefined;
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j];
          const classMatch = prevLine.match(/^(\\s*)class\\s+([a-zA-Z_][a-zA-Z0-9_]*).*:/);
          if (classMatch) {
            const [, classIndent, className] = classMatch;
            if (classIndent.length < indentLevel) {
              scope = className;
              break;
            }
          }
        }

        // Get documentation (docstring)
        let documentation: string | undefined;
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine.startsWith('"""') || nextLine.startsWith("'''")) {
            documentation = nextLine.replace(/['"]{3}/g, "").trim();
          }
        }

        functions.push({
          name,
          file: filePath,
          line: i + 1,
          column: indent.length,
          type: functionType,
          isExported: !name.startsWith("_"), // Python convention
          isDefaultExport: false,
          signature: `${defType} ${name}(${params}):`,
          documentation,
          scope,
        });
      }
    }

    return functions;
  }

  /**
   * Extract function usages from Python content
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

        // Skip Python keywords and built-ins
        if (this.isPythonKeyword(functionName)) {
          continue;
        }

        usages.push({
          functionName,
          file: filePath,
          line: i + 1,
          column,
          context: this.getPythonCallContext(lines, i),
        });
      }
    }

    return usages;
  }

  /**
   * Extract import/export mappings from Python content
   */
  async extractImportExportMappings(filePath: string, content: string): Promise<ImportExportMapping[]> {
    const mappings: ImportExportMapping[] = [];
    const lines = content.split("\\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Match import statements
      const importMatch = line.match(/^import\\s+([a-zA-Z_][a-zA-Z0-9_.]*)/);
      if (importMatch) {
        const module = importMatch[1];
        mappings.push({
          source: filePath,
          target: module,
          symbols: [module.split(".").pop() || module],
          isDefault: false,
          isNamespace: true,
        });
        continue;
      }

      // Match from...import statements
      const fromImportMatch = line.match(/^from\\s+([a-zA-Z_][a-zA-Z0-9_.]*)\\s+import\\s+(.+)/);
      if (fromImportMatch) {
        const module = fromImportMatch[1];
        const imports = fromImportMatch[2];
        
        let symbols: string[] = [];
        let isNamespace = false;

        if (imports.trim() === "*") {
          symbols = ["*"];
          isNamespace = true;
        } else {
          symbols = imports.split(",").map(s => s.trim().split(" as ")[0]);
        }

        mappings.push({
          source: filePath,
          target: module,
          symbols,
          isDefault: false,
          isNamespace,
        });
      }
    }

    return mappings;
  }

  /**
   * Check if a name is a Python keyword or built-in
   */
  private isPythonKeyword(name: string): boolean {
    const keywords = [
      "and", "as", "assert", "break", "class", "continue", "def", "del", "elif", "else",
      "except", "exec", "finally", "for", "from", "global", "if", "import", "in", "is",
      "lambda", "not", "or", "pass", "print", "raise", "return", "try", "while", "with",
      "yield", "True", "False", "None", "async", "await", "nonlocal"
    ];

    const builtins = [
      "abs", "all", "any", "bin", "bool", "bytearray", "bytes", "callable", "chr", "classmethod",
      "compile", "complex", "delattr", "dict", "dir", "divmod", "enumerate", "eval", "exec",
      "filter", "float", "format", "frozenset", "getattr", "globals", "hasattr", "hash", "help",
      "hex", "id", "input", "int", "isinstance", "issubclass", "iter", "len", "list", "locals",
      "map", "max", "memoryview", "min", "next", "object", "oct", "open", "ord", "pow", "print",
      "property", "range", "repr", "reversed", "round", "set", "setattr", "slice", "sorted",
      "staticmethod", "str", "sum", "super", "tuple", "type", "vars", "zip"
    ];

    return keywords.includes(name) || builtins.includes(name);
  }

  /**
   * Get the context of a function call in Python
   */
  private getPythonCallContext(lines: string[], lineIndex: number): string | undefined {
    // Look for function or class context
    for (let i = lineIndex - 1; i >= 0; i--) {
      const line = lines[i];
      const functionMatch = line.match(/^(\\s*)(def|async\\s+def)\\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (functionMatch) {
        const [, indent, , name] = functionMatch;
        const currentIndent = lines[lineIndex].match(/^\\s*/)?.[0].length || 0;
        if (currentIndent > indent.length) {
          return `in function ${name}`;
        }
      }

      const classMatch = line.match(/^(\\s*)class\\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (classMatch) {
        const [, indent, name] = classMatch;
        const currentIndent = lines[lineIndex].match(/^\\s*/)?.[0].length || 0;
        if (currentIndent > indent.length) {
          return `in class ${name}`;
        }
      }
    }

    return undefined;
  }
}

