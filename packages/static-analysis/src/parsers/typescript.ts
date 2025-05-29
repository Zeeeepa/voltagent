import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
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
 * Parser for TypeScript and JavaScript files
 */
export class TypeScriptParser extends AbstractParser {
  readonly language: SupportedLanguage = SupportedLanguage.TYPESCRIPT;
  readonly supportedExtensions = [".ts", ".tsx", ".js", ".jsx"];

  /**
   * Parse TypeScript/JavaScript content into AST
   */
  async parseAST(content: string): Promise<ASTFunctionNode[]> {
    try {
      const ast = parse(content, {
        sourceType: "module",
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: [
          "typescript",
          "jsx",
          "decorators-legacy",
          "classProperties",
          "objectRestSpread",
          "functionBind",
          "exportDefaultFrom",
          "exportNamespaceFrom",
          "dynamicImport",
          "nullishCoalescingOperator",
          "optionalChaining",
        ],
      });

      const functions: ASTFunctionNode[] = [];

      traverse(ast, {
        Function(path) {
          const node = path.node;
          const name = this.extractFunctionName(node);
          
          if (name) {
            functions.push({
              type: node.type,
              name,
              start: {
                line: node.loc?.start.line || 0,
                column: node.loc?.start.column || 0,
              },
              end: {
                line: node.loc?.end.line || 0,
                column: node.loc?.end.column || 0,
              },
              params: node.params.map((param: any) => {
                if (t.isIdentifier(param)) return param.name;
                if (t.isPattern(param)) return "...pattern";
                return "unknown";
              }),
              isAsync: node.async || false,
              isGenerator: node.generator || false,
              parent: path.parent ? {
                type: path.parent.type,
                name: this.extractFunctionName(path.parent),
              } : undefined,
            });
          }
        },
      });

      return functions;
    } catch (error) {
      console.warn(`Failed to parse TypeScript/JavaScript content: ${error}`);
      return [];
    }
  }

