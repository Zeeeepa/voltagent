import { describe, it, expect } from "vitest";
import { TypeScriptParser } from "./typescript";
import { SupportedLanguage, FunctionType } from "../types";

describe("TypeScriptParser", () => {
  const parser = new TypeScriptParser();

  it("should have correct language and extensions", () => {
    expect(parser.language).toBe(SupportedLanguage.TYPESCRIPT);
    expect(parser.supportedExtensions).toContain(".ts");
    expect(parser.supportedExtensions).toContain(".tsx");
    expect(parser.supportedExtensions).toContain(".js");
    expect(parser.supportedExtensions).toContain(".jsx");
  });

  it("should parse function declarations", async () => {
    const content = `
      function testFunction(param1: string, param2: number): void {
        console.log(param1, param2);
      }
      
      export function exportedFunction() {
        return "test";
      }
    `;

    const functions = await parser.extractFunctionDefinitions("test.ts", content);

    expect(functions).toHaveLength(2);
    expect(functions[0].name).toBe("testFunction");
    expect(functions[0].type).toBe(FunctionType.PUBLIC_FUNCTION);
    expect(functions[0].isExported).toBe(false);
    
    expect(functions[1].name).toBe("exportedFunction");
    expect(functions[1].isExported).toBe(true);
  });

  it("should parse arrow functions", async () => {
    const content = `
      const arrowFunction = (x: number) => x * 2;
      const asyncArrow = async (data: any) => {
        return await processData(data);
      };
    `;

    const functions = await parser.extractFunctionDefinitions("test.ts", content);

    expect(functions).toHaveLength(2);
    expect(functions[0].name).toBe("arrowFunction");
    expect(functions[0].type).toBe(FunctionType.ARROW_FUNCTION);
    
    expect(functions[1].name).toBe("asyncArrow");
    expect(functions[1].type).toBe(FunctionType.ARROW_FUNCTION);
  });

  it("should parse class methods", async () => {
    const content = `
      class TestClass {
        public method1() {
          return "test";
        }
        
        private method2(param: string) {
          console.log(param);
        }
        
        static staticMethod() {
          return "static";
        }
      }
    `;

    const functions = await parser.extractFunctionDefinitions("test.ts", content);

    expect(functions).toHaveLength(3);
    expect(functions.every(f => f.type === FunctionType.CLASS_METHOD || f.type === FunctionType.PUBLIC_FUNCTION)).toBe(true);
    expect(functions.some(f => f.name === "method1")).toBe(true);
    expect(functions.some(f => f.name === "method2")).toBe(true);
    expect(functions.some(f => f.name === "staticMethod")).toBe(true);
  });

  it("should extract function usages", async () => {
    const content = `
      function caller() {
        testFunction("hello", 42);
        obj.methodCall();
        anotherFunction();
      }
    `;

    const usages = await parser.extractFunctionUsages("test.ts", content);

    expect(usages.length).toBeGreaterThan(0);
    expect(usages.some(u => u.functionName === "testFunction")).toBe(true);
    expect(usages.some(u => u.functionName === "methodCall")).toBe(true);
    expect(usages.some(u => u.functionName === "anotherFunction")).toBe(true);
  });

  it("should extract import/export mappings", async () => {
    const content = `
      import { namedImport } from "./module";
      import defaultImport from "./default";
      import * as namespace from "./namespace";
      
      export { namedExport };
      export default function defaultExport() {}
    `;

    const mappings = await parser.extractImportExportMappings("test.ts", content);

    expect(mappings.length).toBeGreaterThan(0);
    
    const namedImportMapping = mappings.find(m => m.symbols.includes("namedImport"));
    expect(namedImportMapping).toBeDefined();
    expect(namedImportMapping?.target).toBe("./module");
    
    const defaultImportMapping = mappings.find(m => m.symbols.includes("defaultImport"));
    expect(defaultImportMapping).toBeDefined();
    expect(defaultImportMapping?.isDefault).toBe(true);
    
    const namespaceMapping = mappings.find(m => m.isNamespace);
    expect(namespaceMapping).toBeDefined();
  });

  it("should handle malformed code gracefully", async () => {
    const malformedContent = `
      function incomplete(
      const broken = 
      class {
    `;

    const functions = await parser.extractFunctionDefinitions("test.ts", malformedContent);
    const usages = await parser.extractFunctionUsages("test.ts", malformedContent);
    const mappings = await parser.extractImportExportMappings("test.ts", malformedContent);

    // Should not throw and return empty arrays
    expect(Array.isArray(functions)).toBe(true);
    expect(Array.isArray(usages)).toBe(true);
    expect(Array.isArray(mappings)).toBe(true);
  });

  it("should identify file support correctly", () => {
    expect(parser.canParse("test.ts")).toBe(true);
    expect(parser.canParse("test.tsx")).toBe(true);
    expect(parser.canParse("test.js")).toBe(true);
    expect(parser.canParse("test.jsx")).toBe(true);
    expect(parser.canParse("test.py")).toBe(false);
    expect(parser.canParse("test.go")).toBe(false);
  });
});

