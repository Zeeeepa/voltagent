import type { ImportStatement } from "../types";

/**
 * Parser for extracting import statements from source files
 */
export class ImportParser {
  /**
   * Parse imports from a file
   */
  async parseFile(filePath: string, content: string): Promise<ImportStatement[]> {
    const imports: ImportStatement[] = [];
    const lines = content.split("\n");
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Parse different types of import statements
      const parsedImports = this.parseImportsFromLine(line, lineNumber, filePath);
      imports.push(...parsedImports);
    }
    
    return imports;
  }

  /**
   * Parse imports from a single line
   */
  private parseImportsFromLine(line: string, lineNumber: number, filePath: string): ImportStatement[] {
    const imports: ImportStatement[] = [];
    const trimmedLine = line.trim();
    
    // Skip comments and empty lines
    if (trimmedLine.startsWith("//") || trimmedLine.startsWith("/*") || !trimmedLine) {
      return imports;
    }
    
    // ES6 import statements
    const es6ImportMatch = this.parseES6Import(trimmedLine);
    if (es6ImportMatch) {
      imports.push({
        file: filePath,
        line: lineNumber,
        column: line.indexOf("import"),
        raw: trimmedLine,
        module: es6ImportMatch.module,
        imports: es6ImportMatch.imports,
        isDefault: es6ImportMatch.isDefault,
        isNamespace: es6ImportMatch.isNamespace,
        isDynamic: false,
        isTypeOnly: es6ImportMatch.isTypeOnly,
      });
    }
    
    // Dynamic imports
    const dynamicImports = this.parseDynamicImports(trimmedLine);
    for (const dynamicImport of dynamicImports) {
      imports.push({
        file: filePath,
        line: lineNumber,
        column: line.indexOf("import("),
        raw: trimmedLine,
        module: dynamicImport,
        imports: [],
        isDefault: false,
        isNamespace: false,
        isDynamic: true,
        isTypeOnly: false,
      });
    }
    
    // CommonJS require statements
    const requireImports = this.parseRequireStatements(trimmedLine);
    for (const requireImport of requireImports) {
      imports.push({
        file: filePath,
        line: lineNumber,
        column: line.indexOf("require("),
        raw: trimmedLine,
        module: requireImport.module,
        imports: requireImport.imports,
        isDefault: true,
        isNamespace: false,
        isDynamic: false,
        isTypeOnly: false,
      });
    }
    
    return imports;
  }

  /**
   * Parse ES6 import statements
   */
  private parseES6Import(line: string): {
    module: string;
    imports: string[];
    isDefault: boolean;
    isNamespace: boolean;
    isTypeOnly: boolean;
  } | null {
    // Type-only imports
    const typeOnlyMatch = line.match(/^import\s+type\s+(.+?)\s+from\s+['"`]([^'"`]+)['"`]/);
    if (typeOnlyMatch) {
      const importClause = typeOnlyMatch[1];
      const module = typeOnlyMatch[2];
      const imports = this.parseImportClause(importClause);
      
      return {
        module,
        imports: imports.names,
        isDefault: imports.hasDefault,
        isNamespace: imports.hasNamespace,
        isTypeOnly: true,
      };
    }
    
    // Regular imports
    const importMatch = line.match(/^import\s+(.+?)\s+from\s+['"`]([^'"`]+)['"`]/);
    if (importMatch) {
      const importClause = importMatch[1];
      const module = importMatch[2];
      const imports = this.parseImportClause(importClause);
      
      return {
        module,
        imports: imports.names,
        isDefault: imports.hasDefault,
        isNamespace: imports.hasNamespace,
        isTypeOnly: false,
      };
    }
    
    // Side-effect imports
    const sideEffectMatch = line.match(/^import\s+['"`]([^'"`]+)['"`]/);
    if (sideEffectMatch) {
      return {
        module: sideEffectMatch[1],
        imports: [],
        isDefault: false,
        isNamespace: false,
        isTypeOnly: false,
      };
    }
    
    return null;
  }

  /**
   * Parse import clause (the part between import and from)
   */
  private parseImportClause(clause: string): {
    names: string[];
    hasDefault: boolean;
    hasNamespace: boolean;
  } {
    const names: string[] = [];
    let hasDefault = false;
    let hasNamespace = false;
    
    // Remove whitespace
    clause = clause.trim();
    
    // Handle namespace imports: * as name
    const namespaceMatch = clause.match(/\*\s+as\s+(\w+)/);
    if (namespaceMatch) {
      names.push(namespaceMatch[1]);
      hasNamespace = true;
      return { names, hasDefault, hasNamespace };
    }
    
    // Split by comma to handle mixed imports
    const parts = clause.split(",").map(p => p.trim());
    
    for (const part of parts) {
      // Named imports: { name1, name2 as alias }
      const namedMatch = part.match(/\{([^}]+)\}/);
      if (namedMatch) {
        const namedImports = namedMatch[1]
          .split(",")
          .map(n => n.trim())
          .map(n => {
            // Handle aliases: name as alias
            const aliasMatch = n.match(/(\w+)\s+as\s+(\w+)/);
            return aliasMatch ? aliasMatch[2] : n;
          });
        names.push(...namedImports);
      } else if (part && !part.includes("{") && !part.includes("}")) {
        // Default import
        names.push(part);
        hasDefault = true;
      }
    }
    
    return { names, hasDefault, hasNamespace };
  }

  /**
   * Parse dynamic import() statements
   */
  private parseDynamicImports(line: string): string[] {
    const imports: string[] = [];
    const dynamicImportRegex = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    
    let match;
    while ((match = dynamicImportRegex.exec(line)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  /**
   * Parse CommonJS require statements
   */
  private parseRequireStatements(line: string): Array<{
    module: string;
    imports: string[];
  }> {
    const imports: Array<{ module: string; imports: string[] }> = [];
    
    // const name = require('module')
    const simpleRequireMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
    if (simpleRequireMatch) {
      imports.push({
        module: simpleRequireMatch[2],
        imports: [simpleRequireMatch[1]],
      });
    }
    
    // const { name1, name2 } = require('module')
    const destructuredMatch = line.match(/(?:const|let|var)\s*\{\s*([^}]+)\s*\}\s*=\s*require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
    if (destructuredMatch) {
      const names = destructuredMatch[1]
        .split(",")
        .map(n => n.trim())
        .map(n => {
          // Handle aliases: name: alias
          const aliasMatch = n.match(/(\w+):\s*(\w+)/);
          return aliasMatch ? aliasMatch[2] : n;
        });
      
      imports.push({
        module: destructuredMatch[2],
        imports: names,
      });
    }
    
    // require('module') without assignment (side effects)
    const sideEffectMatch = line.match(/require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
    if (sideEffectMatch && !simpleRequireMatch && !destructuredMatch) {
      imports.push({
        module: sideEffectMatch[1],
        imports: [],
      });
    }
    
    return imports;
  }
}