  /**
   * Extract function definitions from TypeScript/JavaScript content
   */
  async extractFunctionDefinitions(filePath: string, content: string): Promise<FunctionDefinition[]> {
    try {
      const ast = parse(content, {
        sourceType: "module",
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: [
          "typescript",
          "jsx",
          "decorators-legacy",
          "classProperties",
          "objectRestSpread",
          "functionBind",
          "exportDefaultFrom",
          "exportNamespaceFrom",
          "dynamicImport",
          "nullishCoalescingOperator",
          "optionalChaining",
        ],
      });

      const functions: FunctionDefinition[] = [];

      traverse(ast, {
        FunctionDeclaration(path) {
          const node = path.node;
          const name = node.id?.name;
          
          if (name) {
            functions.push({
              name,
              file: filePath,
              line: node.loc?.start.line || 0,
              column: node.loc?.start.column || 0,
              type: FunctionType.PUBLIC_FUNCTION,
              isExported: this.isExported(node, path.parent),
              isDefaultExport: path.parent?.type === "ExportDefaultDeclaration",
              signature: this.getFunctionSignature(node),
              documentation: this.getLeadingComments(node),
              scope: this.getScope(node, path.getAncestry()),
            });
          }
        },

        ArrowFunctionExpression(path) {
          const parent = path.parent;
          let name: string | null = null;

          if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
            name = parent.id.name;
          } else if (t.isAssignmentExpression(parent) && t.isIdentifier(parent.left)) {
            name = parent.left.name;
          } else if (t.isProperty(parent) && t.isIdentifier(parent.key)) {
            name = parent.key.name;
          }

          if (name) {
            functions.push({
              name,
              file: filePath,
              line: path.node.loc?.start.line || 0,
              column: path.node.loc?.start.column || 0,
              type: FunctionType.ARROW_FUNCTION,
              isExported: this.isExported(path.node, path.parent),
              isDefaultExport: false,
              signature: this.getArrowFunctionSignature(path.node),
              scope: this.getScope(path.node, path.getAncestry()),
            });
          }
        },

        MethodDefinition(path) {
          const node = path.node;
          const name = this.extractFunctionName(node);

          if (name) {
            functions.push({
              name,
              file: filePath,
              line: node.loc?.start.line || 0,
              column: node.loc?.start.column || 0,
              type: node.static ? FunctionType.PUBLIC_FUNCTION : FunctionType.CLASS_METHOD,
              isExported: false, // Methods are not directly exported
              isDefaultExport: false,
              signature: this.getMethodSignature(node),
              documentation: this.getLeadingComments(node),
              scope: this.getScope(node, path.getAncestry()),
            });
          }
        },

        FunctionExpression(path) {
          const node = path.node;
          const name = node.id?.name;

          if (name) {
            functions.push({
              name,
              file: filePath,
              line: node.loc?.start.line || 0,
              column: node.loc?.start.column || 0,
              type: FunctionType.ANONYMOUS_FUNCTION,
              isExported: this.isExported(node, path.parent),
              isDefaultExport: false,
              signature: this.getFunctionSignature(node),
              scope: this.getScope(node, path.getAncestry()),
            });
          }
        },
      });

      return functions;
    } catch (error) {
      console.warn(`Failed to extract function definitions from ${filePath}: ${error}`);
      return [];
    }
  }

  /**
   * Extract function usages from TypeScript/JavaScript content
   */
  async extractFunctionUsages(filePath: string, content: string): Promise<FunctionUsage[]> {
    try {
      const ast = parse(content, {
        sourceType: "module",
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: [
          "typescript",
          "jsx",
          "decorators-legacy",
          "classProperties",
          "objectRestSpread",
          "functionBind",
          "exportDefaultFrom",
          "exportNamespaceFrom",
          "dynamicImport",
          "nullishCoalescingOperator",
          "optionalChaining",
        ],
      });

      const usages: FunctionUsage[] = [];

      traverse(ast, {
        CallExpression(path) {
          const node = path.node;
          let functionName: string | null = null;

          if (t.isIdentifier(node.callee)) {
            functionName = node.callee.name;
          } else if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property)) {
            functionName = node.callee.property.name;
          }

          if (functionName) {
            usages.push({
              functionName,
              file: filePath,
              line: node.loc?.start.line || 0,
              column: node.loc?.start.column || 0,
              context: this.getCallContext(path),
            });
          }
        },
      });

      return usages;
    } catch (error) {
      console.warn(`Failed to extract function usages from ${filePath}: ${error}`);
      return [];
    }
  }

  /**
   * Extract import/export mappings from TypeScript/JavaScript content
   */
  async extractImportExportMappings(filePath: string, content: string): Promise<ImportExportMapping[]> {
    try {
      const ast = parse(content, {
        sourceType: "module",
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: [
          "typescript",
          "jsx",
          "decorators-legacy",
          "classProperties",
          "objectRestSpread",
          "functionBind",
          "exportDefaultFrom",
          "exportNamespaceFrom",
          "dynamicImport",
          "nullishCoalescingOperator",
          "optionalChaining",
        ],
      });

      const mappings: ImportExportMapping[] = [];

      traverse(ast, {
        ImportDeclaration(path) {
          const node = path.node;
          const source = node.source.value;
          const symbols: string[] = [];
          let isDefault = false;
          let isNamespace = false;

          node.specifiers.forEach((spec) => {
            if (t.isImportDefaultSpecifier(spec)) {
              symbols.push(spec.local.name);
              isDefault = true;
            } else if (t.isImportNamespaceSpecifier(spec)) {
              symbols.push(spec.local.name);
              isNamespace = true;
            } else if (t.isImportSpecifier(spec)) {
              symbols.push(spec.local.name);
            }
          });

          mappings.push({
            source: filePath,
            target: source,
            symbols,
            isDefault,
            isNamespace,
          });
        },

        ExportNamedDeclaration(path) {
          const node = path.node;
          const symbols: string[] = [];

          if (node.specifiers) {
            node.specifiers.forEach((spec) => {
              if (t.isExportSpecifier(spec) && t.isIdentifier(spec.exported)) {
                symbols.push(spec.exported.name);
              }
            });
          }

          if (node.declaration) {
            if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
              symbols.push(node.declaration.id.name);
            } else if (t.isVariableDeclaration(node.declaration)) {
              node.declaration.declarations.forEach((decl) => {
                if (t.isIdentifier(decl.id)) {
                  symbols.push(decl.id.name);
                }
              });
            }
          }

          if (symbols.length > 0) {
            mappings.push({
              source: filePath,
              target: node.source?.value || "",
              symbols,
              isDefault: false,
              isNamespace: false,
            });
          }
        },

        ExportDefaultDeclaration(path) {
          const node = path.node;
          let symbol = "default";

          if (t.isFunctionDeclaration(node.declaration) && node.declaration.id) {
            symbol = node.declaration.id.name;
          } else if (t.isIdentifier(node.declaration)) {
            symbol = node.declaration.name;
          }

          mappings.push({
            source: filePath,
            target: "",
            symbols: [symbol],
            isDefault: true,
            isNamespace: false,
          });
        },
      });

      return mappings;
    } catch (error) {
      console.warn(`Failed to extract import/export mappings from ${filePath}: ${error}`);
      return [];
    }
  }

  /**
   * Get function signature as string
   */
  private getFunctionSignature(node: t.FunctionDeclaration | t.FunctionExpression): string {
    const params = node.params.map((param) => {
      if (t.isIdentifier(param)) return param.name;
      if (t.isPattern(param)) return "...pattern";
      return "unknown";
    }).join(", ");

    const async = node.async ? "async " : "";
    const generator = node.generator ? "*" : "";
    
    return `${async}function${generator}(${params})`;
  }

  /**
   * Get arrow function signature as string
   */
  private getArrowFunctionSignature(node: t.ArrowFunctionExpression): string {
    const params = node.params.map((param) => {
      if (t.isIdentifier(param)) return param.name;
      if (t.isPattern(param)) return "...pattern";
      return "unknown";
    }).join(", ");

    const async = node.async ? "async " : "";
    
    return `${async}(${params}) => {...}`;
  }

  /**
   * Get method signature as string
   */
  private getMethodSignature(node: t.MethodDefinition): string {
    const params = node.value.params.map((param) => {
      if (t.isIdentifier(param)) return param.name;
      if (t.isPattern(param)) return "...pattern";
      return "unknown";
    }).join(", ");

    const static_ = node.static ? "static " : "";
    const async = node.value.async ? "async " : "";
    const generator = node.value.generator ? "*" : "";
    const kind = node.kind === "method" ? "" : `${node.kind} `;
    
    return `${static_}${kind}${async}${generator}(${params})`;
  }

  /**
   * Get leading comments for documentation
   */
  private getLeadingComments(node: any): string | undefined {
    if (node.leadingComments && node.leadingComments.length > 0) {
      return node.leadingComments
        .map((comment: any) => comment.value.trim())
        .join("\\n");
    }
    return undefined;
  }

  /**
   * Get the context of a function call
   */
  private getCallContext(path: any): string | undefined {
    const ancestors = path.getAncestry();
    
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const ancestor = ancestors[i];
      if (t.isFunction(ancestor.node)) {
        const name = this.extractFunctionName(ancestor.node);
        if (name) return `in function ${name}`;
      }
      if (t.isClassDeclaration(ancestor.node) && ancestor.node.id) {
        return `in class ${ancestor.node.id.name}`;
      }
    }
    
    return undefined;
  }
}

